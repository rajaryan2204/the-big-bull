// THE BIG BULL - Global TypeScript Interfaces

export type GameStatus =
  | "LOBBY"
  | "READY"
  | "QUESTION_ACTIVE"
  | "QUESTION_PAUSED"
  | "QUESTION_CLOSED"
  | "ANSWER_REVEAL"
  | "LEADERBOARD"
  | "FINISHED";

export type QuestionCategory =
  | "General Knowledge"
  | "Space"
  | "Basic Technical Concepts"
  | "Science and Technology"
  | "Logical Thinking";

export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD";

export type LifelineType =
  | "BULLS_HINT"
  | "VISION_BOOST"
  | "50_50_BLAST"
  | "BULLS_PASS";

export interface TeamPublic {
  id: string;
  teamCode: string;
  name: string;
  startingBalance: number;
  currentBalance: number;
  score: number;
  correctAnswers: number;
  attemptedQuestions: number;
  isActive: boolean;
  isDisabled: boolean;
  isDisqualified: boolean;
  strikesCount: number;
  connectionStatus: "CONNECTED" | "DISCONNECTED";
  lastSeenAt?: string | null;
}

export interface QuestionPublic {
  id: string;
  category: QuestionCategory;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  imageUrl?: string | null;
  difficulty: QuestionDifficulty;
  durationSeconds: number;
}

export interface QuestionFull extends QuestionPublic {
  correctOption: "A" | "B" | "C" | "D";
  visualClueUrl?: string | null;
  hintText?: string | null;
  explanation?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GameQuestionState {
  id: string;
  gameId: string;
  questionId: string;
  orderIndex: number;
  durationSeconds: number;
  status: "PENDING" | "ACTIVE" | "PAUSED" | "CLOSED" | "REVEALED";
  openedAt?: string | null;
  deadline?: string | null;
  closedAt?: string | null;
  remainingOnPause?: number | null;
  question: QuestionPublic;
  // Included during reveal phase:
  correctOption?: "A" | "B" | "C" | "D" | null;
  explanation?: string | null;
}

export interface GameState {
  id: string;
  title: string;
  status: GameStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  correctReward: number;
  incorrectPenalty: number;
  unansweredPenalty: number;
  defaultQuestionDuration: number;
  oneActiveSessionPerTeam: boolean;
  examMode: boolean;
  requireIncognito?: boolean;
  allowAnswerChange: boolean;
  allowRepeatLifelines: boolean;
  publicLeaderboardColumns: string;
  currentQuestion?: GameQuestionState | null;
  totalAnswersReceived: number;
  totalTeamsCount: number;
  connectedTeamsCount: number;
  isDemoMode: boolean;
}

export interface TeamAnswerRecord {
  id: string;
  teamId: string;
  selectedOption: string;
  isLocked: boolean;
  isCorrect?: boolean | null;
  pointsAwarded: number;
  timeTakenSeconds?: number | null;
  submittedAt: string;
}

export interface LifelineState {
  type: LifelineType;
  purchased: boolean;
  cost: number;
  details?: {
    hintText?: string;
    visualClueUrl?: string;
    eliminatedOptions?: string[];
    isSkipped?: boolean;
  };
}

export interface TeamPrivateState {
  team: TeamPublic;
  currentAnswer?: TeamAnswerRecord | null;
  lifelines: Record<LifelineType, LifelineState>;
  hasPassed: boolean;
  suspiciousFlagCount: number;
}

export interface CoinTransactionRecord {
  id: string;
  teamId: string;
  teamName?: string;
  transactionType: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  relatedQuestionId?: string | null;
  eventDetails?: string | null;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  gameId?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  action: string;
  actor: "ADMIN" | "TEAM" | "SYSTEM";
  ipAddress?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface SuspiciousActivityRecord {
  id: string;
  teamId: string;
  teamName: string;
  eventType: string;
  description: string;
  metadata?: string | null;
  flagCount: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamCode: string;
  teamName: string;
  score: number;
  correctAnswers: number;
  attemptedQuestions: number;
  currentBalance: number;
  lifelinesUsedCount: number;
}
