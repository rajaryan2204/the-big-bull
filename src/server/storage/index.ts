// THE BIG BULL - Authoritative Game Storage Layer
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { DEMO_TEAMS } from "../../data/demoTeams";
import { DEMO_QUESTIONS } from "../../data/demoQuestions";
import {
  GameStatus,
  LifelineType,
  TeamPublic,
  QuestionFull,
  QuestionPublic,
  GameQuestionState,
  GameState,
  TeamAnswerRecord,
  LifelineState,
  CoinTransactionRecord,
  AuditLogRecord,
  SuspiciousActivityRecord,
  LeaderboardEntry,
} from "../../types";

export interface StorageEngine {
  isDemoMode: boolean;
  initialize(): Promise<void>;

  // Admin
  getAdminByUsername(username: string): Promise<any | null>;
  createAdmin(username: string, passwordHash: string, name?: string): Promise<any>;

  // Teams
  getAllTeams(): Promise<TeamPublic[]>;
  getTeamById(id: string): Promise<TeamPublic | null>;
  getTeamByCode(teamCode: string): Promise<TeamPublic | null>;
  createTeam(teamCode: string, name: string, accessCode: string, startingBalance?: number): Promise<TeamPublic>;
  updateTeam(id: string, updates: Partial<{ name: string; isDisabled: boolean; isActive: boolean }>): Promise<TeamPublic>;
  deleteTeam(id: string): Promise<boolean>;
  resetTeamAccessCode(id: string, newAccessCode: string): Promise<void>;
  setTeamConnectionStatus(id: string, status: "CONNECTED" | "DISCONNECTED"): Promise<void>;
  authenticateTeam(teamCode: string, accessCode: string): Promise<{ success: boolean; team?: TeamPublic; error?: string }>;

  // Sessions
  createSession(teamId: string, token: string, deviceInfo?: string, ipAddress?: string, expiresAt?: Date): Promise<any>;
  validateSession(token: string): Promise<{ valid: boolean; teamId?: string; session?: any }>;
  invalidateOtherSessions(teamId: string, currentSessionToken: string): Promise<void>;
  invalidateSession(token: string): Promise<void>;

  // Questions
  getAllQuestions(): Promise<QuestionFull[]>;
  getQuestionById(id: string): Promise<QuestionFull | null>;
  createQuestion(data: Omit<QuestionFull, "id" | "createdAt" | "updatedAt">): Promise<QuestionFull>;
  updateQuestion(id: string, data: Partial<QuestionFull>): Promise<QuestionFull>;
  deleteQuestion(id: string): Promise<boolean>;
  importQuestionsFromCsv(records: any[]): Promise<number>;

  // Game
  getCurrentGame(): Promise<GameState>;
  createOrResetGame(options?: Partial<GameState>): Promise<GameState>;
  updateGameSettings(settings: Partial<GameState>): Promise<GameState>;
  getGameQuestions(gameId: string): Promise<GameQuestionState[]>;
  getGameQuestionByOrder(gameId: string, orderIndex: number): Promise<GameQuestionState | null>;
  getGameQuestionById(gameQuestionId: string): Promise<GameQuestionState | null>;
  updateGameQuestion(gameQuestionId: string, updates: Partial<GameQuestionState>): Promise<GameQuestionState>;
  updateGameStatus(status: GameStatus, currentQuestionIndex?: number): Promise<GameState>;

  // Answers & Scoring
  getAnswersForQuestion(gameQuestionId: string): Promise<TeamAnswerRecord[]>;
  getTeamAnswer(gameQuestionId: string, teamId: string): Promise<TeamAnswerRecord | null>;
  submitAnswer(
    gameId: string,
    gameQuestionId: string,
    teamId: string,
    selectedOption: string,
    timeTakenSeconds?: number
  ): Promise<{ success: boolean; answer?: TeamAnswerRecord; error?: string }>;
  revealAnswersAndScore(gameId: string, gameQuestionId: string): Promise<{
    correctOption: string;
    explanation?: string;
    answers: TeamAnswerRecord[];
    leaderboard: LeaderboardEntry[];
  }>;

  // Lifelines & Economy
  purchaseLifeline(
    gameId: string,
    gameQuestionId: string,
    teamId: string,
    lifelineType: LifelineType,
    idempotencyKey: string
  ): Promise<{ success: boolean; lifeline?: LifelineState; error?: string }>;
  getLifelinesForTeam(gameQuestionId: string, teamId: string): Promise<Record<LifelineType, LifelineState>>;
  adjustCoins(
    teamId: string,
    amount: number,
    transactionType: string,
    options?: { relatedQuestionId?: string; eventDetails?: string; idempotencyKey?: string }
  ): Promise<{ success: boolean; previousBalance: number; newBalance: number; error?: string }>;
  getCoinTransactions(teamId?: string): Promise<CoinTransactionRecord[]>;

  // Leaderboard
  getLeaderboard(): Promise<LeaderboardEntry[]>;

  // Audit & Anti-Cheating
  logAudit(
    action: string,
    actor: "ADMIN" | "TEAM" | "SYSTEM",
    details?: any,
    options?: { gameId?: string; teamId?: string; ipAddress?: string }
  ): Promise<void>;
  getAuditLogs(limit?: number): Promise<AuditLogRecord[]>;
  recordSuspiciousActivity(
    teamId: string,
    eventType: string,
    description: string,
    options?: { gameId?: string; metadata?: string }
  ): Promise<SuspiciousActivityRecord>;
  getSuspiciousActivities(teamId?: string): Promise<SuspiciousActivityRecord[]>;
  recordTeamStrike(
    teamId: string,
    reason: string
  ): Promise<{ strikesCount: number; isDisqualified: boolean }>;
  resetTeamStrikes(teamId: string): Promise<TeamPublic>;
}

// In-Memory & File-Backed Demo Store
export class DemoStore implements StorageEngine {
  public isDemoMode = true;

  private admins: Map<string, any> = new Map();
  private teams: Map<string, any> = new Map();
  private sessions: Map<string, any> = new Map();
  private questions: Map<string, QuestionFull> = new Map();
  private game: GameState | null = null;
  private gameQuestions: Map<string, any> = new Map();
  private answers: Map<string, TeamAnswerRecord> = new Map(); // key: `${gameQuestionId}_${teamId}`
  private lifelines: Map<string, any> = new Map(); // key: `${gameQuestionId}_${teamId}_${type}`
  private coinTransactions: CoinTransactionRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];
  private suspiciousActivities: SuspiciousActivityRecord[] = [];

  private storageFile = path.resolve(process.cwd(), ".data", "bigbull_state.json");

  public async initialize(): Promise<void> {
    this.ensureDataDir();
    const loaded = this.loadFromFile();
    if (!loaded) {
      await this.seedDefaults();
    }
  }

  private ensureDataDir() {
    const dir = path.dirname(this.storageFile);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        // Ignored in non-writeable env
      }
    }
  }

  private saveToFile() {
    try {
      const data = {
        admins: Array.from(this.admins.values()),
        teams: Array.from(this.teams.values()),
        questions: Array.from(this.questions.values()),
        game: this.game,
        gameQuestions: Array.from(this.gameQuestions.values()),
        answers: Array.from(this.answers.values()),
        lifelines: Array.from(this.lifelines.values()),
        coinTransactions: this.coinTransactions,
        auditLogs: this.auditLogs.slice(-200),
        suspiciousActivities: this.suspiciousActivities,
      };
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      // In-memory continues smoothly
    }
  }

  private loadFromFile(): boolean {
    try {
      if (!fs.existsSync(this.storageFile)) return false;
      const raw = fs.readFileSync(this.storageFile, "utf8");
      const data = JSON.parse(raw);
      if (!data || !data.teams || data.teams.length === 0) return false;

      data.admins?.forEach((a: any) => this.admins.set(a.username, a));
      data.teams?.forEach((t: any) => this.teams.set(t.id, t));
      data.questions?.forEach((q: any) => this.questions.set(q.id, q));
      this.game = data.game;
      data.gameQuestions?.forEach((gq: any) => this.gameQuestions.set(gq.id, gq));
      data.answers?.forEach((ans: any) => this.answers.set(`${ans.gameQuestionId || ans.questionId}_${ans.teamId}`, ans));
      data.lifelines?.forEach((l: any) => this.lifelines.set(`${l.gameQuestionId}_${l.teamId}_${l.lifelineType}`, l));
      this.coinTransactions = data.coinTransactions || [];
      this.auditLogs = data.auditLogs || [];
      this.suspiciousActivities = data.suspiciousActivities || [];
      return true;
    } catch (e) {
      return false;
    }
  }

  public async loadFromPostgres(prisma: any): Promise<boolean> {
    try {
      const dbTeams = await prisma.team.findMany();
      if (!dbTeams || dbTeams.length === 0) return false;

      const dbAdmins = await prisma.admin.findMany();
      dbAdmins.forEach((a: any) => this.admins.set(a.username, a));

      dbTeams.forEach((t: any) => {
        this.teams.set(t.id, {
          id: t.id,
          teamCode: t.teamCode,
          name: t.name,
          accessCodeHash: t.accessCodeHash,
          startingBalance: t.startingBalance,
          currentBalance: t.currentBalance,
          score: t.score,
          correctAnswers: t.correctAnswers,
          attemptedQuestions: t.attemptedQuestions,
          isActive: t.isActive,
          isDisabled: t.isDisabled,
          isDisqualified: !!t.isDisqualified,
          strikesCount: t.strikesCount || 0,
          connectionStatus: t.connectionStatus as any,
          lastSeenAt: t.lastSeenAt ? t.lastSeenAt.toISOString() : null,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        });
      });

      const dbQuestions = await prisma.question.findMany();
      dbQuestions.forEach((q: any) => {
        this.questions.set(q.id, {
          id: q.id,
          text: q.text,
          category: q.category,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          imageUrl: q.imageUrl || null,
          visualClueUrl: q.visualClueUrl || null,
          hintText: q.hintText || null,
          explanation: q.explanation || null,
          difficulty: q.difficulty as any,
          durationSeconds: q.durationSeconds,
          isActive: q.isActive,
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
        });
      });

      await this.createOrResetGame();
      this.isDemoMode = false;
      this.saveToFile();
      console.log(`🚀 [PostgreSQL] Synced ${dbTeams.length} teams & ${dbQuestions.length} questions from live Neon DB!`);
      return true;
    } catch (e: any) {
      console.warn("⚠️ [PostgreSQL] Failed to sync from Neon:", e.message);
      return false;
    }
  }

  public async seedDefaults(): Promise<void> {
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "bigbull2026";
    const adminHash = bcrypt.hashSync(adminPass, 10);
    this.admins.set(adminUser, {
      id: "admin-master-01",
      username: adminUser,
      passwordHash: adminHash,
      name: "Chief Administrator",
      createdAt: new Date().toISOString(),
    });

    // Seed Demo Teams
    for (const t of DEMO_TEAMS) {
      const hash = bcrypt.hashSync(t.accessCode, 10);
      const teamId = `team-${t.teamCode.toLowerCase()}`;
      const record = {
        id: teamId,
        teamCode: t.teamCode,
        name: t.name,
        accessCodeHash: hash,
        startingBalance: t.startingBalance,
        currentBalance: t.startingBalance,
        score: 0,
        correctAnswers: 0,
        attemptedQuestions: 0,
        isActive: true,
        isDisabled: false,
        isDisqualified: false,
        strikesCount: 0,
        connectionStatus: "DISCONNECTED",
        lastSeenAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.teams.set(teamId, record);
    }

    // Seed Demo Questions
    const now = new Date().toISOString();
    for (const q of DEMO_QUESTIONS) {
      const questionRecord: QuestionFull = {
        ...q,
        imageUrl: q.imageUrl || null,
        visualClueUrl: q.visualClueUrl || null,
        hintText: q.hintText || null,
        explanation: q.explanation || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      this.questions.set(q.id, questionRecord);
    }

    // Seed Demo Game
    await this.createOrResetGame();
    this.saveToFile();
  }

  // --- Admin ---
  public async getAdminByUsername(username: string): Promise<any | null> {
    return this.admins.get(username) || null;
  }

  public async createAdmin(username: string, passwordHash: string, name = "Administrator"): Promise<any> {
    const record = {
      id: `admin-${Date.now()}`,
      username,
      passwordHash,
      name,
      createdAt: new Date().toISOString(),
    };
    this.admins.set(username, record);
    this.saveToFile();
    return record;
  }

  // --- Teams ---
  public async getAllTeams(): Promise<TeamPublic[]> {
    return Array.from(this.teams.values()).map(this.toPublicTeam);
  }

  public async getTeamById(id: string): Promise<TeamPublic | null> {
    const t = this.teams.get(id);
    return t ? this.toPublicTeam(t) : null;
  }

  public async getTeamByCode(teamCode: string): Promise<TeamPublic | null> {
    const code = teamCode.trim().toUpperCase();
    for (const t of this.teams.values()) {
      if (t.teamCode.toUpperCase() === code) return this.toPublicTeam(t);
    }
    return null;
  }

  public async createTeam(
    teamCode: string,
    name: string,
    accessCode: string,
    startingBalance = 5000
  ): Promise<TeamPublic> {
    const code = teamCode.trim().toUpperCase();
    for (const t of this.teams.values()) {
      if (t.teamCode.toUpperCase() === code) {
        throw new Error(`Team code ${code} already exists`);
      }
    }
    const hash = bcrypt.hashSync(accessCode.trim(), 10);
    const id = `team-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const record = {
      id,
      teamCode: code,
      name: name.trim(),
      accessCodeHash: hash,
      startingBalance,
      currentBalance: startingBalance,
      score: 0,
      correctAnswers: 0,
      attemptedQuestions: 0,
      isActive: true,
      isDisabled: false,
      isDisqualified: false,
      strikesCount: 0,
      connectionStatus: "DISCONNECTED",
      lastSeenAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.teams.set(id, record);

    this.coinTransactions.push({
      id: `tx-init-${Date.now()}`,
      teamId: id,
      teamName: record.name,
      transactionType: "STARTING_BALANCE",
      amount: startingBalance,
      previousBalance: 0,
      newBalance: startingBalance,
      eventDetails: "Initial Team Registration Balance",
      createdAt: new Date().toISOString(),
    });

    this.saveToFile();
    return this.toPublicTeam(record);
  }

  public async updateTeam(
    id: string,
    updates: Partial<{ name: string; isDisabled: boolean; isActive: boolean }>
  ): Promise<TeamPublic> {
    const team = this.teams.get(id);
    if (!team) throw new Error("Team not found");
    if (updates.name !== undefined) team.name = updates.name.trim();
    if (updates.isDisabled !== undefined) team.isDisabled = updates.isDisabled;
    if (updates.isActive !== undefined) team.isActive = updates.isActive;
    team.updatedAt = new Date().toISOString();
    this.teams.set(id, team);
    this.saveToFile();
    return this.toPublicTeam(team);
  }

  public async deleteTeam(id: string): Promise<boolean> {
    const deleted = this.teams.delete(id);
    if (deleted) this.saveToFile();
    return deleted;
  }

  public async resetTeamAccessCode(id: string, newAccessCode: string): Promise<void> {
    const team = this.teams.get(id);
    if (!team) throw new Error("Team not found");
    team.accessCodeHash = bcrypt.hashSync(newAccessCode.trim(), 10);
    team.updatedAt = new Date().toISOString();
    this.teams.set(id, team);
    this.saveToFile();
  }

  public async setTeamConnectionStatus(id: string, status: "CONNECTED" | "DISCONNECTED"): Promise<void> {
    const team = this.teams.get(id);
    if (team) {
      team.connectionStatus = status;
      team.lastSeenAt = new Date().toISOString();
      this.teams.set(id, team);
    }
  }

  public async authenticateTeam(
    teamCode: string,
    accessCode: string
  ): Promise<{ success: boolean; team?: TeamPublic; error?: string }> {
    const normalizedCode = teamCode.trim().toUpperCase();
    let matched: any = null;
    for (const t of this.teams.values()) {
      if (t.teamCode.toUpperCase() === normalizedCode) {
        matched = t;
        break;
      }
    }

    if (!matched) {
      return { success: false, error: "Invalid team code or credentials." };
    }

    if (matched.isDisabled) {
      return { success: false, error: "This team has been disabled by the administrator." };
    }

    const matches = bcrypt.compareSync(accessCode.trim(), matched.accessCodeHash);
    if (!matches) {
      return { success: false, error: "Invalid access code." };
    }

    return { success: true, team: this.toPublicTeam(matched) };
  }

  // --- Sessions ---
  public async createSession(
    teamId: string,
    token: string,
    deviceInfo?: string,
    ipAddress?: string,
    expiresAt?: Date
  ): Promise<any> {
    const exp = expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      teamId,
      sessionToken: token,
      deviceInfo: deviceInfo || "Browser",
      ipAddress: ipAddress || "127.0.0.1",
      isActive: true,
      expiresAt: exp.toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(token, session);
    return session;
  }

  public async validateSession(token: string): Promise<{ valid: boolean; teamId?: string; session?: any }> {
    const session = this.sessions.get(token);
    if (!session || !session.isActive) return { valid: false };
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      session.isActive = false;
      return { valid: false };
    }
    const team = this.teams.get(session.teamId);
    if (!team || team.isDisabled) return { valid: false };
    return { valid: true, teamId: session.teamId, session };
  }

  public async invalidateOtherSessions(teamId: string, currentSessionToken: string): Promise<void> {
    for (const [t, s] of this.sessions.entries()) {
      if (s.teamId === teamId && t !== currentSessionToken) {
        s.isActive = false;
      }
    }
  }

  public async invalidateSession(token: string): Promise<void> {
    const session = this.sessions.get(token);
    if (session) session.isActive = false;
  }

  // --- Questions ---
  public async getAllQuestions(): Promise<QuestionFull[]> {
    return Array.from(this.questions.values());
  }

  public async getQuestionById(id: string): Promise<QuestionFull | null> {
    return this.questions.get(id) || null;
  }

  public async createQuestion(data: Omit<QuestionFull, "id" | "createdAt" | "updatedAt">): Promise<QuestionFull> {
    const id = `q-${Date.now()}`;
    const now = new Date().toISOString();
    const record: QuestionFull = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.questions.set(id, record);
    this.saveToFile();
    return record;
  }

  public async updateQuestion(id: string, data: Partial<QuestionFull>): Promise<QuestionFull> {
    const existing = this.questions.get(id);
    if (!existing) throw new Error("Question not found");
    const updated: QuestionFull = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.questions.set(id, updated);
    this.saveToFile();
    return updated;
  }

  public async deleteQuestion(id: string): Promise<boolean> {
    const res = this.questions.delete(id);
    this.saveToFile();
    return res;
  }

  public async importQuestionsFromCsv(records: any[]): Promise<number> {
    let count = 0;
    const now = new Date().toISOString();
    for (const r of records) {
      if (!r.text || !r.optionA || !r.optionB || !r.optionC || !r.optionD || !r.correctOption) continue;
      const id = r.id || `q-import-${Date.now()}-${count}`;
      const record: QuestionFull = {
        id,
        text: r.text,
        category: r.category || "General Knowledge",
        optionA: r.optionA,
        optionB: r.optionB,
        optionC: r.optionC,
        optionD: r.optionD,
        correctOption: (r.correctOption.toUpperCase() as any) || "A",
        imageUrl: r.imageUrl || null,
        visualClueUrl: r.visualClueUrl || null,
        hintText: r.hintText || null,
        explanation: r.explanation || null,
        difficulty: (r.difficulty?.toUpperCase() as any) || "MEDIUM",
        durationSeconds: Number(r.durationSeconds) || 300,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      this.questions.set(id, record);
      count++;
    }
    this.saveToFile();
    return count;
  }

  // --- Game ---
  public async getCurrentGame(): Promise<GameState> {
    if (!this.game) {
      await this.createOrResetGame();
    }
    return this.buildGameState();
  }

  public async createOrResetGame(options?: Partial<GameState>): Promise<GameState> {
    const gameId = `game-${Date.now()}`;
    const questionList = Array.from(this.questions.values()).filter((q) => q.isActive);

    this.gameQuestions.clear();
    this.answers.clear();
    this.lifelines.clear();

    // Reset team scores and stats back to starting balance
    for (const team of this.teams.values()) {
      team.currentBalance = team.startingBalance;
      team.score = 0;
      team.correctAnswers = 0;
      team.attemptedQuestions = 0;
      team.isDisqualified = false;
      team.isDisabled = false;
      team.strikesCount = 0;
      this.teams.set(team.id, team);
    }

    this.game = {
      id: gameId,
      title: options?.title || "THE BIG BULL Championship 2026",
      status: "LOBBY",
      currentQuestionIndex: 0,
      totalQuestions: questionList.length,
      correctReward: options?.correctReward ?? 1000,
      incorrectPenalty: options?.incorrectPenalty ?? 200,
      unansweredPenalty: options?.unansweredPenalty ?? 0,
      defaultQuestionDuration: options?.defaultQuestionDuration ?? 300,
      oneActiveSessionPerTeam: options?.oneActiveSessionPerTeam ?? true,
      examMode: options?.examMode ?? false,
      requireIncognito: options?.requireIncognito ?? true,
      allowAnswerChange: options?.allowAnswerChange ?? false,
      allowRepeatLifelines: options?.allowRepeatLifelines ?? false,
      publicLeaderboardColumns: options?.publicLeaderboardColumns || "rank,name,score,coins,correct",
      totalAnswersReceived: 0,
      totalTeamsCount: this.teams.size,
      connectedTeamsCount: 0,
      isDemoMode: this.isDemoMode,
    };

    // Attach questions in order
    questionList.forEach((q, idx) => {
      const gqId = `gq-${gameId}-${idx}`;
      this.gameQuestions.set(gqId, {
        id: gqId,
        gameId,
        questionId: q.id,
        orderIndex: idx,
        durationSeconds: q.durationSeconds || this.game!.defaultQuestionDuration,
        status: "PENDING",
        openedAt: null,
        deadline: null,
        closedAt: null,
        remainingOnPause: null,
        question: q,
      });
    });

    this.logAudit("GAME_RESET", "ADMIN", { gameId, totalQuestions: questionList.length });
    this.saveToFile();
    return this.buildGameState();
  }

  public async updateGameSettings(settings: Partial<GameState>): Promise<GameState> {
    if (!this.game) await this.getCurrentGame();
    this.game = {
      ...this.game!,
      ...settings,
    };
    this.saveToFile();
    return this.buildGameState();
  }

  public async getGameQuestions(gameId: string): Promise<GameQuestionState[]> {
    const list = Array.from(this.gameQuestions.values())
      .filter((gq) => gq.gameId === gameId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    return list.map((gq) => this.toGameQuestionState(gq, this.game?.status === "ANSWER_REVEAL"));
  }

  public async getGameQuestionByOrder(gameId: string, orderIndex: number): Promise<GameQuestionState | null> {
    for (const gq of this.gameQuestions.values()) {
      if (gq.gameId === gameId && gq.orderIndex === orderIndex) {
        const isReveal = gq.status === "REVEALED" || this.game?.status === "ANSWER_REVEAL";
        return this.toGameQuestionState(gq, isReveal);
      }
    }
    return null;
  }

  public async getGameQuestionById(gameQuestionId: string): Promise<GameQuestionState | null> {
    const gq = this.gameQuestions.get(gameQuestionId);
    if (!gq) return null;
    const isReveal = gq.status === "REVEALED" || this.game?.status === "ANSWER_REVEAL";
    return this.toGameQuestionState(gq, isReveal);
  }

  public async updateGameQuestion(
    gameQuestionId: string,
    updates: Partial<GameQuestionState>
  ): Promise<GameQuestionState> {
    const gq = this.gameQuestions.get(gameQuestionId);
    if (!gq) throw new Error("GameQuestion not found");
    Object.assign(gq, updates);
    this.gameQuestions.set(gameQuestionId, gq);
    this.saveToFile();
    const isReveal = gq.status === "REVEALED" || this.game?.status === "ANSWER_REVEAL";
    return this.toGameQuestionState(gq, isReveal);
  }

  public async updateGameStatus(status: GameStatus, currentQuestionIndex?: number): Promise<GameState> {
    if (!this.game) await this.getCurrentGame();
    this.game!.status = status;
    if (currentQuestionIndex !== undefined) {
      this.game!.currentQuestionIndex = currentQuestionIndex;
    }
    this.saveToFile();
    return this.buildGameState();
  }

  // --- Answers & Scoring ---
  public async getAnswersForQuestion(gameQuestionId: string): Promise<TeamAnswerRecord[]> {
    const results: TeamAnswerRecord[] = [];
    for (const ans of this.answers.values()) {
      if ((ans as any).gameQuestionId === gameQuestionId) {
        results.push(ans);
      }
    }
    return results;
  }

  public async getTeamAnswer(gameQuestionId: string, teamId: string): Promise<TeamAnswerRecord | null> {
    return this.answers.get(`${gameQuestionId}_${teamId}`) || null;
  }

  public async submitAnswer(
    gameId: string,
    gameQuestionId: string,
    teamId: string,
    selectedOption: string,
    timeTakenSeconds?: number
  ): Promise<{ success: boolean; answer?: TeamAnswerRecord; error?: string }> {
    const team = this.teams.get(teamId);
    if (!team) return { success: false, error: "Team not found" };
    if (team.isDisabled || team.isDisqualified) {
      return { success: false, error: "Team terminal is disabled or disqualified." };
    }

    const gq = this.gameQuestions.get(gameQuestionId);
    if (!gq) return { success: false, error: "Question not found" };

    if (gq.status !== "ACTIVE" && this.game?.status !== "QUESTION_ACTIVE") {
      return { success: false, error: "Question is not currently active for answering" };
    }

    // Check Deadline (with 500ms network latency tolerance)
    if (gq.deadline) {
      const deadlineMs = new Date(gq.deadline).getTime();
      if (Date.now() > deadlineMs + 500) {
        return { success: false, error: "Deadline expired. Submissions closed." };
      }
    }

    // Check if team used Bull's Pass for this question
    const passLifeline = this.lifelines.get(`${gameQuestionId}_${teamId}_BULLS_PASS`);
    if (passLifeline) {
      return { success: false, error: "Team skipped this question using Bull's Pass." };
    }

    // Check existing answer
    const key = `${gameQuestionId}_${teamId}`;
    const existing = this.answers.get(key);
    if (existing && !this.game?.allowAnswerChange) {
      return { success: false, error: "Answer already locked. Changes not permitted." };
    }

    const opt = selectedOption.trim().toUpperCase();
    if (!["A", "B", "C", "D"].includes(opt)) {
      return { success: false, error: "Invalid option selection." };
    }

    const answerRecord: TeamAnswerRecord = {
      id: `ans-${Date.now()}-${teamId}`,
      teamId,
      selectedOption: opt,
      isLocked: true,
      pointsAwarded: 0,
      timeTakenSeconds: timeTakenSeconds || null,
      submittedAt: new Date().toISOString(),
    };
    (answerRecord as any).gameQuestionId = gameQuestionId;
    (answerRecord as any).gameId = gameId;

    this.answers.set(key, answerRecord);
    this.logAudit("ANSWER_SUBMITTED", "TEAM", { gameQuestionId, selectedOption: opt }, { gameId, teamId });
    this.saveToFile();
    return { success: true, answer: answerRecord };
  }

  public async revealAnswersAndScore(
    gameId: string,
    gameQuestionId: string
  ): Promise<{
    correctOption: string;
    explanation?: string;
    answers: TeamAnswerRecord[];
    leaderboard: LeaderboardEntry[];
  }> {
    const gq = this.gameQuestions.get(gameQuestionId);
    if (!gq) throw new Error("Game question not found");

    const fullQuestion = this.questions.get(gq.questionId);
    if (!fullQuestion) throw new Error("Question details missing");

    const correctOption = fullQuestion.correctOption;
    gq.status = "REVEALED";

    const correctReward = this.game?.correctReward ?? 1000;
    const incorrectPenalty = this.game?.incorrectPenalty ?? 200;
    const unansweredPenalty = this.game?.unansweredPenalty ?? 0;

    // Process every registered team
    for (const team of this.teams.values()) {
      const key = `${gameQuestionId}_${team.id}`;
      const answer = this.answers.get(key);
      const passed = this.lifelines.get(`${gameQuestionId}_${team.id}_BULLS_PASS`);

      if (passed) {
        // Bull's Pass: team skipped question, no score change
        continue;
      }

      if (answer) {
        team.attemptedQuestions = (team.attemptedQuestions || 0) + 1;
        const isCorrect = answer.selectedOption.toUpperCase() === correctOption.toUpperCase();
        answer.isCorrect = isCorrect;

        if (isCorrect) {
          answer.pointsAwarded = correctReward;
          team.score += correctReward;
          team.correctAnswers = (team.correctAnswers || 0) + 1;
        } else {
          answer.pointsAwarded = -incorrectPenalty;
          team.score = Math.max(0, team.score - incorrectPenalty);
        }
        this.answers.set(key, answer);
      } else {
        // Unanswered
        if (unansweredPenalty > 0) {
          team.score = Math.max(0, team.score - unansweredPenalty);
        }
      }
      this.teams.set(team.id, team);
    }

    this.saveToFile();
    const answersList = await this.getAnswersForQuestion(gameQuestionId);
    const leaderboard = await this.getLeaderboard();

    return {
      correctOption,
      explanation: fullQuestion.explanation || undefined,
      answers: answersList,
      leaderboard,
    };
  }

  // --- Lifelines & Economy ---
  public async purchaseLifeline(
    gameId: string,
    gameQuestionId: string,
    teamId: string,
    lifelineType: LifelineType,
    idempotencyKey: string
  ): Promise<{ success: boolean; lifeline?: LifelineState; error?: string }> {
    const team = this.teams.get(teamId);
    if (!team) return { success: false, error: "Team not found" };

    const gq = this.gameQuestions.get(gameQuestionId);
    if (!gq) return { success: false, error: "Question not found" };

    if (gq.status !== "ACTIVE" && this.game?.status !== "QUESTION_ACTIVE") {
      return { success: false, error: "Lifelines can only be purchased during active questions" };
    }

    const key = `${gameQuestionId}_${teamId}_${lifelineType}`;
    const existing = this.lifelines.get(key);
    if (existing && !this.game?.allowRepeatLifelines) {
      return { success: false, error: "Lifeline already purchased for this question" };
    }

    const fullQuestion = this.questions.get(gq.questionId);
    if (!fullQuestion) return { success: false, error: "Question details unavailable" };

    let cost = 0;
    const details: any = {};

    switch (lifelineType) {
      case "BULLS_HINT":
        cost = 500;
        if (!fullQuestion.hintText) {
          return { success: false, error: "No hint available for this question. Coins not deducted." };
        }
        details.hintText = fullQuestion.hintText;
        break;

      case "VISION_BOOST":
        cost = 1500;
        const clue = fullQuestion.visualClueUrl || fullQuestion.imageUrl;
        if (!clue) {
          return { success: false, error: "No visual clue available for this question. Coins not deducted." };
        }
        details.visualClueUrl = clue;
        break;

      case "50_50_BLAST":
        cost = 2000;
        const allOptions: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
        const incorrect = allOptions.filter((opt) => opt !== fullQuestion.correctOption);
        // Randomly pick 2 incorrect options to eliminate
        const shuffled = incorrect.sort(() => 0.5 - Math.random());
        details.eliminatedOptions = shuffled.slice(0, 2);
        break;

      case "BULLS_PASS":
        cost = 2500;
        details.isSkipped = true;
        break;

      default:
        return { success: false, error: "Invalid lifeline type" };
    }

    // Atomic Coin Balance Check
    if (team.currentBalance < cost) {
      return {
        success: false,
        error: `Insufficient coins. Required: ${cost}, Available: ${team.currentBalance}`,
      };
    }

    // Deduct coins atomically
    const prevBalance = team.currentBalance;
    team.currentBalance -= cost;
    this.teams.set(teamId, team);

    // Record Transaction
    this.coinTransactions.push({
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teamId,
      teamName: team.name,
      transactionType: "LIFELINE_PURCHASE",
      amount: -cost,
      previousBalance: prevBalance,
      newBalance: team.currentBalance,
      relatedQuestionId: gameQuestionId,
      eventDetails: `Purchased ${lifelineType}`,
      createdAt: new Date().toISOString(),
    });

    const lifelineRecord = {
      id: `ll-${Date.now()}`,
      gameId,
      gameQuestionId,
      teamId,
      lifelineType,
      cost,
      details,
      idempotencyKey,
      purchasedAt: new Date().toISOString(),
    };
    this.lifelines.set(key, lifelineRecord);

    this.logAudit("LIFELINE_PURCHASED", "TEAM", { lifelineType, cost }, { gameId, teamId });
    this.saveToFile();

    return {
      success: true,
      lifeline: {
        type: lifelineType,
        purchased: true,
        cost,
        details,
      },
    };
  }

  public async getLifelinesForTeam(
    gameQuestionId: string,
    teamId: string
  ): Promise<Record<LifelineType, LifelineState>> {
    const types: LifelineType[] = ["BULLS_HINT", "VISION_BOOST", "50_50_BLAST", "BULLS_PASS"];
    const costs: Record<LifelineType, number> = {
      BULLS_HINT: 500,
      VISION_BOOST: 1500,
      "50_50_BLAST": 2000,
      BULLS_PASS: 2500,
    };

    const res: any = {};
    for (const t of types) {
      const rec = this.lifelines.get(`${gameQuestionId}_${teamId}_${t}`);
      res[t] = {
        type: t,
        purchased: !!rec,
        cost: costs[t],
        details: rec?.details || undefined,
      };
    }
    return res;
  }

  public async adjustCoins(
    teamId: string,
    amount: number,
    transactionType: string,
    options?: { relatedQuestionId?: string; eventDetails?: string; idempotencyKey?: string }
  ): Promise<{ success: boolean; previousBalance: number; newBalance: number; error?: string }> {
    const team = this.teams.get(teamId);
    if (!team) return { success: false, previousBalance: 0, newBalance: 0, error: "Team not found" };

    if (amount < 0 && team.currentBalance < Math.abs(amount)) {
      return {
        success: false,
        previousBalance: team.currentBalance,
        newBalance: team.currentBalance,
        error: "Insufficient coins for deduction",
      };
    }

    const prevBalance = team.currentBalance;
    team.currentBalance += amount;
    this.teams.set(teamId, team);

    this.coinTransactions.push({
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teamId,
      teamName: team.name,
      transactionType,
      amount,
      previousBalance: prevBalance,
      newBalance: team.currentBalance,
      relatedQuestionId: options?.relatedQuestionId || null,
      eventDetails: options?.eventDetails || null,
      createdAt: new Date().toISOString(),
    });

    this.saveToFile();
    return { success: true, previousBalance: prevBalance, newBalance: team.currentBalance };
  }

  public async getCoinTransactions(teamId?: string): Promise<CoinTransactionRecord[]> {
    if (teamId) {
      return this.coinTransactions.filter((tx) => tx.teamId === teamId);
    }
    return [...this.coinTransactions].reverse();
  }

  // --- Leaderboard ---
  public async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const teams = Array.from(this.teams.values());

    // Count lifelines per team
    const lifelineCountMap = new Map<string, number>();
    for (const l of this.lifelines.values()) {
      lifelineCountMap.set(l.teamId, (lifelineCountMap.get(l.teamId) || 0) + 1);
    }

    // Sort primarily by score (desc), then coins remaining (desc), then correct answers (desc)
    const sorted = [...teams].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.currentBalance !== a.currentBalance) return b.currentBalance - a.currentBalance;
      return b.correctAnswers - a.correctAnswers;
    });

    return sorted.map((t, idx) => ({
      rank: idx + 1,
      teamId: t.id,
      teamCode: t.teamCode,
      teamName: t.name,
      score: t.score,
      correctAnswers: t.correctAnswers,
      attemptedQuestions: t.attemptedQuestions,
      currentBalance: t.currentBalance,
      lifelinesUsedCount: lifelineCountMap.get(t.id) || 0,
    }));
  }

  // --- Audit & Anti-Cheating ---
  public async logAudit(
    action: string,
    actor: "ADMIN" | "TEAM" | "SYSTEM",
    details?: any,
    options?: { gameId?: string; teamId?: string; ipAddress?: string }
  ): Promise<void> {
    const team = options?.teamId ? this.teams.get(options.teamId) : null;
    const record: AuditLogRecord = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      gameId: options?.gameId || this.game?.id || null,
      teamId: options?.teamId || null,
      teamName: team?.name || null,
      action,
      actor,
      ipAddress: options?.ipAddress || null,
      details: typeof details === "object" ? JSON.stringify(details) : details ? String(details) : null,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
  }

  public async getAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
    return this.auditLogs.slice(0, limit);
  }

  public async recordSuspiciousActivity(
    teamId: string,
    eventType: string,
    description: string,
    options?: { gameId?: string; metadata?: string }
  ): Promise<SuspiciousActivityRecord> {
    const team = this.teams.get(teamId);
    const existing = this.suspiciousActivities.find(
      (a) => a.teamId === teamId && a.eventType === eventType
    );

    let record: SuspiciousActivityRecord;
    if (existing) {
      existing.flagCount += 1;
      existing.createdAt = new Date().toISOString();
      record = existing;
    } else {
      record = {
        id: `susp-${Date.now()}`,
        teamId,
        teamName: team?.name || "Unknown Team",
        eventType,
        description,
        metadata: options?.metadata || null,
        flagCount: 1,
        createdAt: new Date().toISOString(),
      };
      this.suspiciousActivities.unshift(record);
    }

    this.logAudit("SUSPICIOUS_ACTIVITY", "SYSTEM", { eventType, description }, { teamId });
    this.saveToFile();
    return record;
  }

  public async getSuspiciousActivities(teamId?: string): Promise<SuspiciousActivityRecord[]> {
    if (teamId) {
      return this.suspiciousActivities.filter((a) => a.teamId === teamId);
    }
    return this.suspiciousActivities;
  }

  public async recordTeamStrike(
    teamId: string,
    reason: string
  ): Promise<{ strikesCount: number; isDisqualified: boolean }> {
    const team = this.teams.get(teamId);
    if (!team) return { strikesCount: 0, isDisqualified: false };

    team.strikesCount = (team.strikesCount || 0) + 1;
    const isDisqualified = team.strikesCount >= 3;
    if (isDisqualified) {
      team.isDisqualified = true;
      team.isDisabled = true;
    }
    this.teams.set(teamId, team);

    await this.recordSuspiciousActivity(
      teamId,
      "STRIKE_RECORDED",
      `Strike #${team.strikesCount}/3: ${reason}${isDisqualified ? " -> EXAM TERMINATED (DISQUALIFIED)" : ""}`
    );

    await this.logAudit(
      isDisqualified ? "TEAM_DISQUALIFIED" : "STRIKE_ISSUED",
      "SYSTEM",
      { strike: team.strikesCount, reason, isDisqualified },
      { teamId }
    );

    this.saveToFile();
    return { strikesCount: team.strikesCount, isDisqualified };
  }

  public async resetTeamStrikes(teamId: string): Promise<TeamPublic> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error("Team not found");
    team.strikesCount = 0;
    team.isDisqualified = false;
    team.isDisabled = false;
    team.updatedAt = new Date().toISOString();
    this.teams.set(teamId, team);

    await this.logAudit("STRIKES_RESET", "ADMIN", { teamId, message: "Administrator pardoned all strikes." }, { teamId });
    this.saveToFile();
    return this.toPublicTeam(team);
  }

  // --- Helper conversions ---
  private toPublicTeam(t: any): TeamPublic {
    return {
      id: t.id,
      teamCode: t.teamCode,
      name: t.name,
      startingBalance: t.startingBalance,
      currentBalance: t.currentBalance,
      score: t.score,
      correctAnswers: t.correctAnswers,
      attemptedQuestions: t.attemptedQuestions,
      isActive: t.isActive,
      isDisabled: t.isDisabled,
      isDisqualified: !!t.isDisqualified,
      strikesCount: t.strikesCount || 0,
      connectionStatus: t.connectionStatus,
      lastSeenAt: t.lastSeenAt,
    };
  }

  private toGameQuestionState(gq: any, isReveal: boolean): GameQuestionState {
    const q = gq.question;
    const publicQuestion: QuestionPublic = {
      id: q.id,
      category: q.category,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      imageUrl: q.imageUrl,
      difficulty: q.difficulty,
      durationSeconds: gq.durationSeconds || q.durationSeconds,
    };

    return {
      id: gq.id,
      gameId: gq.gameId,
      questionId: gq.questionId,
      orderIndex: gq.orderIndex,
      durationSeconds: gq.durationSeconds,
      status: gq.status,
      openedAt: gq.openedAt,
      deadline: gq.deadline,
      closedAt: gq.closedAt,
      remainingOnPause: gq.remainingOnPause,
      question: publicQuestion,
      correctOption: isReveal ? q.correctOption : null,
      explanation: isReveal ? q.explanation : null,
    };
  }

  private buildGameState(): GameState {
    const currentGQ = Array.from(this.gameQuestions.values()).find(
      (gq) => gq.gameId === this.game?.id && gq.orderIndex === this.game?.currentQuestionIndex
    );

    let countAnswers = 0;
    if (currentGQ) {
      for (const a of this.answers.values()) {
        if ((a as any).gameQuestionId === currentGQ.id) countAnswers++;
      }
    }

    let connected = 0;
    for (const t of this.teams.values()) {
      if (t.connectionStatus === "CONNECTED") connected++;
    }

    const isReveal = this.game?.status === "ANSWER_REVEAL";

    return {
      ...this.game!,
      totalQuestions: this.gameQuestions.size,
      totalTeamsCount: this.teams.size,
      connectedTeamsCount: connected,
      totalAnswersReceived: countAnswers,
      currentQuestion: currentGQ ? this.toGameQuestionState(currentGQ, isReveal) : null,
      requireIncognito: this.game?.requireIncognito ?? true,
      isDemoMode: this.isDemoMode,
    };
  }
}

// Storage Singleton Factory
let storageInstance: StorageEngine | null = null;
let prismaClientInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient | null {
  if (prismaClientInstance) return prismaClientInstance;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  try {
    let finalUrl = dbUrl;
    if (!finalUrl.includes("schema=")) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + "schema=bigbull";
    }
    prismaClientInstance = new PrismaClient({
      datasources: {
        db: { url: finalUrl },
      },
    });
    return prismaClientInstance;
  } catch (e) {
    return null;
  }
}

export async function getStorage(): Promise<StorageEngine> {
  if (storageInstance) return storageInstance;

  const store = new DemoStore();
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      await prisma.$connect();
      console.log("🚀 [Storage] Connected to Neon PostgreSQL (schema: bigbull) via Prisma!");
      const loaded = await store.loadFromPostgres(prisma);
      if (loaded) {
        store.isDemoMode = false;
        storageInstance = store;
        return storageInstance;
      }
    } catch (e: any) {
      console.warn("⚠️ [Storage] PostgreSQL connection notice:", e.message);
    }
  }

  // Fallback to in-memory + local storage
  await store.initialize();
  storageInstance = store;
  console.log("⚡ [Storage] THE BIG BULL Engine initialized successfully");
  return storageInstance;
}
