"use client";
import React, { useEffect, useState, useRef } from "react";
import { getSocketClient } from "@/src/lib/socketClient";
import { BullLogo } from "@/src/components/BullLogo";
import { CountdownTimer } from "@/src/components/CountdownTimer";
import { EventCountdown } from "@/src/components/EventCountdown";
import {
  Shield,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Trophy,
  Users,
  HelpCircle,
  Activity,
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
  Sparkles,
  ChevronRight,
  Upload,
  Download,
  Clock,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  GameState,
  TeamPublic,
  QuestionFull,
  QuestionCategory,
  LeaderboardEntry,
} from "@/src/types";

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [adminUsername, setAdminUsername] = useState("bigbulls");
  const [adminPassword, setAdminPassword] = useState("questions");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Streamlined Tabs: "live" (Event Control), "teams" (On-Spot Entry & Teams), "questions" (Question Pool & Edit), "leaderboard" (Standings)
  const [activeTab, setActiveTab] = useState<"live" | "teams" | "questions" | "leaderboard">("live");

  // Live Telemetry
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [teams, setTeams] = useState<TeamPublic[]>([]);
  const [questions, setQuestions] = useState<QuestionFull[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(240);
  const [isPaused, setIsPaused] = useState(false);
  const [answersMatrix, setAnswersMatrix] = useState<any[]>([]);

  // Search & Filter
  const [teamSearch, setTeamSearch] = useState("");

  // On-Spot Registration Form
  const [onSpotForm, setOnSpotForm] = useState<{
    name: string;
    teamCode: string;
    accessCode: string;
    startingBalance: number;
    members: string[];
  }>({
    name: "",
    teamCode: "",
    accessCode: "",
    startingBalance: 5000,
    members: [""],
  });
  const [recentlyCreatedTeam, setRecentlyCreatedTeam] = useState<{
    teamCode: string;
    name: string;
    accessCode: string;
    members?: string[];
  } | null>(null);

  // Modals
  const [showEditTeamModal, setShowEditTeamModal] = useState<TeamPublic | null>(null);
  const [editTeamForm, setEditTeamForm] = useState<{ name: string; newAccessCode: string; members: string[] }>({
    name: "",
    newAccessCode: "",
    members: [""],
  });

  // Question Add/Edit Modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState<{
    id?: string;
    text: string;
    category: QuestionCategory;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: "A" | "B" | "C" | "D";
    durationSeconds: number;
    hintText: string;
    visualClueUrl: string;
    explanation: string;
  }>({
    text: "",
    category: "General Knowledge",
    difficulty: "MEDIUM",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "A",
    durationSeconds: 300,
    hintText: "",
    visualClueUrl: "",
    explanation: "",
  });

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
      const [teamsRes, qRes] = await Promise.all([
        fetch("/api/admin/teams"),
        fetch("/api/admin/questions"),
      ]);

      if (teamsRes.ok) {
        const d = await teamsRes.json();
        setTeams(d.teams || []);
      }
      if (qRes.ok) {
        const d = await qRes.json();
        setQuestions(d.questions || []);
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

    const socket = getSocketClient(token || "admin", "admin");
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

  // Smooth 1-second countdown clock for admin dashboard
  useEffect(() => {
    const clockInterval = setInterval(() => {
      if (gameState?.status === "QUESTION_ACTIVE" && gameState.currentQuestion?.deadline) {
        const ms = new Date(gameState.currentQuestion.deadline).getTime();
        setRemainingSeconds(Math.max(0, Math.ceil((ms - Date.now()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(clockInterval);
  }, [gameState]);

  // Unconditional HTTP Polling Fallback (ensures live telemetry updates across Vercel Lambdas)
  useEffect(() => {
    if (!authenticated) return;
    const pollInterval = setInterval(async () => {
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
    }, 1500);
    return () => clearInterval(pollInterval);
  }, [authenticated]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Auto-generate next suggested code
  const getNextSuggestedCode = () => {
    let maxNum = 100;
    for (const t of teams) {
      const match = t.teamCode.match(/BULLS-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `BULLS-${maxNum + 1}`;
  };

  // On-Spot Quick Team Registration
  const handleOnSpotCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = (onSpotForm.teamCode.trim() || getNextSuggestedCode()).toUpperCase();
    const pass = onSpotForm.accessCode.trim() || code;
    const cleanMembers = onSpotForm.members.map((m) => m.trim()).filter(Boolean);
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamCode: code,
        name: onSpotForm.name.trim(),
        accessCode: pass,
        startingBalance: onSpotForm.startingBalance || 5000,
        members: cleanMembers,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setTeams((prev) => [...prev, data.team]);
      setRecentlyCreatedTeam({
        teamCode: code,
        name: onSpotForm.name.trim(),
        accessCode: pass,
        members: cleanMembers,
      });
      setOnSpotForm({ name: "", teamCode: "", accessCode: "", startingBalance: 5000, members: [""] });
      loadInitialData();
    } else {
      alert(data.error || "Failed to create team");
    }
  };

  // Save Team Edits (Name, Members & New Access Code)
  const handleSaveTeamEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditTeamModal) return;
    try {
      const cleanMembers = editTeamForm.members.map((m) => m.trim()).filter(Boolean);
      await fetch("/api/admin/teams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showEditTeamModal.id,
          name: editTeamForm.name.trim(),
          members: cleanMembers,
        }),
      });

      if (editTeamForm.newAccessCode.trim()) {
        await fetch("/api/admin/teams", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: showEditTeamModal.id,
            action: "reset_code",
            newAccessCode: editTeamForm.newAccessCode.trim(),
          }),
        });
      }
      setShowEditTeamModal(null);
      loadInitialData();
    } catch (err: any) {
      alert(err.message || "Failed to update team");
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
    } else {
      const data = await res.json();
      alert(data.error || "Failed to adjust coins");
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    const res = await fetch(`/api/admin/questions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    }
  };

  // Open Question Create Modal
  const openCreateQuestion = () => {
    setQuestionForm({
      text: "",
      category: "General Knowledge",
      difficulty: "MEDIUM",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "A",
      durationSeconds: 300,
      hintText: "",
      visualClueUrl: "",
      explanation: "",
    });
    setShowQuestionModal(true);
  };

  // Open Question Edit Modal
  const openEditQuestion = (q: QuestionFull) => {
    setQuestionForm({
      id: q.id,
      text: q.text,
      category: q.category || "General Knowledge",
      difficulty: q.difficulty || "MEDIUM",
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      durationSeconds: q.durationSeconds || 300,
      hintText: q.hintText || "",
      visualClueUrl: q.visualClueUrl || "",
      explanation: q.explanation || "",
    });
    setShowQuestionModal(true);
  };

  // Save Question (Create or Edit)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (questionForm.id) {
        // Edit
        const res = await fetch("/api/admin/questions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(questionForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update question");
      } else {
        // Create
        const res = await fetch("/api/admin/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(questionForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create question");
      }
      setShowQuestionModal(false);
      loadInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CSV Export & Import
  const handleExportCSV = () => {
    window.open("/api/admin/questions/export", "_blank");
  };

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

  // Filtered Teams
  const filteredTeams = teams.filter((t) => {
    if (!teamSearch.trim()) return true;
    const q = teamSearch.toLowerCase();
    return (
      t.teamCode.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.members && t.members.some((m) => m.toLowerCase().includes(q)))
    );
  });

  // Render Login Overlay if not authenticated
  if (authenticated === false) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white font-sans">
        <main className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-6">
          <BullLogo size="lg" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">ADMIN COMMAND CENTER</h1>
            <p className="text-xs text-slate-500 mt-1">Authorized personnel login for live event host controls.</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Admin Username
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:border-blue-600 outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Master Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:border-blue-600 outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
            >
              {loginLoading ? <span>Authenticating...</span> : <span>Unlock Command Center</span>}
            </button>
          </form>
        </main>
      </div>
    );
  }

  if (authenticated === null) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const status = gameState?.status || "LOBBY";
  const currentQ = gameState?.currentQuestion;

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans">
      {/* Top Clean Header - No Green Postgres Banner */}
      <header className="border-b border-slate-200/80 px-4 sm:px-6 py-2.5 bg-white sticky top-0 z-40 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <BullLogo size="sm" />
          <div className="hidden sm:block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Host Command Center
            </span>
          </div>
        </div>

        {/* Live Status Badge & Header Actions */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full font-mono text-[10.5px] font-extrabold flex items-center gap-1.5 ${
              status === "QUESTION_ACTIVE"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                : status === "QUESTION_PAUSED"
                ? "bg-amber-50 text-amber-800 border border-amber-300"
                : status === "ANSWER_REVEAL"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{status.replace("_", " ")}</span>
          </span>

          {/* Question Active Timer Pill */}
          {status === "QUESTION_ACTIVE" && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 font-mono text-xs font-black text-blue-700">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, "0")}
              </span>
            </div>
          )}

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition cursor-pointer"
            title="Reset Game to Lobby"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Reset Event</span>
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

      {/* Simplified, Clean Navigation Tabs */}
      <div className="border-b border-slate-200/80 bg-white px-4 sm:px-6 py-2 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
        {[
          { key: "live", label: "Event Control", icon: Play },
          { key: "teams", label: "On-Spot Entry & Squads", icon: Users },
          { key: "questions", label: "Question Pool & Edit", icon: HelpCircle },
          { key: "leaderboard", label: "Live Leaderboard", icon: Trophy },
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
            </button>
          );
        })}
      </div>

      {/* Main Command Workspace */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
        {/* ========================================================= */}
        {/* TAB 1: EVENT CONTROL & START BUTTON */}
        {/* ========================================================= */}
        {activeTab === "live" && (
          <div className="space-y-5">
            {/* PRE-EVENT LOBBY STATE (WITH EVENT COUNTDOWN & START BUTTON) */}
            {(status === "LOBBY" || status === "READY") && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-blue-200/90 shadow-sm text-center space-y-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    Live Event Standby
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
                    The Big Bull Championship
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                    Event is scheduled for <strong>16 October, 11:30 AM</strong>. Click the button below whenever you are ready to open Round 1.
                  </p>
                </div>

                {/* Event Countdown Component */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 max-w-lg mx-auto">
                  <EventCountdown size="lg" showDateBadge={true} />
                </div>

                {/* Prominent Start Event Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => sendAdminCommand("admin:start_game")}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 cursor-pointer transition min-h-[52px]"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>🚀 Start Live Event Now (Round 1)</span>
                  </button>
                </div>

                {/* Live Connected Telemetry Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 max-w-2xl mx-auto font-mono">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-2xl font-black text-slate-900">{teams.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase mt-0.5">Registered Squads</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-2xl font-black text-blue-600">
                      {gameState?.connectedTeamsCount || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase mt-0.5">Connected Now</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-2xl font-black text-slate-900">{questions.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase mt-0.5">Total Questions</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-2xl font-black text-emerald-600">5,000</div>
                    <div className="text-[10px] text-slate-500 uppercase mt-0.5">Starting Coins</div>
                  </div>
                </div>
              </div>
            )}

            {/* ACTIVE QUIZ QUESTION CONTROLS */}
            {status !== "LOBBY" && status !== "READY" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Current Question & Timer Card */}
                  <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                          Question #{(gameState?.currentQuestionIndex ?? 0) + 1} of {questions.length}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {currentQ?.question?.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-700">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>
                          {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, "0")} Remaining
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 leading-snug">
                      {currentQ?.question?.text || "Question Details Loading..."}
                    </h3>

                    {/* Question Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      {["A", "B", "C", "D"].map((opt) => (
                        <div
                          key={opt}
                          className={`p-3 rounded-xl border flex items-center gap-2 ${
                            status === "ANSWER_REVEAL" && currentQ?.correctOption === opt
                              ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center font-bold text-blue-700 shrink-0">
                            {opt}
                          </span>
                          <span className="truncate">{(currentQ?.question as any)?.[`option${opt}`]}</span>
                        </div>
                      ))}
                    </div>

                    {status === "ANSWER_REVEAL" && currentQ?.explanation && (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                        <strong>Explanation:</strong> {currentQ.explanation}
                      </div>
                    )}
                  </div>

                  {/* Stage Control Action Buttons */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                        Host Stage Controls
                      </h4>
                      <div className="space-y-2">
                        {status === "QUESTION_ACTIVE" && (
                          <>
                            <button
                              onClick={() => sendAdminCommand("admin:pause_game")}
                              className="w-full py-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider cursor-pointer transition flex items-center justify-center gap-2"
                            >
                              <Pause className="w-4 h-4" />
                              <span>Pause Timer</span>
                            </button>
                            <button
                              onClick={() => sendAdminCommand("admin:close_question")}
                              className="w-full py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs uppercase tracking-wider cursor-pointer transition"
                            >
                              Close Submissions
                            </button>
                            <button
                              onClick={() => sendAdminCommand("admin:reveal_answer")}
                              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs cursor-pointer transition"
                            >
                              Reveal Correct Answer
                            </button>
                          </>
                        )}

                        {status === "QUESTION_PAUSED" && (
                          <button
                            onClick={() => sendAdminCommand("admin:resume_game")}
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs cursor-pointer transition flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            <span>Resume Timer</span>
                          </button>
                        )}

                        {(status === "ANSWER_REVEAL" || status === "QUESTION_CLOSED") && (
                          <>
                            <button
                              onClick={() => sendAdminCommand("admin:next_question")}
                              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 cursor-pointer transition flex items-center justify-center gap-2"
                            >
                              <span>Next Question</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => sendAdminCommand("admin:show_leaderboard")}
                              className="w-full py-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs uppercase cursor-pointer transition"
                            >
                              Show Leaderboard on Board
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Submissions Received:</span>
                      <strong className="text-slate-900 font-mono">
                        {answersMatrix.length} / {teams.length}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Confidential Live Answer Matrix */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-blue-600" />
                      <span>Live Squad Responses (Host Monitor)</span>
                    </h4>
                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      {answersMatrix.length} Submitted
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {teams.map((t) => {
                      const ans = answersMatrix.find((a: any) => a.teamId === t.id);
                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                            ans
                              ? "bg-blue-50/80 border-blue-300 text-slate-900 shadow-2xs"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                          }`}
                        >
                          <div className="font-bold truncate text-slate-900">{t.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t.teamCode}</div>
                          <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-between font-mono">
                            <span className="text-[10px] text-slate-500">Choice:</span>
                            <span
                              className={`font-black text-sm ${
                                ans ? "text-blue-700 font-bold" : "text-slate-400"
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
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ON-SPOT ENTRY & REGISTERED SQUADS (ZERO OVERFLOW) */}
        {/* ========================================================= */}
        {activeTab === "teams" && (
          <div className="space-y-6">
            {/* On-Spot Walk-In Registration Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-blue-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      ⚡ On-Spot Walk-In Team Registration
                    </h4>
                    <p className="text-xs text-slate-500">
                      Register walk-in participants in 5 seconds and issue their login credentials.
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 font-bold">
                  Next Auto Code: {getNextSuggestedCode()}
                </span>
              </div>

              <form onSubmit={handleOnSpotCreate} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Team / Squad Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Predators"
                      value={onSpotForm.name}
                      onChange={(e) => setOnSpotForm({ ...onSpotForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-blue-600 outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Team Code
                    </label>
                    <input
                      type="text"
                      placeholder={getNextSuggestedCode()}
                      value={onSpotForm.teamCode}
                      onChange={(e) => setOnSpotForm({ ...onSpotForm, teamCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-blue-600 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Access Code (Auto-Matches)
                    </label>
                    <input
                      type="text"
                      placeholder="Same as Team Code"
                      value={onSpotForm.accessCode}
                      onChange={(e) => setOnSpotForm({ ...onSpotForm, accessCode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-blue-600 outline-none transition"
                    />
                  </div>
                </div>

                {/* Dynamic Participants list */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Team Members / Participants ({onSpotForm.members.length} {onSpotForm.members.length === 1 ? "Member (Solo)" : "Members"})</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setOnSpotForm({ ...onSpotForm, members: [...onSpotForm.members, ""] })}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Participant</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {onSpotForm.members.map((member, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder={`Participant #${idx + 1} Name`}
                          value={member}
                          onChange={(e) => {
                            const updated = [...onSpotForm.members];
                            updated[idx] = e.target.value;
                            setOnSpotForm({ ...onSpotForm, members: updated });
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:border-blue-600 outline-none transition"
                        />
                        {onSpotForm.members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = onSpotForm.members.filter((_, i) => i !== idx);
                              setOnSpotForm({ ...onSpotForm, members: updated });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Remove Participant"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    💡 If solo participant, leave as 1. For 2, 3 or more members, click <strong>+ Add Participant</strong>.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>⚡ Register Squad & Issue Pass</span>
                  </button>
                </div>
              </form>

              {/* Instant Team Pass Notice */}
              {recentlyCreatedTeam && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-slate-800 space-y-0.5">
                      <div>
                        <strong>{recentlyCreatedTeam.name}</strong> registered! Code:{" "}
                        <code className="font-mono font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                          {recentlyCreatedTeam.teamCode}
                        </code>{" "}
                        • Password:{" "}
                        <code className="font-mono font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                          {recentlyCreatedTeam.accessCode}
                        </code>
                      </div>
                      {recentlyCreatedTeam.members && recentlyCreatedTeam.members.length > 0 && (
                        <div className="text-[11px] text-slate-600 flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-600" />
                          <span>Members: <strong>{recentlyCreatedTeam.members.join(", ")}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const memberInfo =
                        recentlyCreatedTeam.members && recentlyCreatedTeam.members.length > 0
                          ? `\nMembers: ${recentlyCreatedTeam.members.join(", ")}`
                          : "";
                      navigator.clipboard.writeText(
                        `THE BIG BULL - Team Login Credentials\nSquad: ${recentlyCreatedTeam.name}\nTeam Code: ${recentlyCreatedTeam.teamCode}\nAccess Code: ${recentlyCreatedTeam.accessCode}${memberInfo}\nURL: https://the-big-bull.vercel.app/`
                      );
                      alert("Team credentials & member pass copied to clipboard!");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shrink-0 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Team Pass</span>
                  </button>
                </div>
              )}
            </div>

            {/* Registered Teams Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registered Teams & Credentials</h3>
                <p className="text-xs text-slate-500">
                  Total squads: {teams.length} • Manage accounts, edit participants, or reset strikes.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by code, name, or member..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:border-blue-600 outline-none transition"
                />
              </div>
            </div>

            {/* ZERO OVERFLOW REGISTERED TEAMS - DESKTOP VIEW */}
            <div className="hidden md:block rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-4 w-5/12">Squad & Participants</th>
                    <th className="py-3 px-3 w-2/12 text-center">Status</th>
                    <th className="py-3 px-3 w-2/12 text-center">Anti-Cheat Strikes</th>
                    <th className="py-3 px-3 w-1/12 text-center">Score / Coins</th>
                    <th className="py-3 px-4 w-2/12 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTeams.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                            {t.teamCode}
                          </span>
                          <button
                            onClick={() => copyCode(t.teamCode)}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Copy Team Code"
                          >
                            {copiedCode === t.teamCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <strong className="text-slate-900 font-semibold">{t.name}</strong>
                        </div>
                        {t.members && t.members.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <span className="text-[10.5px] text-slate-500 flex items-center gap-1">
                              <Users className="w-2.5 h-2.5 text-blue-500" />
                              {t.members.join(", ")}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.isDisqualified
                              ? "bg-red-50 text-red-700 border border-red-200"
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
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              t.isDisqualified || (t.strikesCount ?? 0) >= 3
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : (t.strikesCount ?? 0) > 0
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {t.isDisqualified ? "3/3 DISQUALIFIED" : `${t.strikesCount ?? 0}/3 STRIKES`}
                          </span>
                          {((t.strikesCount ?? 0) > 0 || t.isDisqualified) && (
                            <button
                              onClick={() => handleResetStrikes(t)}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              Reset Strikes
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <div className="font-bold text-slate-900 text-xs">{t.score} pts</div>
                        <div className="text-[10.5px] text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                          <span>🪙</span>
                          <span>{t.currentBalance.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setShowEditTeamModal(t);
                              setEditTeamForm({
                                name: t.name,
                                newAccessCode: "",
                                members: t.members && t.members.length > 0 ? t.members : [""],
                              });
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition cursor-pointer"
                            title="Edit Squad & Members"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setShowAdjustCoinsModal(t);
                              setCoinAdjustment({ amount: 500, reason: "Admin Discretion" });
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 hover:text-amber-700 text-slate-600 transition cursor-pointer"
                            title="Adjust Coins"
                          >
                            <Coins className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleDisableTeam(t)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              t.isDisabled
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            }`}
                            title={t.isDisabled ? "Enable Team" : "Disable Team"}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ZERO OVERFLOW REGISTERED TEAMS - MOBILE CARD LIST */}
            <div className="md:hidden space-y-3">
              {filteredTeams.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                          {t.teamCode}
                        </span>
                        <button
                          onClick={() => copyCode(t.teamCode)}
                          className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                        >
                          {copiedCode === t.teamCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{t.name}</h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        t.isDisqualified
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : t.isDisabled
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : t.connectionStatus === "CONNECTED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {t.isDisqualified ? "DISQUALIFIED" : t.isDisabled ? "DISABLED" : t.connectionStatus}
                    </span>
                  </div>

                  {t.members && t.members.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-500">Participants:</span>
                      <span>{t.members.join(", ")}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center font-mono">
                    <div>
                      <div className="text-[10px] uppercase text-slate-400 font-sans">Score</div>
                      <div className="font-black text-slate-900 text-xs">{t.score} pts</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-400 font-sans">Coin Stash</div>
                      <div className="font-black text-amber-600 text-xs">🪙 {t.currentBalance.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          t.isDisqualified || (t.strikesCount ?? 0) >= 3
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : (t.strikesCount ?? 0) > 0
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {t.isDisqualified ? "DISQUALIFIED" : `${t.strikesCount ?? 0}/3 STRIKES`}
                      </span>
                      {((t.strikesCount ?? 0) > 0 || t.isDisqualified) && (
                        <button
                          onClick={() => handleResetStrikes(t)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setShowEditTeamModal(t);
                          setEditTeamForm({
                            name: t.name,
                            newAccessCode: "",
                            members: t.members && t.members.length > 0 ? t.members : [""],
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowAdjustCoinsModal(t);
                          setCoinAdjustment({ amount: 500, reason: "Admin Discretion" });
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600"
                        title="Adjust Coins"
                      >
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                      <button
                        onClick={() => handleToggleDisableTeam(t)}
                        className={`p-1.5 rounded-lg border ${
                          t.isDisabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-400 border-slate-200"
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: QUESTION MANAGEMENT & EDIT */}
        {/* ========================================================= */}
        {activeTab === "questions" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Question Management & Edit</h3>
                <p className="text-xs text-slate-500">
                  Total questions: {questions.length} • Edit questions, answers, points, and lifeline clues.
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
                  onClick={openCreateQuestion}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase shadow-xs cursor-pointer transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New Question</span>
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
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-[10px] text-blue-700 font-bold">
                        {q.difficulty}
                      </span>
                      <button
                        onClick={() => openEditQuestion(q)}
                        className="text-slate-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                        title="Edit Question"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
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

        {/* ========================================================= */}
        {/* TAB 4: LEADERBOARD */}
        {/* ========================================================= */}
        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Championship Leaderboard</h3>
              <p className="text-xs text-slate-500">Live rankings based on correct answers, response speeds, and points.</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Squad Name</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-center">Accuracy</th>
                    <th className="py-3 px-4 text-right">Coins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No scores recorded yet. Points will populate as rounds finish.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((lb) => (
                      <tr key={lb.teamId} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 text-center font-mono font-black text-slate-900">
                          #{lb.rank}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">{lb.teamName}</span>
                          <span className="text-[10px] font-mono text-slate-400 ml-2">{lb.teamCode}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-blue-700 text-sm">
                          {lb.score}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {lb.correctAnswers} / {lb.attemptedQuestions}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                          🪙 {lb.currentBalance?.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* QUESTION CREATE / EDIT MODAL */}
      {/* ========================================================= */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {questionForm.id ? "Edit Question" : "Create New Question"}
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Question Text *</label>
                <textarea
                  rows={2}
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  placeholder="Enter question text..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-blue-600 focus:bg-white outline-none transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <select
                    value={questionForm.category}
                    onChange={(e: any) => setQuestionForm({ ...questionForm, category: e.target.value as QuestionCategory })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-blue-600 outline-none"
                  >
                    <option value="General Knowledge">General Knowledge</option>
                    <option value="Space">Space</option>
                    <option value="Basic Technical Concepts">Basic Technical Concepts</option>
                    <option value="Science and Technology">Science and Technology</option>
                    <option value="Logical Thinking">Logical Thinking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Difficulty</label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e: any) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-blue-600 outline-none"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block text-slate-700 font-bold">Answer Options (A, B, C, D) *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">Option A</label>
                    <input
                      type="text"
                      value={questionForm.optionA}
                      onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-blue-600 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">Option B</label>
                    <input
                      type="text"
                      value={questionForm.optionB}
                      onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-blue-600 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">Option C</label>
                    <input
                      type="text"
                      value={questionForm.optionC}
                      onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-blue-600 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">Option D</label>
                    <input
                      type="text"
                      value={questionForm.optionD}
                      onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-blue-600 outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Correct Option & Points */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Correct Answer *</label>
                  <select
                    value={questionForm.correctOption}
                    onChange={(e: any) => setQuestionForm({ ...questionForm, correctOption: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs focus:border-emerald-600 outline-none"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Time Limit (Seconds)</label>
                  <input
                    type="number"
                    value={questionForm.durationSeconds}
                    onChange={(e) => setQuestionForm({ ...questionForm, durationSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Hint & Lifeline Clues */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  💡 Hint Text (Unlocked via Bull's Hint Lifeline)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Look at the balance sheet debt-to-equity ratio..."
                  value={questionForm.hintText}
                  onChange={(e) => setQuestionForm({ ...questionForm, hintText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Explanation (Shown after Reveal)</label>
                <textarea
                  rows={2}
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Explanation of the correct answer..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  {questionForm.id ? "Save Changes" : "Create Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditTeamModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Squad: {showEditTeamModal.teamCode}
                </h3>
                <p className="text-xs text-slate-500">
                  Update team name, participants list, or reset login code.
                </p>
              </div>
              <button
                onClick={() => setShowEditTeamModal(null)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Squad Name</label>
                <input
                  type="text"
                  value={editTeamForm.name}
                  onChange={(e) => setEditTeamForm({ ...editTeamForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-blue-600 focus:bg-white outline-none transition"
                  required
                />
              </div>

              {/* Dynamic Participants list */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Participants ({editTeamForm.members.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditTeamForm({ ...editTeamForm, members: [...editTeamForm.members, ""] })}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Member</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {editTeamForm.members.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder={`Participant #${idx + 1}`}
                        value={member}
                        onChange={(e) => {
                          const updated = [...editTeamForm.members];
                          updated[idx] = e.target.value;
                          setEditTeamForm({ ...editTeamForm, members: updated });
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:border-blue-600 outline-none transition"
                      />
                      {editTeamForm.members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editTeamForm.members.filter((_, i) => i !== idx);
                            setEditTeamForm({ ...editTeamForm, members: updated });
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  New Secret Access Code (Leave blank to keep existing)
                </label>
                <input
                  type="text"
                  placeholder="Enter new secret password"
                  value={editTeamForm.newAccessCode}
                  onChange={(e) => setEditTeamForm({ ...editTeamForm, newAccessCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:border-blue-600 focus:bg-white outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditTeamModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition cursor-pointer"
                >
                  Save Changes
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:border-blue-600 focus:bg-white outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={coinAdjustment.reason}
                  onChange={(e) => setCoinAdjustment({ ...coinAdjustment, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-blue-600 focus:bg-white outline-none transition"
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
