// THE BIG BULL - Real-Time Authenticated Socket.IO Server
import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { getStorage } from "./storage";
import { getGameEngine } from "./gameEngine";
import { verifyAdminToken, verifyTeamToken } from "./auth";
import { LifelineType } from "../types";

// Track active sockets per team to reliably manage connection status
const teamSocketMap = new Map<string, Set<string>>();

export function setupSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  const gameEngine = getGameEngine();

  // Initialize game engine with this socket instance
  getStorage().then(() => {
    gameEngine.initialize(io);
  });

  io.on("connection", async (socket: Socket) => {
    const storage = await getStorage();
    const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as string;
    const clientType = socket.handshake.auth?.clientType || socket.handshake.query?.clientType;

    let authenticatedTeamId: string | null = null;
    let isAdmin = false;

    // 1. Authenticate Socket
    if (token) {
      const adminPayload = verifyAdminToken(token);
      if (adminPayload) {
        isAdmin = true;
        socket.join("admin_room");
      } else {
        const teamPayload = verifyTeamToken(token);
        if (teamPayload) {
          const team = await storage.getTeamById(teamPayload.teamId);
          if (team && !team.isDisabled) {
            authenticatedTeamId = team.id;
            socket.join(`team_${team.id}`);

            // Single active session enforcement if configured
            const game = await storage.getCurrentGame();
            if (game.oneActiveSessionPerTeam) {
              const existingSockets = teamSocketMap.get(team.id);
              if (existingSockets && existingSockets.size > 0) {
                // Invalidate existing sessions
                for (const oldSocketId of existingSockets) {
                  io.to(oldSocketId).emit("session:invalidated", {
                    reason: "Logged in from another device or tab.",
                  });
                }
              }
            }

            // Track team socket
            if (!teamSocketMap.has(team.id)) {
              teamSocketMap.set(team.id, new Set());
            }
            teamSocketMap.get(team.id)!.add(socket.id);

            await storage.setTeamConnectionStatus(team.id, "CONNECTED");
            await gameEngine.broadcastAll();
          }
        }
      }
    }

    if (clientType === "board") {
      socket.join("board_room");
    }

    // Send immediate initial state
    const currentGame = await storage.getCurrentGame();
    socket.emit("game:state", currentGame);
    const leaderboard = await storage.getLeaderboard();
    socket.emit("leaderboard:updated", leaderboard);

    if (authenticatedTeamId) {
      await gameEngine.sendPrivateTeamUpdate(authenticatedTeamId);
    }

    // --- Team Event Handlers ---

    socket.on("team:submit_answer", async (data: { selectedOption: string; timeTakenSeconds?: number }, callback) => {
      try {
        if (!authenticatedTeamId) {
          if (callback) callback({ success: false, error: "Unauthorized session" });
          return;
        }

        const game = await storage.getCurrentGame();
        if (!game.currentQuestion) {
          if (callback) callback({ success: false, error: "No active question" });
          return;
        }

        const result = await storage.submitAnswer(
          game.id,
          game.currentQuestion.id,
          authenticatedTeamId,
          data.selectedOption,
          data.timeTakenSeconds
        );

        if (result.success) {
          await gameEngine.broadcastAll();
        }

        if (callback) callback(result);
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on(
      "team:buy_lifeline",
      async (data: { lifelineType: LifelineType; idempotencyKey?: string }, callback) => {
        try {
          if (!authenticatedTeamId) {
            if (callback) callback({ success: false, error: "Unauthorized session" });
            return;
          }

          const game = await storage.getCurrentGame();
          if (!game.currentQuestion) {
            if (callback) callback({ success: false, error: "No active question" });
            return;
          }

          const idKey = data.idempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const result = await storage.purchaseLifeline(
            game.id,
            game.currentQuestion.id,
            authenticatedTeamId,
            data.lifelineType,
            idKey
          );

          if (result.success) {
            await gameEngine.broadcastAll();
          }

          if (callback) callback(result);
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    socket.on(
      "team:report_visibility",
      async (data: { state: "hidden" | "visible"; eventType: string; count?: number }) => {
        if (!authenticatedTeamId) return;
        try {
          const desc = `Visibility changed to ${data.state} (${data.eventType})`;
          await storage.recordSuspiciousActivity(authenticatedTeamId, data.eventType.toUpperCase(), desc, {
            metadata: JSON.stringify(data),
          });

          // Warn team in private room
          socket.emit("security:warning", {
            message: "⚠️ Attention: Leaving the competition screen or minimizing is flagged by invigilation.",
          });

          // Notify admin room
          const suspiciousList = await storage.getSuspiciousActivities();
          io.to("admin_room").emit("admin:suspicious_list", suspiciousList);
        } catch (e) {
          console.error("Visibility report error:", e);
        }
      }
    );

    const handleRecordStrike = async (data: { reason?: string; payload?: { reason?: string } }, callback?: any) => {
      if (!authenticatedTeamId) return;
      try {
        const strikeReason = data?.reason || data?.payload?.reason || "Minimized window or exited fullscreen lock";
        const strikeRes = await storage.recordTeamStrike(authenticatedTeamId, strikeReason);

        socket.emit("team:strike_update", {
          strikesCount: strikeRes.strikesCount,
          isDisqualified: strikeRes.isDisqualified,
          reason: strikeReason,
        });

        if (strikeRes.isDisqualified) {
          socket.emit("team:disqualified", {
            reason: "Maximum 3 security strikes reached. Competition terminal permanently terminated.",
          });
        }

        await gameEngine.broadcastAll();

        if (callback) callback(strikeRes);
      } catch (e) {
        console.error("Strike record error:", e);
      }
    };

    socket.on("team:record_strike", handleRecordStrike);
    socket.on("team:security_incident", handleRecordStrike);

    // --- Admin Event Handlers ---

    socket.on("admin:start_game", async (callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        await gameEngine.startGame();
        if (callback) callback({ success: true });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    socket.on("admin:pause_game", async (callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        await gameEngine.pauseGame();
        if (callback) callback({ success: true });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    socket.on("admin:resume_game", async (callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        await gameEngine.resumeGame();
        if (callback) callback({ success: true });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    socket.on("admin:close_question", async (callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        await gameEngine.closeCurrentQuestion("MANUAL_ADMIN_CLOSE");
        if (callback) callback({ success: true });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    socket.on("admin:reveal_answer", async (callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        const res = await gameEngine.revealAnswer();
        if (callback) callback({ success: true, data: res });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    socket.on("admin:show_leaderboard", async (callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        await gameEngine.showLeaderboard();
        if (callback) callback({ success: true });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    socket.on("admin:next_question", async (callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        await gameEngine.nextQuestion();
        if (callback) callback({ success: true });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    socket.on("admin:end_game", async (callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        await gameEngine.endGame();
        if (callback) callback({ success: true });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    socket.on("admin:reset_game", async (options: any, callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        await gameEngine.resetGame(options);
        if (callback) callback({ success: true });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    socket.on("admin:update_settings", async (settings: any, callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        await storage.updateGameSettings(settings);
        await gameEngine.broadcastAll();
        if (callback) callback({ success: true });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    socket.on("admin:toggle_incognito", async (options: any, callback) => {
      try {
        if (!isAdmin) throw new Error("Unauthorized admin command");
        const curGame = await storage.getCurrentGame();
        const newVal = options?.requireIncognito !== undefined ? !!options.requireIncognito : !curGame.requireIncognito;
        await storage.updateGameSettings({ requireIncognito: newVal });
        await storage.logAudit(
          newVal ? "INCOGNITO_ENFORCEMENT_ENABLED" : "INCOGNITO_ENFORCEMENT_DISABLED",
          "ADMIN",
          { requireIncognito: newVal }
        );
        await gameEngine.broadcastAll();
        if (callback) callback({ success: true, requireIncognito: newVal });
      } catch (e: any) {
        if (callback) callback({ success: false, error: e.message });
      }
    });

    // --- Disconnect Handler ---

    socket.on("disconnect", async () => {
      if (authenticatedTeamId) {
        const set = teamSocketMap.get(authenticatedTeamId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            teamSocketMap.delete(authenticatedTeamId);
            await storage.setTeamConnectionStatus(authenticatedTeamId, "DISCONNECTED");
            await gameEngine.broadcastAll();
          }
        }
      }
    });
  });

  return io;
}
