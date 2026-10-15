// THE BIG BULL - Authoritative Real-Time Game Engine
import { Server as SocketIOServer } from "socket.io";
import { getStorage, StorageEngine } from "./storage";
import { GameStatus, LifelineType } from "../types";

export class GameEngine {
  private io: SocketIOServer | null = null;
  private storage: StorageEngine | null = null;
  private timerTimeout: NodeJS.Timeout | null = null;
  private tickInterval: NodeJS.Timeout | null = null;

  constructor() {}

  public async initialize(io: SocketIOServer) {
    this.io = io;
    this.storage = await getStorage();
    this.startHeartbeat();

    // Check if there is an active question on boot that needs timer restoration
    await this.restoreActiveQuestionTimer();
  }

  private startHeartbeat() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(async () => {
      try {
        if (!this.storage || !this.io) return;
        const game = await this.storage.getCurrentGame();
        if (game.status === "QUESTION_ACTIVE" && game.currentQuestion?.deadline) {
          const deadlineMs = new Date(game.currentQuestion.deadline).getTime();
          const remainingSeconds = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));

          this.io.emit("timer:sync", {
            serverTime: Date.now(),
            deadline: game.currentQuestion.deadline,
            remainingSeconds,
            isPaused: false,
          });

          // Server-side deadline check
          if (Date.now() >= deadlineMs) {
            await this.closeCurrentQuestion("DEADLINE_REACHED");
          }
        } else if (game.status === "QUESTION_PAUSED" && game.currentQuestion?.remainingOnPause) {
          this.io.emit("timer:sync", {
            serverTime: Date.now(),
            deadline: null,
            remainingSeconds: Math.ceil((game.currentQuestion.remainingOnPause || 0) / 1000),
            isPaused: true,
          });
        }
      } catch (e) {
        console.error("Timer heartbeat error:", e);
      }
    }, 1000);
  }

  private async restoreActiveQuestionTimer() {
    if (!this.storage) return;
    const game = await this.storage.getCurrentGame();
    if (game.status === "QUESTION_ACTIVE" && game.currentQuestion?.deadline) {
      const deadlineMs = new Date(game.currentQuestion.deadline).getTime();
      const delay = deadlineMs - Date.now();
      if (delay > 0) {
        console.log(`[Timer] Restoring active question deadline in ${Math.round(delay / 1000)}s`);
        this.scheduleAutoClose(delay);
      } else {
        console.log(`[Timer] Question deadline expired during restart. Closing question.`);
        await this.closeCurrentQuestion("RESTART_EXPIRED");
      }
    }
  }

  private scheduleAutoClose(delayMs: number) {
    if (this.timerTimeout) clearTimeout(this.timerTimeout);
    this.timerTimeout = setTimeout(async () => {
      await this.closeCurrentQuestion("DEADLINE_REACHED");
    }, Math.max(100, delayMs));
  }

  public async getActiveStorage(): Promise<StorageEngine> {
    if (!this.storage) {
      this.storage = await getStorage();
    }
    return this.storage;
  }

  // --- Game State Actions ---

  public async startGame() {
    const storage = await this.getActiveStorage();
    const game = await storage.getCurrentGame();
    if (game.status !== "LOBBY" && game.status !== "READY") {
      throw new Error(`Cannot start game from current status: ${game.status}`);
    }

    await this.openQuestionAtIndex(0);
    await storage.logAudit("GAME_STARTED", "ADMIN", { questionIndex: 0 });
    await this.broadcastAll();
  }

  public async openQuestionAtIndex(orderIndex: number, customDurationSeconds?: number) {
    const storage = await this.getActiveStorage();
    const game = await storage.getCurrentGame();
    const gq = await storage.getGameQuestionByOrder(game.id, orderIndex);
    if (!gq) {
      throw new Error(`Question at index ${orderIndex} not found`);
    }

    const durationSeconds = customDurationSeconds || gq.durationSeconds || game.defaultQuestionDuration || 120;
    const openedAt = new Date().toISOString();
    const deadline = new Date(Date.now() + durationSeconds * 1000).toISOString();

    await storage.updateGameQuestion(gq.id, {
      status: "ACTIVE",
      durationSeconds,
      openedAt,
      deadline,
      closedAt: null,
      remainingOnPause: null,
    });

    await storage.updateGameStatus("QUESTION_ACTIVE", orderIndex);
    this.scheduleAutoClose(durationSeconds * 1000);

    await storage.logAudit("QUESTION_OPENED", "ADMIN", {
      orderIndex,
      questionId: gq.questionId,
      durationSeconds,
    });

    await this.broadcastAll();
  }

  public async pauseGame() {
    const storage = await this.getActiveStorage();
    const game = await storage.getCurrentGame();
    if (game.status !== "QUESTION_ACTIVE" || !game.currentQuestion) {
      throw new Error("Cannot pause game unless a question is actively running");
    }

    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }

    const deadlineMs = game.currentQuestion.deadline
      ? new Date(game.currentQuestion.deadline).getTime()
      : Date.now();
    const remainingMs = Math.max(0, deadlineMs - Date.now());

    await storage.updateGameQuestion(game.currentQuestion.id, {
      status: "PAUSED",
      remainingOnPause: remainingMs,
    });

    await storage.updateGameStatus("QUESTION_PAUSED");
    await storage.logAudit("GAME_PAUSED", "ADMIN", { remainingSeconds: Math.round(remainingMs / 1000) });

    await this.broadcastAll();
  }

  public async resumeGame() {
    const storage = await this.getActiveStorage();
    const game = await storage.getCurrentGame();
    if (game.status !== "QUESTION_PAUSED" || !game.currentQuestion) {
      throw new Error("Cannot resume game unless question is paused");
    }

    const remainingMs = game.currentQuestion.remainingOnPause || 120000;
    const deadline = new Date(Date.now() + remainingMs).toISOString();

    await storage.updateGameQuestion(game.currentQuestion.id, {
      status: "ACTIVE",
      deadline,
      remainingOnPause: null,
    });

    await storage.updateGameStatus("QUESTION_ACTIVE");
    this.scheduleAutoClose(remainingMs);

    await storage.logAudit("GAME_RESUMED", "ADMIN", { deadline });
    await this.broadcastAll();
  }

  public async closeCurrentQuestion(reason: string = "ADMIN_CLOSED") {
    const storage = await this.getActiveStorage();
    const game = await storage.getCurrentGame();
    if (game.status !== "QUESTION_ACTIVE" && game.status !== "QUESTION_PAUSED") {
      return;
    }

    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }

    if (game.currentQuestion) {
      await storage.updateGameQuestion(game.currentQuestion.id, {
        status: "CLOSED",
        closedAt: new Date().toISOString(),
      });
    }

    await storage.updateGameStatus("QUESTION_CLOSED");
    await storage.logAudit("QUESTION_CLOSED", "SYSTEM", { reason });

    await this.broadcastAll();
  }

  public async revealAnswer() {
    const storage = await this.getActiveStorage();
    const game = await storage.getCurrentGame();
    if (!game.currentQuestion) {
      throw new Error("No question to reveal");
    }

    const result = await storage.revealAnswersAndScore(game.id, game.currentQuestion.id);
    await storage.updateGameStatus("ANSWER_REVEAL");

    await storage.logAudit("ANSWER_REVEALED", "ADMIN", {
      questionId: game.currentQuestion.questionId,
      correctOption: result.correctOption,
    });

    await this.broadcastAll();
    return result;
  }

  public async showLeaderboard() {
    const storage = await this.getActiveStorage();
    await storage.updateGameStatus("LEADERBOARD");
    await storage.logAudit("LEADERBOARD_DISPLAYED", "ADMIN");
    await this.broadcastAll();
  }

  public async nextQuestion() {
    const storage = await this.getActiveStorage();
    const game = await storage.getCurrentGame();
    const nextIdx = game.currentQuestionIndex + 1;

    if (nextIdx >= game.totalQuestions) {
      await this.endGame();
      return;
    }

    await this.openQuestionAtIndex(nextIdx);
  }

  public async endGame() {
    const storage = await this.getActiveStorage();
    if (this.timerTimeout) clearTimeout(this.timerTimeout);
    await storage.updateGameStatus("FINISHED");
    await storage.logAudit("GAME_FINISHED", "ADMIN");
    await this.broadcastAll();
  }

  public async resetGame(options?: any) {
    const storage = await this.getActiveStorage();
    if (this.timerTimeout) clearTimeout(this.timerTimeout);
    const game = await storage.createOrResetGame(options);
    await this.broadcastAll();
    return game;
  }

  // --- Broadcasts ---

  public async broadcastAll() {
    if (!this.storage || !this.io) return;

    const game = await this.storage.getCurrentGame();
    const leaderboard = await this.storage.getLeaderboard();
    const teams = await this.storage.getAllTeams();

    // 1. Broadcast Public Game State (to all, including Board)
    this.io.emit("game:state", game);
    this.io.emit("leaderboard:updated", leaderboard);

    // 2. Answer count to board and teams (NEVER leaking who picked what)
    if (game.currentQuestion) {
      const answers = await this.storage.getAnswersForQuestion(game.currentQuestion.id);
      this.io.emit("stats:answer_count", {
        answeredCount: answers.length,
        totalCount: teams.filter((t) => !t.isDisabled).length,
      });

      // To Admin: Full answers matrix
      this.io.to("admin_room").emit("admin:answers_matrix", {
        gameQuestionId: game.currentQuestion.id,
        answers,
      });
    }

    // 3. To Admin: Teams list, audit logs, suspicious activities
    this.io.to("admin_room").emit("admin:teams_list", teams);
    const auditLogs = await this.storage.getAuditLogs(50);
    this.io.to("admin_room").emit("admin:audit_logs", auditLogs);
    const suspicious = await this.storage.getSuspiciousActivities();
    this.io.to("admin_room").emit("admin:suspicious_list", suspicious);

    // 4. To Each Connected Team: Private state
    for (const team of teams) {
      await this.sendPrivateTeamUpdate(team.id);
    }
  }

  public async sendPrivateTeamUpdate(teamId: string) {
    if (!this.storage || !this.io) return;
    const team = await this.storage.getTeamById(teamId);
    if (!team) return;

    const game = await this.storage.getCurrentGame();
    let currentAnswer = null;
    let lifelines: any = {};
    let hasPassed = false;

    if (game.currentQuestion) {
      currentAnswer = await this.storage.getTeamAnswer(game.currentQuestion.id, teamId);
      lifelines = await this.storage.getLifelinesForTeam(game.currentQuestion.id, teamId);
      hasPassed = !!lifelines.BULLS_PASS?.purchased;
    }

    const suspicious = await this.storage.getSuspiciousActivities(teamId);
    const totalFlags = suspicious.reduce((acc, s) => acc + s.flagCount, 0);

    const privateState = {
      team,
      currentAnswer,
      lifelines,
      hasPassed,
      suspiciousFlagCount: totalFlags,
    };

    this.io.to(`team_${teamId}`).emit("team:private_state", privateState);
  }
}

// Global Singleton Game Engine
let gameEngineInstance: GameEngine | null = null;

export function getGameEngine(): GameEngine {
  if (!gameEngineInstance) {
    gameEngineInstance = new GameEngine();
  }
  return gameEngineInstance;
}
