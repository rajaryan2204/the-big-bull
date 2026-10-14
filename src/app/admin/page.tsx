"use client";
import React, { useEffect, useState, useRef } from "react";
import { getSocketClient } from "@/src/lib/socketClient";
import { BullLogo } from "@/src/components/BullLogo";
import { CountdownTimer } from "@/src/components/CountdownTimer";
import { DemoBanner } from "@/src/components/DemoBanner";
import {
  Shield,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  CheckCircle,
  Eye,
  Trophy,
  Users,
  HelpCircle,
  Activity,
  FileText,
  AlertTriangle,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Coins,
  Radio,
  Search,
  Check,
  Copy,
  LogOut,
  X,
  Settings,
} from "lucide-react";
import {
  GameState,
  TeamPublic,
  QuestionFull,
  AuditLogRecord,
  SuspiciousActivityRecord,
  LeaderboardEntry,
  CoinTransactionRecord,
} from "@/src/types";

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("bigbull2026");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Tab: overview, live, teams, questions, leaderboard, audit, suspicious
  const [activeTab, setActiveTab] = useState<
    "overview" | "live" | "teams" | "questions" | "leaderboard" | "audit" | "suspicious"
  >("overview");

  // Live State
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [teams, setTeams] = useState<TeamPublic[]>([]);
  const [questions, setQuestions] = useState<QuestionFull[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [suspiciousList, setSuspiciousList] = useState<SuspiciousActivityRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [isPaused, setIsPaused] = useState(false);
  const [answersMatrix, setAnswersMatrix] = useState<any[]>([]);

  // Modals & Forms
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ teamCode: "", name: "", accessCode: "", startingBalance: 5000 });
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionFull | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAdjustCoinsModal, setShowAdjustCoinsModal] = useState<TeamPublic | null>(null);
  const [coinAdjustment, setCoinAdjustment] = useState({ amount: 500, reason: "Admin Discretion" });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const socketRef = useRef<any>(null);

  // Check Admin Authentication
  useEffect(() => {
    fetch("/api/auth/admin/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthenticated(true);
          initAdminSocket();
          loadInitialData();
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false));
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      if (data.token) {
        sessionStorage.setItem("bigbull_admin_token", data.token);
      }
      setAuthenticated(true);
      initAdminSocket();
      loadInitialData();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    sessionStorage.removeItem("bigbull_admin_token");
    setAuthenticated(false);
  };

  const loadInitialData = async () => {
    try {
      const [teamsRes, qRes, auditRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch("/api/admin/questions"),
        fetch("/api/admin/audit"),
      ]);

      if (teamsRes.ok) {
        const d = await teamsRes.json();
        setTeams(d.teams || []);
      }
      if (qRes.ok) {
        const d = await qRes.json();
        setQuestions(d.questions || []);
      }
      if (auditRes.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch (e) {
      console.error("Data load error:", e);
    }
  };

  const initAdminSocket = () => {
    const token =
      sessionStorage.getItem("bigbull_admin_token") ||
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("bigbull_admin_token="))
        ?.split("=")[1];

    const socket = getSocketClient(token, "admin");
    socketRef.current = socket;

    socket.on("game:state", (state: GameState) => {
      setGameState(state);
      if (state.status === "QUESTION_ACTIVE" && state.currentQuestion?.deadline) {
        const ms = new Date(state.currentQuestion.deadline).getTime();
        setRemainingSeconds(Math.max(0, Math.ceil((ms - Date.now()) / 1000)));
        setIsPaused(false);
      } else if (state.status === "QUESTION_PAUSED" && state.currentQuestion?.remainingOnPause) {
        setRemainingSeconds(Math.ceil(state.currentQuestion.remainingOnPause / 1000));
        setIsPaused(true);
      }
    });

    socket.on("timer:sync", (data: { remainingSeconds: number; isPaused: boolean }) => {
      setRemainingSeconds(data.remainingSeconds);
      setIsPaused(data.isPaused);
    });

    socket.on("admin:teams_list", (tList: TeamPublic[]) => {
      setTeams(tList);
    });

    socket.on("admin:audit_logs", (logs: AuditLogRecord[]) => {
      setAuditLogs(logs);
    });

    socket.on("admin:suspicious_list", (sList: SuspiciousActivityRecord[]) => {
      setSuspiciousList(sList);
    });

    socket.on("leaderboard:updated", (lb: LeaderboardEntry[]) => {
      setLeaderboard(lb);
    });

    socket.on("admin:answers_matrix", (data: any) => {
      setAnswersMatrix(data.answers || []);
    });
  };

  // Admin Command Helper (Dual Dispatch: WebSockets + HTTP fallback for Vercel Serverless)
  const sendAdminCommand = async (event: string, payload?: any) => {
    let socketDispatched = false;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, payload, (res: any) => {
        if (res && !res.success) {
          alert(res.error || "Command failed");
        }
      });
      socketDispatched = true;
    }

    try {
      const res = await fetch("/api/admin/game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: event, options: payload }),
      });
      const data = await res.json();
      if (!res.ok && !socketDispatched) {
        alert(data.error || "Command execution error");
      } else if (data.game) {
        setGameState(data.game);
        loadInitialData();
      }
    } catch (e) {
      if (!socketDispatched) console.error("HTTP control error:", e);
    }
  };

  const toggleIncognito = async () => {
    const nextVal = !(gameState?.requireIncognito ?? true);
    await sendAdminCommand("admin:toggle_incognito", { requireIncognito: nextVal });
  };

  // HTTP Polling Fallback (ensures live telemetry updates if WebSockets disconnect or on Vercel)
  useEffect(() => {
    if (!authenticated) return;
    const pollInterval = setInterval(async () => {
      if (!socketRef.current || !socketRef.current.connected) {
        try {
          const res = await fetch("/api/game/state");
          const data = await res.json();
          if (data.success && data.game) {
            setGameState(data.game);
            if (data.leaderboard) setLeaderboard(data.leaderboard);
            if (data.game.status === "QUESTION_ACTIVE" && data.game.currentQuestion?.deadline) {
              const ms = new Date(data.game.currentQuestion.deadline).getTime();
              setRemainingSeconds(Math.max(0, Math.ceil((ms - Date.now()) / 1000)));
              setIsPaused(false);
            } else if (data.game.status === "QUESTION_PAUSED" && data.game.currentQuestion?.remainingOnPause) {
              setRemainingSeconds(Math.ceil(data.game.currentQuestion.remainingOnPause / 1000));
              setIsPaused(true);
            }
          }
        } catch (e) {}
      }
    }, 1500);
    return () => clearInterval(pollInterval);
  }, [authenticated]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // CSV Export
  const handleExportCSV = () => {
    window.open("/api/admin/questions/export", "_blank");
  };

  // CSV Import
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const csv = evt.target?.result;
      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: csv,
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully imported ${data.count} questions!`);
        loadInitialData();
      } else {
        alert(data.error || "Import failed");
      }
    };
    reader.readAsText(file);
  };

  // Delete Question
  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    const res = await fetch(`/api/admin/questions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    }
  };

  // Add Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTeam),
    });
    const data = await res.json();
    if (res.ok) {
      setTeams((prev) => [...prev, data.team]);
      setShowAddTeamModal(false);
      setNewTeam({ teamCode: "", name: "", accessCode: "", startingBalance: 5000 });
    } else {
      alert(data.error || "Failed to create team");
    }
  };

  // Toggle Disable Team
  const handleToggleDisableTeam = async (team: TeamPublic) => {
    const res = await fetch("/api/admin/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: team.id, isDisabled: !team.isDisabled }),
    });
    if (res.ok) {
      setTeams((prev) =>
        prev.map((t) => (t.id === team.id ? { ...t, isDisabled: !t.isDisabled } : t))
      );
    }
  };

  // Reset Security Strikes
  const handleResetStrikes = async (team: TeamPublic) => {
    const res = await fetch("/api/admin/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: team.id, action: "reset_strikes" }),
    });
    if (res.ok) {
      setTeams((prev) =>
        prev.map((t) =>
          t.id === team.id ? { ...t, strikesCount: 0, isDisqualified: false, isDisabled: false } : t
        )
      );
      loadInitialData();
    }
  };

  // Adjust Coins
  const handleAdjustCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustCoinsModal) return;
    const res = await fetch("/api/admin/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: showAdjustCoinsModal.id,
        action: "adjust_coins",
        amount: coinAdjustment.amount,
        reason: coinAdjustment.reason,
      }),
    });
    if (res.ok) {
      setShowAdjustCoinsModal(null);
      loadInitialData();
    }
  };

  // Render Login Overlay if not authenticated
  if (authenticated === false) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
        <DemoBanner isDemoMode={true} />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xl text-center space-y-6">
            <BullLogo size="lg" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">COMMAND CENTER AUTH</h1>
              <p className="text-xs text-slate-500 mt-1">
                Authorized Competition Administrators Only
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Admin Username
                </label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-hidden transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-hidden transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm uppercase tracking-wider shadow-sm shadow-blue-500/20 hover:brightness-105 cursor-pointer transition"
              >
                {loginLoading ? "Authenticating..." : "Unlock Command Center"}
              </button>
            </form>

            <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 flex-wrap">
              <span>Local demo credentials:</span>
              <code className="text-blue-700 font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-bold">admin</code>
              <span>/</span>
              <code className="text-blue-700 font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-bold">bigbull2026</code>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (authenticated === null) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const status = gameState?.status || "LOBBY";
  const currentQ = gameState?.currentQuestion;

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <DemoBanner isDemoMode={gameState?.isDemoMode ?? true} />

      {/* Top Command Bar */}
      <header className="border-b border-slate-200/80 px-4 sm:px-6 py-3 bg-white/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BullLogo size="sm" />
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-blue-700 font-bold hidden sm:inline">
              Admin Command
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-mono font-bold text-blue-700 uppercase">
              {status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Quick Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <CountdownTimer
            size="sm"
            remainingSeconds={remainingSeconds}
            totalSeconds={currentQ?.durationSeconds || 300}
            isPaused={isPaused}
          />

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <div className="border-b border-slate-200/80 bg-white px-4 sm:px-6 py-2 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
        {[
          { key: "overview", label: "Overview", icon: Activity },
          { key: "live", label: "Live Game Control", icon: Play },
          { key: "teams", label: "Team Management", icon: Users },
          { key: "questions", label: "Question Pool", icon: HelpCircle },
          { key: "leaderboard", label: "Leaderboard", icon: Trophy },
          { key: "audit", label: "Audit Ledger", icon: FileText },
          { key: "suspicious", label: "Anti-Cheating Alerts", icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-200/90 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.key === "suspicious" && suspiciousList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {suspiciousList.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Command Workspace */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="text-xs text-slate-500 uppercase font-semibold">Game Status</div>
                <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1 font-mono uppercase">
                  {status.replace("_", " ")}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Authoritative State</div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="text-xs text-slate-500 uppercase font-semibold">Active Round</div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
                  {(gameState?.currentQuestionIndex || 0) + 1} / {gameState?.totalQuestions || questions.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Championship Sequence</div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="text-xs text-slate-500 uppercase font-semibold">Connected Teams</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 font-mono">
                  {teams.filter((t) => t.connectionStatus === "CONNECTED").length} / {teams.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Live WebSockets</div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="text-xs text-slate-500 uppercase font-semibold">Locked Answers</div>
                <div className="text-xl sm:text-2xl font-black text-blue-600 mt-1 font-mono">
                  {gameState?.totalAnswersReceived || 0} / {teams.filter((t) => !t.isDisabled).length}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Current Question Submissions</div>
              </div>
            </div>

            {/* Quick Live Control Bar */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Live Game Controller</h3>
                  <p className="text-xs text-slate-500">
                    Authoritative controls synchronized across Smart Board and Team Phones.
                  </p>
                </div>

                <button
                  onClick={toggleIncognito}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer self-start sm:self-auto ${
                    (gameState?.requireIncognito ?? true)
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                  }`}
                  title="Click to toggle Incognito Requirement for all participants"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>
                    INCOGNITO GATE: {(gameState?.requireIncognito ?? true) ? "ON (STRICT)" : "OFF (PARDONED)"}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {status === "LOBBY" && (
                  <button
                    onClick={() => sendAdminCommand("admin:start_game")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm shadow-blue-500/20 cursor-pointer transition"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start Championship</span>
                  </button>
                )}

                {status === "QUESTION_ACTIVE" && (
                  <>
                    <button
                      onClick={() => sendAdminCommand("admin:pause_game")}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs uppercase hover:bg-amber-100 cursor-pointer transition"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </button>
                    <button
                      onClick={() => sendAdminCommand("admin:close_question")}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold text-xs uppercase hover:bg-red-100 cursor-pointer transition"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Close Answers</span>
                    </button>
                  </>
                )}

                {status === "QUESTION_PAUSED" && (
                  <button
                    onClick={() => sendAdminCommand("admin:resume_game")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs uppercase hover:bg-emerald-100 cursor-pointer transition"
                  >
                    <Play className="w-4 h-4 fill-emerald-600" />
                    <span>Resume Timer</span>
                  </button>
                )}

                {(status === "QUESTION_CLOSED" || status === "QUESTION_ACTIVE") && (
                  <button
                    onClick={() => sendAdminCommand("admin:reveal_answer")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm shadow-emerald-500/20 cursor-pointer transition"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Reveal Answer & Score</span>
                  </button>
                )}

                {status === "ANSWER_REVEAL" && (
                  <>
                    <button
                      onClick={() => sendAdminCommand("admin:show_leaderboard")}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs uppercase hover:bg-blue-100 cursor-pointer transition"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Display Standings</span>
                    </button>
                    <button
                      onClick={() => sendAdminCommand("admin:next_question")}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm shadow-blue-500/20 cursor-pointer transition"
                    >
                      <FastForward className="w-4 h-4" />
                      <span>Next Question →</span>
                    </button>
                  </>
                )}

                {status === "LEADERBOARD" && (
                  <button
                    onClick={() => sendAdminCommand("admin:next_question")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm shadow-blue-500/20 cursor-pointer transition"
                  >
                    <FastForward className="w-4 h-4" />
                    <span>Next Question →</span>
                  </button>
                )}
              </div>
            </div>

            {/* Current Active Question Live Card */}
            {currentQ && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-mono font-bold text-blue-700">
                    Question {(gameState?.currentQuestionIndex || 0) + 1} Details
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{currentQ.question.category}</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{currentQ.question.text}</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
                  {["A", "B", "C", "D"].map((k) => (
                    <div
                      key={k}
                      className={`p-3 rounded-xl border ${
                        currentQ.correctOption === k
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="text-blue-700 font-bold mr-2">{k}:</span>
                      <span>{(currentQ.question as any)[`option${k}`]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE GAME CONTROL */}
        {activeTab === "live" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Controls Column */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-base font-bold text-slate-900">Stage Progression</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => sendAdminCommand("admin:start_game")}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs cursor-pointer transition"
                  >
                    1. Start Game
                  </button>
                  <button
                    onClick={() => sendAdminCommand("admin:pause_game")}
                    className="w-full py-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 font-bold text-xs uppercase cursor-pointer transition"
                  >
                    2. Pause Timer
                  </button>
                  <button
                    onClick={() => sendAdminCommand("admin:resume_game")}
                    className="w-full py-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 font-bold text-xs uppercase cursor-pointer transition"
                  >
                    3. Resume Timer
                  </button>
                  <button
                    onClick={() => sendAdminCommand("admin:close_question")}
                    className="w-full py-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-red-300 hover:bg-red-50 text-red-700 font-bold text-xs uppercase cursor-pointer transition"
                  >
                    4. Close Submissions
                  </button>
                  <button
                    onClick={() => sendAdminCommand("admin:reveal_answer")}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs cursor-pointer transition"
                  >
                    5. Reveal Correct Answer
                  </button>
                  <button
                    onClick={() => sendAdminCommand("admin:show_leaderboard")}
                    className="w-full py-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold text-xs uppercase cursor-pointer transition"
                  >
                    6. Show Smart Board Leaderboard
                  </button>
                  <button
                    onClick={() => sendAdminCommand("admin:next_question")}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs cursor-pointer transition"
                  >
                    7. Open Next Question
                  </button>
                </div>
              </div>

              {/* Live Answer Submissions Matrix (Admin Eyes Only) */}
              <div className="md:col-span-2 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-600" />
                    Live Submissions Matrix (Confidential)
                  </h3>
                  <span className="text-xs font-mono text-slate-500 font-medium">
                    {answersMatrix.length} Received
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {teams.map((t) => {
                    const ans = answersMatrix.find((a: any) => a.teamId === t.id);
                    return (
                      <div
                        key={t.id}
                        className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
                          ans
                            ? "bg-blue-50/80 border-blue-200 text-slate-900 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="font-bold truncate text-slate-900">{t.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t.teamCode}</div>
                        <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between font-mono">
                          <span className="text-[10px] text-slate-500">Choice:</span>
                          <span
                            className={`font-black text-sm ${
                              ans ? "text-blue-700" : "text-slate-400"
                            }`}
                          >
                            {ans ? ans.selectedOption : "Waiting"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TEAM MANAGEMENT */}
        {activeTab === "teams" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Registered Teams & Credentials</h3>
                <p className="text-xs text-slate-500">
                  Manage team accounts, inspect coin balances, reset access codes, and credit coins.
                </p>
              </div>

              <button
                onClick={() => setShowAddTeamModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase shadow-xs cursor-pointer transition self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Team</span>
              </button>
            </div>

            {/* Teams Table */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Team Code</th>
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Access Code</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Anti-Cheat Strikes</th>
                    <th className="py-3.5 px-4 text-center">Score</th>
                    <th className="py-3.5 px-4 text-right">Coin Stash</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {teams.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{t.teamCode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{t.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span>{t.teamCode}</span>
                          <button
                            onClick={() => copyCode(t.teamCode)}
                            className="text-slate-400 hover:text-blue-600 transition"
                            title="Copy Code"
                          >
                            {copiedCode === t.teamCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.isDisqualified
                              ? "bg-red-50 text-red-700 border border-red-200 font-bold"
                              : t.isDisabled
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : t.connectionStatus === "CONNECTED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {t.isDisqualified ? "DISQUALIFIED" : t.isDisabled ? "DISABLED" : t.connectionStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                            t.isDisqualified || (t.strikesCount ?? 0) >= 3
                              ? "bg-red-50 text-red-700 border border-red-200 font-bold"
                              : (t.strikesCount ?? 0) > 0
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {t.isDisqualified || (t.strikesCount ?? 0) >= 3
                            ? "3/3 TERMINATED"
                            : `${t.strikesCount ?? 0}/3 STRIKES`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {t.score}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        💰 {t.currentBalance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {(t.strikesCount ?? 0) > 0 && (
                          <button
                            onClick={() => handleResetStrikes(t)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 font-semibold text-[11px] cursor-pointer transition"
                            title="Reset Strikes & Pardon Team"
                          >
                            Reset Strikes
                          </button>
                        )}
                        <button
                          onClick={() => setShowAdjustCoinsModal(t)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] cursor-pointer transition"
                        >
                          Adjust Coins
                        </button>
                        <button
                          onClick={() => handleToggleDisableTeam(t)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition ${
                            t.isDisabled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {t.isDisabled ? "Enable" : "Disable"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: QUESTION POOL & CRUD */}
        {activeTab === "questions" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Question Management</h3>
                <p className="text-xs text-slate-500">
                  Total questions: {questions.length} • Supports CSV Import/Export & Custom Lifeline Clues
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import CSV</span>
                  <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                </label>

                <button
                  onClick={() => setShowAddQuestionModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase shadow-xs cursor-pointer transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Question</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3 relative group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-blue-700 font-bold">#{idx + 1} • {q.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-[10px] text-blue-700 font-bold">
                        {q.difficulty}
                      </span>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-slate-400 hover:text-red-500 p-1 transition cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-relaxed">{q.text}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {["A", "B", "C", "D"].map((opt) => (
                      <div
                        key={opt}
                        className={`p-2 rounded-lg border text-[11px] truncate ${
                          q.correctOption === opt
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="font-bold mr-1 text-blue-700">{opt}:</span>
                        <span>{(q as any)[`option${opt}`]}</span>
                      </div>
                    ))}
                  </div>

                  {q.hintText && (
                    <div className="text-[11px] text-slate-500 italic pt-1">
                      💡 Hint: {q.hintText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Full Leaderboard & Performance</h3>
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Rank</th>
                    <th className="py-3.5 px-4">Team</th>
                    <th className="py-3.5 px-4 text-center">Score</th>
                    <th className="py-3.5 px-4 text-center">Correct Answers</th>
                    <th className="py-3.5 px-4 text-center">Lifelines Used</th>
                    <th className="py-3.5 px-4 text-right">Coins Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {leaderboard.map((lb) => (
                    <tr key={lb.teamId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">#{lb.rank}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{lb.teamName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{lb.teamCode}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-blue-700 text-sm">
                        {lb.score.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        {lb.correctAnswers} / {lb.attemptedQuestions}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {lb.lifelinesUsedCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        💰 {lb.currentBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT LEDGER */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">System Audit & Coin Transaction Ledger</h3>
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 text-xs flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700">{log.action}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-mono">
                          {log.actor}
                        </span>
                        {log.teamName && (
                          <span className="text-slate-800 font-semibold">• {log.teamName}</span>
                        )}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px] truncate max-w-xl">
                        {log.details}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ANTI-CHEATING SUSPICIOUS ACTIVITY */}
        {activeTab === "suspicious" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                Anti-Cheating & Invigilation Alerts
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Client-side Page Visibility API monitoring, window blur events, and Incognito enforcement.
              </p>
            </div>

            {/* Incognito Security Gate Master Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-blue-700">
                    ANTI-CHEAT LAYER 1: BROWSER ENFORCEMENT GATE
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      (gameState?.requireIncognito ?? true)
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {(gameState?.requireIncognito ?? true) ? "ENFORCED" : "BYPASSED"}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900">Private / Incognito Browsing Restriction</h4>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  Requires all student terminals on <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-mono">/join</code> and <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-mono">/team</code> to be opened in an Incognito / Private window. Neutralizes AI solver extensions, auto-fill, and cached history.
                </p>
              </div>

              <button
                onClick={toggleIncognito}
                className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                  (gameState?.requireIncognito ?? true)
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>
                  {(gameState?.requireIncognito ?? true)
                    ? "INCOGNITO: STRICT (CLICK TO PARDON)"
                    : "INCOGNITO: PARDONED (CLICK TO ENFORCE)"}
                </span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
              {suspiciousList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No suspicious tab switches or window blur events detected yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {suspiciousList.map((item) => (
                    <div key={item.id} className="p-4 text-xs flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{item.teamName}</span>
                            <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-mono">
                              {item.flagCount} Incident(s)
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">{item.description}</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Team Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Register New Team</h3>
              <button onClick={() => setShowAddTeamModal(false)} className="text-slate-400 hover:text-slate-700 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Team Code</label>
                <input
                  type="text"
                  placeholder="e.g. BULLS-109"
                  value={newTeam.teamCode}
                  onChange={(e) => setNewTeam({ ...newTeam, teamCode: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-hidden transition"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Team Name</label>
                <input
                  type="text"
                  placeholder="e.g. Quantum Bulls"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-blue-600 focus:bg-white focus:outline-hidden transition"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Secret Access Code</label>
                <input
                  type="text"
                  placeholder="Secret Code for Login"
                  value={newTeam.accessCode}
                  onChange={(e) => setNewTeam({ ...newTeam, accessCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-hidden transition"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition cursor-pointer"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Coins Modal */}
      {showAdjustCoinsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Adjust Coins for {showAdjustCoinsModal.name}
            </h3>

            <form onSubmit={handleAdjustCoins} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Amount (+ to Credit, - to Debit)
                </label>
                <input
                  type="number"
                  value={coinAdjustment.amount}
                  onChange={(e) => setCoinAdjustment({ ...coinAdjustment, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:border-blue-600 focus:bg-white focus:outline-hidden transition"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={coinAdjustment.reason}
                  onChange={(e) => setCoinAdjustment({ ...coinAdjustment, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-blue-600 focus:bg-white focus:outline-hidden transition"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustCoinsModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reset Championship Game?</h3>
              <p className="text-xs text-slate-500 mt-1">
                This will reset all team coin balances to 5,000, clear submitted answers and purchased lifelines, and return the competition to the Lobby.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  sendAdminCommand("admin:reset_game");
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Reset Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
