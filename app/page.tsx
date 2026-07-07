"use client";

import * as React from "react";
import {
  BookOpen, MessageSquare, Map, Download, Upload,
  RotateCcw, Trophy, Zap, Flame, Play, ExternalLink, Youtube,
  Globe, Sparkles, XCircle, Loader2, CheckCircle2, AlertCircle,
  Lock, ChevronRight, Star, Target, BarChart3, Settings, User,
  Home as HomeIcon, ChevronDown, Volume2,
  HelpCircle, Clock, Search, Shield,
} from "lucide-react";
import { CURRICULUM, getLessonByDay, PHASES, getPhaseForDay, getLessonsInPhase } from "@/lib/curriculum";
import ChatPanel from "@/components/chat/ChatPanel";
import { useLearnerState, getStorageKey } from "@/hooks/useLearnerState";
import type { LearnerState, ChatMessage, YouTubeResult, WebResult, QuizQuestion } from "@/types";
import { STUDENT_PROFILES, getDeviceId } from "@/types";
import VideoPlayerModal, { type VideoPlayerTarget } from "@/components/VideoPlayerModal";
import type { StudentId, AdminSession } from "@/types";
import { checkPassword, savePassword, saveDeviceId, getSavedDeviceId, generateDeviceId, isDeviceLinked, firebaseLogin, logoutStudent, changePassword } from "@/lib/auth";
import { MODEL_ASSIGNMENTS } from "@/constants/models";
import AdminPanel from "@/components/admin/AdminPanel";
import type { AdminCurriculumState, AdminDayContent } from "@/types";
import { loadCurriculumFromFirestore } from "@/lib/firebase-sync";
import CalendarHeatmap from "@/components/student/CalendarHeatmap";
import AchievementPanel from "@/components/student/AchievementPanel";
import SmartReview from "@/components/student/SmartReview";
import LearningPath from "@/components/student/LearningPath";
import BookmarkPanel, { type BookmarkItem } from "@/components/student/BookmarkPanel";
import DailyGoalTracker from "@/components/student/DailyGoalTracker";
import OnboardingFlow from "@/components/student/OnboardingFlow";
import DayLinkView from "@/components/student/DayLinkView";
import PeriodicTest from "@/components/student/PeriodicTest";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ResourceSection {
  hindiVideos: YouTubeResult[];
  englishVideos: YouTubeResult[];
  webArticles: WebResult[];
}
interface QuizData { title: string; questions: QuizQuestion[]; }
interface EvalFeedback {
  questionId: string; isCorrect: boolean;
  correctAnswer: string; studentAnswer: string; explanation: string;
}
interface EvalResult {
  passed: boolean; overallScore: number; totalQuestions?: number; correctCount?: number;
  feedback: EvalFeedback[]; weakTopicsAdded: string[]; mentorMessage: string;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function ConfettiEffect({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = React.useState<Array<{
    id: number; x: number; color: string; size: number; duration: number; delay: number;
  }>>([]);

  React.useEffect(() => {
    if (!trigger) return;
    const colors = ["#6366f1","#10b981","#f59e0b","#ec4899","#22d3ee","#a78bfa","#34d399"];
    const ps = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 0.8,
    }));
    setParticles(ps);
    const t = setTimeout(() => setParticles([]), 4000);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}

// ─── Resource-leak sanitizer ────────────────────────────────────────────────
// Defense-in-depth: strips any "Recommended Resources"-style section that a
// model may have leaked into the lesson body (also covers lessons cached
// before the server-side filter existed). The app always renders real,
// clickable video/article cards separately — text lists are never needed.
const LEAKED_RESOURCE_HEADING = /^(#{1,6}\s.*|📎.*|\*\*[^*]{1,80}\*\*)$/;
const LEAKED_RESOURCE_KEYWORDS = /(recommended|suggested|useful|helpful|extra)\s+resources\b|\breferences\b|\buseful\s+links\b/i;
const LEAKED_RESOURCE_PROSE = /(use only these|real,?\s*verified resources|best hindi\/?hinglish youtube|best english youtube|practice site\b|quiz site\b)/i;

function stripLeakedResources(text: string): string {
  if (!text) return text;
  const lines = text.split("\n");
  let cutAt = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (LEAKED_RESOURCE_PROSE.test(trimmed)) { cutAt = i; break; }
    if (LEAKED_RESOURCE_HEADING.test(trimmed) && LEAKED_RESOURCE_KEYWORDS.test(trimmed)) { cutAt = i; break; }
  }
  return cutAt === -1 ? text : lines.slice(0, cutAt).join("\n").trimEnd();
}

// ─── Inline Text Renderer ─────────────────────────────────────────────────────
function InlineText({ text }: { text: string }) {
  if (!text) return null;
  const boldParts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return (
    <>
      {boldParts.map((part, i) => {
        if (i % 2 === 1)
          return <strong key={i} style={{ color: "var(--brand2)", fontWeight: 700 }}>{part}</strong>;
        const codeParts = part.split(/`([^`]+)`/g);
        return (
          <React.Fragment key={i}>
            {codeParts.map((sub, j) =>
              j % 2 === 1 ? (
                <code key={j} style={{
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 5, padding: "0.1em 0.45em", color: "var(--cyan)",
                  fontFamily: "monospace", fontSize: "0.82em",
                }}>{sub}</code>
              ) : sub,
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

// ─── Markdown Viewer ──────────────────────────────────────────────────────────
function MarkdownViewer({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactElement[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let ulGroup: string[] = [];
  let olGroup: Array<{ num: string; content: string }> = [];

  const flushUl = () => {
    if (!ulGroup.length) return;
    blocks.push(
      <ul key={blocks.length} style={{ listStyle: "none", padding: 0, margin: "8px 0" }}>
        {ulGroup.map((item, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6, fontSize: "0.92rem", lineHeight: 1.65, color: "var(--text2)" }}>
            <span style={{ marginTop: 9, width: 7, height: 7, borderRadius: "50%", background: "var(--brand)", flexShrink: 0, display: "inline-block" }} />
            <span><InlineText text={item} /></span>
          </li>
        ))}
      </ul>
    );
    ulGroup = [];
  };

  const flushOl = () => {
    if (!olGroup.length) return;
    blocks.push(
      <ol key={blocks.length} style={{ listStyle: "none", padding: 0, margin: "8px 0" }}>
        {olGroup.map((item, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6, fontSize: "0.92rem", lineHeight: 1.65, color: "var(--text2)" }}>
            <span style={{ marginTop: 2, minWidth: 24, height: 24, borderRadius: "50%", background: "var(--brand-glow)", color: "var(--brand2)", fontSize: "0.72rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {item.num}
            </span>
            <span><InlineText text={item.content} /></span>
          </li>
        ))}
      </ol>
    );
    olGroup = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push(
          <pre key={blocks.length} style={{
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "14px 16px", fontFamily: "monospace",
            fontSize: "0.82rem", overflowX: "auto", margin: "10px 0", color: "var(--cyan)",
          }}>
            {codeLines.join("\n")}
          </pre>
        );
        codeLines = []; inCode = false;
      } else { flushUl(); flushOl(); inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith("> ")) {
      flushUl(); flushOl();
      blocks.push(
        <blockquote key={blocks.length} style={{
          borderLeft: "3px solid var(--brand)", padding: "10px 16px", margin: "10px 0",
          background: "var(--brand-glow)", borderRadius: "0 10px 10px 0",
          fontStyle: "italic", color: "var(--text2)", fontSize: "0.9rem",
        }}>
          <InlineText text={line.slice(2)} />
        </blockquote>
      );
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      flushUl(); flushOl();
      const level = line.match(/^(#+)/)?.[1].length ?? 1;
      const content = line.replace(/^#+\s/, "");
      const sizes = ["1.4rem", "1.1rem", "0.95rem"];
      blocks.push(
        <div key={blocks.length} style={{
          fontSize: sizes[level - 1] ?? "0.95rem", fontWeight: level === 1 ? 800 : 700,
          color: level === 3 ? "var(--brand2)" : "var(--text)",
          margin: level === 1 ? "0 0 14px" : level === 2 ? "22px 0 8px" : "16px 0 6px",
          lineHeight: 1.3,
        }}>
          <InlineText text={content} />
        </div>
      );
      continue;
    }

    const liMatch = line.match(/^[-*]\s+(.+)/);
    if (liMatch) { flushOl(); ulGroup.push(liMatch[1]); continue; }

    const olMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (olMatch) { flushUl(); olGroup.push({ num: olMatch[1], content: olMatch[2] }); continue; }

    if (line.startsWith("---")) {
      flushUl(); flushOl();
      blocks.push(<hr key={blocks.length} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />);
      continue;
    }

    flushUl(); flushOl();

    if (line.trim() === "") {
      blocks.push(<div key={blocks.length} style={{ height: 8 }} />);
    } else {
      blocks.push(
        <p key={blocks.length} style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--text2)", margin: "4px 0" }}>
          <InlineText text={line} />
        </p>
      );
    }
  }
  flushUl(); flushOl();

  return <div className="prose-lesson">{blocks}</div>;
}

// ─── YouTube Card ──────────────────────────────────────────────────────────────
function YouTubeCard({ video, label, onSummarize, onWatch }: {
  video: YouTubeResult; label: string;
  onSummarize: (id: string, title: string) => void;
  onWatch: (id: string, title: string, channel: string) => void;
}) {
  const channelName = video.channelName ?? (video as any).channelTitle ?? "";
  const fallbackUrl = video.url ?? `https://youtube.com/watch?v=${video.videoId}`;
  const videoId = video.videoId ?? (() => { try { return new URL(fallbackUrl).searchParams.get("v") ?? ""; } catch { return ""; } })();
  const thumb = video.thumbnail ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className="yt-card">
      <div className="relative" style={{ aspectRatio: "16/9" }}>
        <img src={thumb} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <span className={`badge ${label === "हिंदी" ? "badge-pink" : "badge-cyan"}`}>
            {label === "हिंदी" ? "🇮🇳 हिंदी" : "🌍 English"}
          </span>
        </div>
        {/* Click thumbnail → open in-app player */}
        {videoId ? (
          <button
            onClick={() => onWatch(videoId, video.title, channelName)}
            style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(0,0,0,0.2)", border: "none", cursor: "pointer",
            }}
          >
            <div style={{
              width: 44, height: 44, background: "rgba(0,0,0,0.75)", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid rgba(255,255,255,0.4)",
            }}>
              <Play size={18} fill="#fff" color="#fff" style={{ marginLeft: 2 }} />
            </div>
          </button>
        ) : (
          <a href={fallbackUrl} target="_blank" rel="noopener noreferrer"
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ width: 44, height: 44, background: "rgba(0,0,0,0.75)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.4)" }}>
              <Play size={18} fill="#fff" color="#fff" style={{ marginLeft: 2 }} />
            </div>
          </a>
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.35, marginBottom: 4 }}>
          {video.title.length > 70 ? video.title.slice(0, 70) + "…" : video.title}
        </p>
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 8 }}>
          <Youtube size={10} style={{ display: "inline", marginRight: 3, color: "#ef4444" }} />
          {channelName}
        </p>
        <div style={{ display: "flex", gap: 5 }}>
          {/* Watch (in-app player) */}
          {videoId && (
            <button
              onClick={() => onWatch(videoId, video.title, channelName)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "6px 8px", background: "var(--brand)", color: "#fff",
                border: "none", borderRadius: 8, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              <Play size={10} fill="#fff" /> Watch
            </button>
          )}
          {/* Chat with Video */}
          {videoId && (
            <button
              onClick={() => onSummarize(videoId, video.title)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "6px 8px", background: "var(--brand-glow)", color: "var(--brand2)",
                border: "1px solid var(--brand)", borderRadius: 8, fontSize: "0.72rem", fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <MessageSquare size={10} /> Chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Web Article Card ─────────────────────────────────────────────────────────
function WebArticleCard({ article }: { article: WebResult }) {
  const desc = article.description ?? article.snippet ?? "";
  return (
    <a
      href={article.url} target="_blank" rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div className="card-sm card-hover" style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ marginTop: 1, flexShrink: 0 }}>
            {article.source === "wikipedia"
              ? <Globe size={14} style={{ color: "var(--cyan)" }} />
              : <Search size={14} style={{ color: "var(--brand)" }} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.35, marginBottom: 3 }}>
              {article.title}
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              {desc.length > 100 ? desc.slice(0, 100) + "…" : desc}
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}

// ─── Resource Explorer Side Panel (Videos + Blogs & Links) ──────────────────
function ResourceExplorer({ resources, onClose, onSummarize, onWatch, initialTab = "videos" }: {
  resources: ResourceSection; onClose: () => void;
  onSummarize: (id: string, title: string) => void;
  onWatch: (id: string, title: string, channel: string) => void;
  initialTab?: "videos" | "articles";
}) {
  const [tab, setTab] = React.useState<"videos" | "articles">(initialTab);
  const videoCount = (resources.hindiVideos?.length ?? 0) + (resources.englishVideos?.length ?? 0);
  const articleCount = resources.webArticles?.length ?? 0;

  return (
    <div
      className="scale-in"
      style={{
        position: "fixed", right: 0, top: 0, bottom: 0, zIndex: 55,
        width: "min(360px, 100vw)", display: "flex", flexDirection: "column",
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        boxShadow: "-6px 0 32px rgba(0,0,0,0.35)",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <Youtube size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
        <p style={{ flex: 1, fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>
          Lesson Resources
        </p>
        <button className="btn-icon" onClick={onClose} title="Close panel">
          <XCircle size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <button
          onClick={() => setTab("videos")}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            padding: "10px 8px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            border: "none", borderBottom: "2px solid transparent",
            background: tab === "videos" ? "var(--surface2)" : "transparent",
            color: tab === "videos" ? "var(--brand2)" : "var(--text-muted)",
            borderBottomColor: tab === "videos" ? "var(--brand)" : "transparent",
          }}
        >
          🎥 Videos {videoCount > 0 && <span className="badge badge-cyan">{videoCount}</span>}
        </button>
        <button
          onClick={() => setTab("articles")}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            padding: "10px 8px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            border: "none", borderBottom: "2px solid transparent",
            background: tab === "articles" ? "var(--surface2)" : "transparent",
            color: tab === "articles" ? "var(--brand2)" : "var(--text-muted)",
            borderBottomColor: tab === "articles" ? "var(--brand)" : "transparent",
          }}
        >
          🌐 Blogs & Links {articleCount > 0 && <span className="badge badge-pink">{articleCount}</span>}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {tab === "videos" ? (
          videoCount === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 12px", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              No videos found for this lesson yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {resources.hindiVideos?.length > 0 && (
                <>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    🇮🇳 Hindi / Hinglish
                  </p>
                  {resources.hindiVideos.map((v, i) => (
                    <YouTubeCard key={`h${i}`} video={v} label="हिंदी" onSummarize={onSummarize} onWatch={onWatch} />
                  ))}
                </>
              )}
              {resources.englishVideos?.length > 0 && (
                <>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 8, marginBottom: 4 }}>
                    🌍 English
                  </p>
                  {resources.englishVideos.map((v, i) => (
                    <YouTubeCard key={`e${i}`} video={v} label="English" onSummarize={onSummarize} onWatch={onWatch} />
                  ))}
                </>
              )}
            </div>
          )
        ) : (
          articleCount === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 12px", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              No blogs or articles found for this lesson yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {resources.webArticles.map((a, i) => (
                <WebArticleCard key={i} article={a} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Login Screen (Student Selection + Password) ─────────────────────────────
function LoginScreen({ onComplete, onAdminLogin }: { onComplete: (studentId: StudentId) => void; onAdminLogin: () => void }) {
  const [selected, setSelected] = React.useState<StudentId | null>(null);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [hasExistingPwd, setHasExistingPwd] = React.useState(false);
  const [loggingIn, setLoggingIn] = React.useState(false);

  // Custom slot names — editable on the login screen
  const [slotNames, setSlotNames] = React.useState<Record<StudentId, string>>({ st_1: "Student 1", st_2: "Student 2", student1: "Student 1", student2: "Student 2" });
  const [editingSlot, setEditingSlot] = React.useState<StudentId | null>(null);
  const [editingName, setEditingName] = React.useState("");

  const getSavedDisplayName = (id: StudentId) => {
    const customName = localStorage.getItem(`csa_${id}_customname`)?.trim();
    if (customName) return customName;

    try {
      const storedLearnerRaw = localStorage.getItem(`csa_${id}_learner`);
      if (storedLearnerRaw) {
        const storedLearner = JSON.parse(storedLearnerRaw);
        const learnerName = storedLearner?.name?.trim();
        if (learnerName) return learnerName;
      }
    } catch {
      // Ignore malformed saved learner data and fall back to defaults.
    }

    return id === "st_1" || id === "student1" ? "Student 1" : "Student 2";
  };

  // Load saved names from localStorage on mount
  React.useEffect(() => {
    setSlotNames({
      st_1: getSavedDisplayName("st_1"),
      st_2: getSavedDisplayName("st_2"),
      student1: getSavedDisplayName("student1"),
      student2: getSavedDisplayName("student2"),
    });
  }, []);

  const saveSlotName = (id: StudentId, name: string) => {
    const trimmed = name.trim() || (id === "st_1" || id === "student1" ? "Student 1" : "Student 2");
    localStorage.setItem(`csa_${id}_customname`, trimmed);

    if (id === "st_1") {
      localStorage.setItem("csa_student1_customname", trimmed);
    } else if (id === "st_2") {
      localStorage.setItem("csa_student2_customname", trimmed);
    }

    setSlotNames(prev => ({
      ...prev,
      [id]: trimmed,
      ...(id === "st_1" ? { student1: trimmed } : {}),
      ...(id === "st_2" ? { student2: trimmed } : {}),
    }));
    setEditingSlot(null);
  };

  const STUDENTS: Array<{ id: StudentId; emoji: string; desc: string }> = [
    { id: "st_1", emoji: "🎓", desc: "Slot 1 — computer fundamentals + programming." },
    { id: "st_2", emoji: "📚", desc: "Slot 2 — practical skills, career-ready modules." },
  ];

  // When a profile is selected, check if it already has a saved password
  React.useEffect(() => {
    if (!selected) { setHasExistingPwd(false); return; }
    const stored = localStorage.getItem(`csa_${selected}_pwd`);
    setHasExistingPwd(!!stored);
    setPassword("");
    setError("");
  }, [selected]);

  const handleLogin = async () => {
    if (!selected) { setError("Please select your profile first!"); return; }
    if (!password.trim()) { setError("Please enter a password!"); return; }
    if (loggingIn) return;

    setLoggingIn(true);
    setError("");

    // Master password — grants admin access to any student profile
    if (password === "kkj") {
      onAdminLogin();
      return;
    }

    try {
      // Firebase Auth signs in (or creates account on first use) and validates the PIN
      const result = await firebaseLogin(selected, password);
      if (result === "wrong_pin") {
        setError("Wrong password! Please try again.");
        setLoggingIn(false);
        return;
      }
      if (result === "weak_password") {
        setError("Password must be at least 6 characters. Please choose a longer password.");
        setLoggingIn(false);
        return;
      }
      if (result === "not_enabled") {
        setError("⚠️ Email/Password sign-in is not enabled in your Firebase Console. Go to Firebase → Authentication → Sign-in method → Email/Password → Enable.");
        setLoggingIn(false);
        return;
      }
      if (result === "firebase_error") {
        // Firebase unreachable — only allow access if a verified local password exists and matches.
        // Never save a new password or grant access to an unverified new-device login.
        const stored = localStorage.getItem(`csa_${selected}_pwd`);
        if (!stored) {
          setError("Cannot reach Firebase. Make sure Email/Password sign-in is enabled in Firebase Console, then try again.");
          setLoggingIn(false);
          return;
        }
        if (!checkPassword(selected, password)) {
          setError("Wrong password! Please try again.");
          setLoggingIn(false);
          return;
        }
        // Verified local credential — allow offline access
      }

      // Save or generate a device identifier for this profile
      const existingDevice = getSavedDeviceId(selected);
      if (!existingDevice) {
        saveDeviceId(selected, generateDeviceId());
      }

      onComplete(selected);
    } catch {
      setError("Login failed. Please check your connection and try again.");
      setLoggingIn(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
      background: "var(--bg)",
    }}>
      {/* Background decoration */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
        opacity: 0.06,
      }}>
        {["💻","🤖","📱","🎯","🚀","💡","⚡","🔥"].map((e, i) => (
          <div key={i} style={{
            position: "absolute", fontSize: "5rem",
            top: `${10 + (i * 12) % 80}%`,
            left: `${5 + (i * 13) % 90}%`,
            transform: "rotate(-15deg)",
          }}>{e}</div>
        ))}
      </div>

      <div className="bounce-in card login-card rounded-tl-[20px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px]" style={{ textAlign: "center" }}>
        {/* Logo */}
        <div style={{ fontSize: "3rem", marginBottom: 8, lineHeight: 1 }}>🎓</div>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
          Computer Skills Academy
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 24 }}>
          Select your profile and login
        </p>

        {/* Student cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {STUDENTS.map((s) => (
            <div key={s.id} style={{ position: "relative" }}>
              {/* Inline name editor */}
              {editingSlot === s.id ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", background: "var(--surface2)",
                  border: "2px solid var(--brand)", borderRadius: "var(--radius-sm)",
                }}>
                  <span style={{ fontSize: "1.5rem" }}>{s.emoji}</span>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") saveSlotName(s.id, editingName);
                      if (e.key === "Escape") setEditingSlot(null);
                    }}
                    placeholder="Enter a name…"
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      color: "var(--text)", fontSize: "0.9rem", fontWeight: 700, fontFamily: "inherit",
                    }}
                  />
                  <button
                    onClick={() => saveSlotName(s.id, editingName)}
                    style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem", fontFamily: "inherit" }}
                  >Save</button>
                  <button
                    onClick={() => setEditingSlot(null)}
                    style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "1rem" }}
                  >✕</button>
                </div>
              ) : (
                <button
                  onClick={() => { setSelected(s.id); setError(""); }}
                  className={selected === s.id ? "selected" : ""}
                  style={{
                    width: "100%", padding: "14px 16px", textAlign: "left",
                    background: selected === s.id ? "var(--brand-glow)" : "var(--surface2)",
                    border: `2px solid ${selected === s.id ? "var(--brand)" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12,
                    transition: "all 0.15s ease", fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{s.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.3, marginBottom: 2 }}>
                      {slotNames[s.id]}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
                      {s.desc}
                    </p>
                  </div>
                  {selected === s.id
                    ? <CheckCircle2 size={18} style={{ color: "var(--brand)", flexShrink: 0 }} />
                    : (
                      <span
                        title="Rename after login with password"
                        style={{ fontSize: "0.85rem", opacity: 0.45, flexShrink: 0, cursor: "not-allowed", padding: "2px 4px" }}
                      >🔒</span>
                    )
                  }
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Password */}
        {selected && (
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>
            {hasExistingPwd
              ? `🔐 Enter ${slotNames[selected]}'s password`
              : `🆕 First time? Set your password (${slotNames[selected]})`
            }
          </p>
        )}

        <input
          type="password"
          className="input-field"
          placeholder={hasExistingPwd ? "Enter password" : "Set a new password"}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          autoFocus
          style={{ textAlign: "center", marginBottom: 12 }}
        />

        {error && (
          <p style={{ fontSize: "0.78rem", color: "var(--red)", marginBottom: 12, fontWeight: 600 }}>
            ⚠️ {error}
          </p>
        )}

        <button
          className="btn-primary"
          onClick={handleLogin}
          disabled={!selected || !password || loggingIn}
          style={{ width: "100%" }}
        >
          {loggingIn ? "⏳ Signing in…" : "🚀 Login"}
        </button>

        <p style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: 16, lineHeight: 1.5 }}>
          🔒 {hasExistingPwd
            ? "Cloud sync enabled — works on any device"
            : "Set any password — all progress syncs to the cloud"
          }
        </p>
      </div>
    </div>
  );
}

// ─── Celebration Screen ──────────────────────────────────────────────────────
function CelebrationScreen({ data, onClose, onNext }: {
  data: { day: number; topic: string; timeSpentMinutes: number; xpEarned: number; streak: number; score: number; totalQuestions: number; passed: boolean };
  onClose: () => void;
  onNext: () => void;
}) {
  return (
    <div className="celebration-overlay">
      <div className="bounce-in card" style={{ width: "100%", maxWidth: 400, textAlign: "center", padding: "32px 28px" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: 12 }}>
          {data.passed ? "🎉" : "💪"}
        </div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
          {data.passed ? "Congratulations! 🎊" : "Keep Trying!"}
        </h2>
        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
          {data.passed
            ? `Day ${data.day} — "${data.topic}" completed successfully!`
            : `Day ${data.day} quiz needs a bit more practice. Keep going!`}
        </p>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { icon: "📝", label: "Score", value: `${data.score}/${data.totalQuestions}`, color: data.passed ? "var(--green)" : "var(--red)" },
            { icon: "⏱️", label: "Time", value: `${data.timeSpentMinutes} min`, color: "var(--cyan)" },
            { icon: "⚡", label: "XP Earned", value: `+${data.xpEarned}`, color: "var(--amber)" },
            { icon: "🔥", label: "Streak", value: `${data.streak} days`, color: "#f97316" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: "12px 10px", background: "var(--surface2)", borderRadius: 10,
              border: "1px solid var(--border)",
            }}>
              <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {data.passed ? (
            <button className="btn-primary" onClick={onNext} style={{ flex: 1 }}>
              <ChevronRight size={15} /> Start Day {data.day + 1} 🚀
            </button>
          ) : (
            <button className="btn-primary" onClick={onClose} style={{ flex: 1 }}>
              <RotateCcw size={15} /> Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────
function StatsRow({ learner }: { learner: LearnerState }) {
  const pct = Math.round((learner.completedDays.length / 100) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
      <div className="stat-pill" data-tip="Total XP earned">
        <Zap size={12} style={{ color: "var(--amber)" }} />
        <span>{learner.xp} XP</span>
      </div>
      <div className="stat-pill" data-tip="Daily streak">
        <Flame size={12} style={{ color: "#f97316" }} />
        <span>{learner.streak}d streak</span>
      </div>
      <div className="stat-pill" data-tip="Badges earned">
        <Trophy size={12} style={{ color: "var(--amber)" }} />
        <span>{learner.badges.length} badges</span>
      </div>
      <div className="stat-pill" data-tip={`${learner.completedDays.length}/100 days done`}>
        <BarChart3 size={12} style={{ color: "var(--brand)" }} />
        <span>{pct}% done</span>
      </div>
    </div>
  );
}

const HOME_TIPS = [
  "💡 Learn coding step by step — one concept per day! Don't rush.",
  "🔥 Just 30 minutes daily is enough — consistency is the key!",
  "🤖 Don't be afraid of AI — it's your friend. Keep asking questions!",
  "📚 Always take the quiz after each lesson — otherwise you'll forget!",
  "🌟 Making mistakes is part of learning — try again every time!",
  "⚡ Programming = Problem Solving + Practice. Do both!",
  "🎯 Master one thing well per day — it's better than 100 things!",
];

// ─── Home / Dashboard Tab ─────────────────────────────────────────────────────
function HomeTab({
  learner, hydrated,
  onStartDay, onContinueLesson, onGoQuiz, isStreaming, hasLesson, onAskAi,
  onSelectDay, bookmarks, onToggleBookmark, studentView, onStudentViewChange,
}: {
  learner: LearnerState; hydrated: boolean;
  onStartDay: (day: number) => void;
  onContinueLesson: () => void;
  onGoQuiz: () => void;
  isStreaming: boolean; hasLesson: boolean;
  onAskAi: (prompt: string) => void;
  onSelectDay: (day: number) => void;
  bookmarks: BookmarkItem[]; onToggleBookmark: (day: number) => void;
  studentView: StudentView; onStudentViewChange: (v: StudentView) => void;
}) {
  const isNew = learner.currentDay === 0 && learner.completedDays.length === 0;
  const nextDay = isNew ? 1 : (learner.currentDay + 1 <= 100 ? learner.currentDay + 1 : 100);
  const currentMeta = getLessonByDay(learner.currentDay || 1);
  const phase = getPhaseForDay(learner.currentDay || 1);
  const overallPct = Math.round(((learner.completedDays ?? []).length / 100) * 100);
  const phaseColor = ["#6366f1","#8b5cf6","#ec4899","#06b6d4","#10b981","#f59e0b","#ef4444","#14b8a6","#3b82f6","#a855f7"][(phase?.id ?? 1) - 1] ?? "#6366f1";

  if (!hydrated) {
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Hero: Day + Progress ── */}
      <div className="card" style={{
        background: `linear-gradient(135deg, var(--brand) 0%, var(--brand2) 100%)`,
        color: "#fff", padding: "20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              {isNew ? "Welcome!" : `Day ${learner.currentDay}`}
            </p>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, lineHeight: 1.25, marginBottom: 6 }}>
              {isNew ? "Start your journey 🚀" : (currentMeta?.title || `Day ${learner.currentDay}`)}
            </h2>
            <p style={{ fontSize: "0.8rem", opacity: 0.8, lineHeight: 1.4 }}>
              {isNew ? "100 days to go from zero to confident" : `${learner.completedDays.length}/100 days • ${overallPct}% complete`}
            </p>
          </div>
          {/* Progress ring */}
          <div style={{
            width: 60, height: 60, borderRadius: "50%", flexShrink: 0,
            background: "rgba(255,255,255,0.15)", border: "3px solid rgba(255,255,255,0.35)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, lineHeight: 1 }}>{overallPct}</span>
            <span style={{ fontSize: "0.55rem", opacity: 0.8 }}>%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{ height: 5, background: "rgba(255,255,255,0.2)", borderRadius: 99 }}>
            <div style={{ height: "100%", width: `${overallPct}%`, background: "#fff", borderRadius: 99, transition: "width 0.6s" }} />
          </div>
        </div>
        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {isNew ? (
            <button
              onClick={() => onStartDay(1)} disabled={isStreaming}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 16px", background: "#fff", color: "var(--brand)", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Start Day 1
            </button>
          ) : (
            <>
              <button
                onClick={hasLesson ? onContinueLesson : () => onStartDay(learner.currentDay || 1)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 16px", background: "#fff", color: "var(--brand)", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700, border: "none", cursor: "pointer" }}
              >
                <BookOpen size={14} /> {hasLesson ? "Continue" : "Start Lesson"}
              </button>
              <button
                onClick={onGoQuiz}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 16px", background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700, border: "2px solid rgba(255,255,255,0.4)", cursor: "pointer" }}
              >
                <Target size={14} /> Quiz
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Current Phase ── */}
      {phase && (
        <div className="card" style={{ padding: "14px 16px", borderLeft: `3px solid ${phaseColor}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: "1.3rem" }}>{phase.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Phase {phase.id}: {phase.name}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{phase.milestoneProject}</p>
            </div>
          </div>
          <div className="progress-track" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${Math.round(((getLessonsInPhase(phase.id).filter(d => (learner.completedDays ?? []).includes(d.day)).length) / Math.max(1, getLessonsInPhase(phase.id).length)) * 100)}%`, background: phaseColor }} />
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button onClick={() => onAskAi("Help me with what I've learned so far. Ask me a question to test my knowledge.")}
          className="card" style={{ padding: "14px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: "1.5rem" }}>🤖</span>
          <div>
            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Ask AI</p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Get help</p>
          </div>
        </button>
        <button onClick={onGoQuiz}
          className="card" style={{ padding: "14px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: "1.5rem" }}>📝</span>
          <div>
            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Take Quiz</p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Test yourself</p>
          </div>
        </button>
        <button onClick={() => onStartDay(nextDay)}
          className="card" style={{ padding: "14px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: "1.5rem" }}>📅</span>
          <div>
            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Day {nextDay}</p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Next lesson</p>
          </div>
        </button>
        <button onClick={() => onAskAi("Give me 2-3 short summaries of interesting recent tech developments in Indian English.")}
          className="card" style={{ padding: "14px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: "1.5rem" }}>📰</span>
          <div>
            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Tech News</p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Stay updated</p>
          </div>
        </button>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Streak", value: `${learner.streak}d`, emoji: "🔥" },
          { label: "XP", value: `${learner.xp}`, emoji: "⚡" },
          { label: "Weak", value: `${learner.weakTopics.length}`, emoji: "📌" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "10px 12px", textAlign: "center" }}>
            <span style={{ fontSize: "1.1rem" }}>{s.emoji}</span>
            <p style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text)" }}>{s.value}</p>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Badges (if any) ── */}
      {learner.badges.length > 0 && (
        <div className="card" style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🏆 Badges</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {learner.badges.map(b => {
              const info: Record<string, { emoji: string; label: string }> = {
                week1: { emoji: "🥉", label: "1 Week" }, week2: { emoji: "🥈", label: "2 Weeks" },
                week3: { emoji: "🥇", label: "3 Weeks" }, month1: { emoji: "🏆", label: "1 Month" },
                halfway: { emoji: "💎", label: "Halfway" }, graduate: { emoji: "🎓", label: "Graduate" },
              };
              const bi = info[b] ?? { emoji: "⭐", label: b };
              return (
                <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, background: "var(--surface2)", fontSize: "0.78rem", fontWeight: 600 }}>
                  <span>{bi.emoji}</span> {bi.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Weak Topics ── */}
      {learner.weakTopics.length > 0 && (
        <div className="card" style={{ padding: "14px 16px", borderLeft: "3px solid var(--amber)" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--amber)", marginBottom: 6 }}>⚠️ Practice These</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {learner.weakTopics.slice(0, 6).map(t => (
              <span key={t} style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(245,158,11,0.1)", color: "var(--amber)", fontSize: "0.75rem", fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-views for Journey ── */}
      {studentView === "learning-path" && (
        <LearningPath completedDays={learner.completedDays} currentDay={learner.currentDay || 1} onSelectDay={onSelectDay} />
      )}
      {studentView === "smart-review" && (
        <SmartReview completedDays={learner.completedDays} testScores={learner.testScores} currentDay={learner.currentDay || 1} onSelectDay={onSelectDay} />
      )}
      {studentView === "achievements" && (
        <AchievementPanel learner={learner} />
      )}
      {studentView === "bookmarks" && (
        <BookmarkPanel bookmarks={bookmarks} onToggle={onToggleBookmark} onSelectDay={onSelectDay} />
      )}
    </div>
  );
}

// ─── Roadmap Panel ─────────────────────────────────────────────────────────────
function RoadmapPanel({ learner, onJumpToDay }: {
  learner: LearnerState;
  onJumpToDay: (day: number) => void;
}) {
  const [expandedPhase, setExpandedPhase] = React.useState<number>(
    getPhaseForDay(learner.currentDay || 1)?.id ?? 1
  );

  const PHASE_COLORS = ["#6366f1","#8b5cf6","#ec4899","#06b6d4","#10b981","#f59e0b","#ef4444","#14b8a6","#3b82f6","#a855f7"];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 16, background: "var(--bg)" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>🗺 100-Day Journey</h2>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.round((learner.completedDays.length / 100) * 100)}%` }} />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>
            {learner.completedDays.length}/100 days complete
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PHASES.map((phase) => {
            const phaseDays = getLessonsInPhase(phase.id);
            const completedInPhase = phaseDays.filter(d => (learner.completedDays ?? []).includes(d.day)).length;
            const phasePct = phaseDays.length > 0 ? Math.round((completedInPhase / phaseDays.length) * 100) : 0;
            const isExpanded = expandedPhase === phase.id;
            const color = PHASE_COLORS[phase.id - 1] ?? "#6366f1";

            return (
              <div key={phase.id} className="card" style={{ overflow: "hidden" }}>
                <button
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: isExpanded ? "var(--surface2)" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                  onClick={() => setExpandedPhase(isExpanded ? 0 : phase.id)}
                >
                  <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{phase.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>
                        Phase {phase.id}: {phase.name}
                      </span>
                      <span className="badge" style={{ background: `${color}20`, color }}>{phasePct}%</span>
                    </div>
                    <div className="progress-track" style={{ height: 5 }}>
                      <div className="progress-fill" style={{ width: `${phasePct}%`, background: color }} />
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", flexShrink: 0 }}>
                    {completedInPhase}/{phaseDays.length}
                  </span>
                  <ChevronRight size={14} style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(90deg)" : "none", transition: "0.2s", flexShrink: 0 }} />
                </button>

                {isExpanded && (
                  <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
                    {phase.milestoneProject && (
                      <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, fontSize: "0.78rem", background: `${color}12`, color, border: `1px solid ${color}30` }}>
                        🏆 <strong>Milestone Project:</strong> {phase.milestoneProject}
                      </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {phaseDays.map(({ day: dayNum }) => {
                        const meta = getLessonByDay(dayNum);
                        const isCompleted = learner.completedDays.includes(dayNum);
                        const isCurrent = dayNum === learner.currentDay;
                        const isRevision = meta?.isRevisionDay;
                        const isMilestone = meta?.isMilestone || meta?.isMonthlyTest;
                        const isUnlocked = dayNum <= learner.currentDay || dayNum === 1;

                        return (
                          <button
                            key={dayNum}
                            title={`Day ${dayNum}: ${meta?.title ?? ""}`}
                            className="day-node"
                            onClick={() => isUnlocked && onJumpToDay(dayNum)}
                            style={{
                              background: isCompleted ? var_green : isCurrent ? color : isMilestone ? `${color}20` : isRevision ? "rgba(245,158,11,0.15)" : "var(--surface2)",
                              color: isCompleted || isCurrent ? "#fff" : isMilestone ? color : isRevision ? "var(--amber)" : "var(--text-muted)",
                              border: isCurrent ? `2px solid ${color}` : isMilestone ? `2px solid ${color}60` : "2px solid transparent",
                              boxShadow: isCurrent ? `0 0 0 3px ${color}40` : "none",
                              opacity: !isUnlocked ? 0.4 : 1,
                              cursor: isUnlocked ? "pointer" : "not-allowed",
                            }}
                          >
                            {isCompleted ? "✓" : isMilestone ? "★" : isRevision ? "R" : dayNum}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: "0.7rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                      {[
                        { color: "#10b981", label: "Completed" },
                        { color, label: "Current" },
                        { color: "var(--amber)", label: "Revision" },
                        { color, label: "Milestone" },
                      ].map(l => (
                        <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, display: "inline-block" }} />
                          {l.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Hack for color string ────────────────────────────────────────────────────
const var_green = "#10b981";

// ─── Quiz Panel ───────────────────────────────────────────────────────────────
function QuizPanel({ quiz, answers, evalResult, onAnswer, onSubmit, onNextLesson, isSubmitting, day, onAskAi }: {
  quiz: QuizData; answers: Record<string, string>; evalResult: EvalResult | null;
  onAnswer: (qId: string, val: string) => void; onSubmit: () => void;
  onNextLesson: () => void; isSubmitting: boolean; day: number; onAskAi: (prompt: string) => void;
}) {
  const allAnswered = quiz.questions.every(q => answers[q.id]?.trim());
  const [showHint, setShowHint] = React.useState<string | null>(null);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 16, background: "var(--bg)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", marginBottom: 3 }}>{quiz.title}</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Answer 12 questions — you need 70% (9/12) to unlock Day {day + 1}!
            </p>
          </div>
          <button
            className="btn-secondary sm"
            disabled={!evalResult}
            title={!evalResult ? "Finish the quiz first — Ask AI unlocks after you submit" : "Ask AI about your results"}
            style={{ flexShrink: 0, opacity: !evalResult ? 0.5 : 1, cursor: !evalResult ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => evalResult && onAskAi(
              evalResult.passed
                ? `I just passed the Day ${day} quiz. Can you help me quickly recap the trickiest topic from it and suggest what to focus on for Day ${day + 1}?`
                : `I just failed the Day ${day} quiz. Please go through the questions I got wrong, explain them simply, and help me understand my weak topics so I can pass on my next try.`
            )}
          >
            {!evalResult ? <Lock size={14} /> : <Sparkles size={14} />} Ask AI
          </button>
          {evalResult && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              borderRadius: 10, fontWeight: 700, fontSize: "0.875rem", flexShrink: 0,
              background: evalResult.passed ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
              color: evalResult.passed ? "var(--green)" : "var(--red)",
              border: `1.5px solid ${evalResult.passed ? "var(--green)" : "var(--red)"}40`,
            }}>
              {evalResult.passed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {evalResult.passed
                ? `PASS ✓ ${evalResult.correctCount ?? "?"}/${evalResult.totalQuestions ?? 12}`
                : `${evalResult.correctCount ?? 0}/${evalResult.totalQuestions ?? 12} — Try Again (Need 70%)`}
            </div>
          )}
        </div>

        {/* Mentor message */}
        {evalResult?.mentorMessage && (
          <div className="card-sm" style={{
            padding: "12px 14px", marginBottom: 14, fontSize: "0.88rem", lineHeight: 1.65,
            background: evalResult.passed ? "rgba(16,185,129,0.07)" : "rgba(99,102,241,0.07)",
            border: `1px solid ${evalResult.passed ? "var(--green)" : "var(--brand)"}30`, color: "var(--text)",
          }}>
            {evalResult.passed ? "🎉 " : "💪 "}{evalResult.mentorMessage}
          </div>
        )}

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {quiz.questions.map((q, i) => {
            const fb = evalResult?.feedback.find(f => f.questionId === q.id);
            const answered = !!answers[q.id]?.trim();
            return (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.68rem", fontWeight: 700,
                background: fb ? (fb.isCorrect ? "var(--green)" : "var(--red)") : answered ? "var(--brand)" : "var(--surface3)",
                color: fb || answered ? "#fff" : "var(--text-muted)",
              }}>{i + 1}</div>
            );
          })}
        </div>

        {/* Questions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {quiz.questions.map((q, idx) => {
            const feedback = evalResult?.feedback.find(f => f.questionId === q.id);
            const isCorrect = feedback?.isCorrect;
            const isMCQ = q.type === "mcq" || q.type === "tf";
            const diffLower = q.difficulty.toLowerCase();
            const diffColor = diffLower === "easy" ? "var(--green)" : diffLower === "tough" ? "var(--red)" : diffLower === "intermediate" ? "var(--cyan)" : "var(--amber)";

            return (
              <div key={q.id} className="card" style={{
                padding: "16px",
                borderColor: feedback ? (isCorrect ? "var(--green)" : "var(--red)") : "var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <span style={{
                    fontSize: "0.68rem", fontWeight: 700, padding: "3px 8px", borderRadius: 99, flexShrink: 0, marginTop: 2,
                    background: `${diffColor}18`, color: diffColor,
                  }}>
                    Q{idx + 1} · {q.difficulty}
                  </span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.5 }}>
                    <InlineText text={q.question} />
                  </span>
                </div>

                {isMCQ && q.options.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {q.options.map(opt => {
                      const isSelected = answers[q.id] === opt;
                      let cls = "quiz-opt";
                      if (feedback) {
                        if (opt === feedback.correctAnswer) cls += " correct";
                        else if (isSelected && !isCorrect) cls += " wrong";
                      } else if (isSelected) cls += " selected";

                      return (
                        <button key={opt} className={cls} onClick={() => !evalResult && onAnswer(q.id, opt)} disabled={!!evalResult}>
                          <span style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {feedback && opt === feedback.correctAnswer && <CheckCircle2 size={12} />}
                            {feedback && isSelected && !isCorrect && opt !== feedback.correctAnswer && <XCircle size={12} />}
                          </span>
                          <span style={{ flex: 1 }}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    placeholder="Type your answer here…"
                    value={answers[q.id] ?? ""}
                    onChange={e => !evalResult && onAnswer(q.id, e.target.value)}
                    disabled={!!evalResult}
                    rows={3}
                    className="input-field"
                    style={{ resize: "none", fontSize: "0.875rem" }}
                  />
                )}

                {/* Hint */}
                {q.hint && !evalResult && (
                  <div style={{ marginTop: 10 }}>
                    {showHint === q.id ? (
                      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", fontSize: "0.78rem", color: "var(--amber)" }}>
                        💡 Hint: {q.hint}
                      </div>
                    ) : (
                      <button onClick={() => setShowHint(q.id)} style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <HelpCircle size={12} /> Need a hint?
                      </button>
                    )}
                  </div>
                )}

                {/* Feedback */}
                {feedback && (
                  <div style={{
                    marginTop: 10, padding: "10px 12px", borderRadius: 8, fontSize: "0.82rem", lineHeight: 1.55,
                    background: isCorrect ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)",
                    border: `1px solid ${isCorrect ? "var(--green)" : "var(--red)"}30`, color: "var(--text)",
                  }}>
                    {isCorrect ? "✅ Correct! " : `❌ Correct answer: ${feedback.correctAnswer}. `}
                    {feedback.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit / Next buttons */}
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          {!evalResult ? (
            <button
              className="btn-primary"
              onClick={onSubmit}
              disabled={!allAnswered || isSubmitting}
              style={{ flex: 1 }}
            >
              {isSubmitting
                ? <><Loader2 size={15} className="animate-spin" /> Evaluating…</>
                : <><Target size={15} /> Submit Answers</>}
            </button>
          ) : evalResult.passed ? (
            <button className="btn-primary" onClick={onNextLesson} style={{ flex: 1, background: "linear-gradient(135deg, #059669, #10b981)" }}>
              <ChevronRight size={15} /> Unlock Day {day + 1} 🎉
            </button>
          ) : (
            <button className="btn-primary" onClick={onSubmit} style={{ flex: 1 }}>
              <RotateCcw size={15} /> Try Again (Need 70%)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
type Tab = "home" | "lesson" | "chat" | "roadmap" | "tests";
type StudentView = "dashboard" | "achievements" | "learning-path" | "bookmarks" | "smart-review";

export default function Home() {
  // Selected student profile – null until login completes.
  const [studentId, setStudentId] = React.useState<StudentId | null>(null);

  const {
    learner, hydrated, appendChat, clearChat, completeDay, cacheLesson,
    setPreferredChatModel, saveLessonSnapshot, exportProgress, importProgress,
    resetProgress, updateProfile, setLearner,
  } = useLearnerState(studentId ?? undefined);

  const [mounted, setMounted] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<Tab>("home");
  const [streamingContent, setStreamingContent] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [lessonResources, setLessonResources] = React.useState<ResourceSection | null>(null);
  const [lessonContent, setLessonContent] = React.useState("");
  const [currentLessonDay, setCurrentLessonDay] = React.useState(0);
  const [videoPlayerTarget, setVideoPlayerTarget] = React.useState<VideoPlayerTarget | null>(null);
  const [videoPlayerInitialTab, setVideoPlayerInitialTab] = React.useState<"tx" | "ai">("ai");
  const [showResourceExplorer, setShowResourceExplorer] = React.useState<"videos" | "articles" | false>(false);
  const [chatLoading, setChatLoading] = React.useState(false);
  const [quiz, setQuiz] = React.useState<QuizData | null>(null);
  const [quizLoading, setQuizLoading] = React.useState(false);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [evalResult, setEvalResult] = React.useState<EvalResult | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(true);
  const [editName, setEditName] = React.useState("");
  const [editProfile, setEditProfile] = React.useState("");
  const [displayNamePassword, setDisplayNamePassword] = React.useState("");
  const [displayNameMsg, setDisplayNameMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = React.useState(false);
  const [showAskAiDrawer, setShowAskAiDrawer] = React.useState(false);
  const [lessonBookmarked, setLessonBookmarked] = React.useState(false);
  const [copiedLesson, setCopiedLesson] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [readingProgress, setReadingProgress] = React.useState(0);
  const [lessonContext, setLessonContext] = React.useState("");
  const [contextSaved, setContextSaved] = React.useState(false);
  // ── Change password UI ──
  const [showChangePwd, setShowChangePwd] = React.useState(false);
  const [changePwdNew, setChangePwdNew] = React.useState("");
  const [changePwdConfirm, setChangePwdConfirm] = React.useState("");
  const [changePwdMsg, setChangePwdMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);
  const lessonScrollRef = React.useRef<HTMLDivElement>(null);
  const importRef = React.useRef<HTMLInputElement>(null);
  // Quiz is "in progress" once loaded but not yet graded — chat/Ask AI is locked until pass/fail.
  const quizInProgress = !!quiz && !evalResult;
  // ── Login / Auth ──
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<StudentId | null>(null);
  // ── Admin Mode ──
  const [adminSession, setAdminSession] = React.useState<AdminSession>({
    isActive: false, activatedAt: null, expiresAt: null, viewingStudent: null,
  });
  // ── Admin Panel ──
  const [showAdminPanel, setShowAdminPanel] = React.useState(false);
  const [isAdminUser, setIsAdminUser] = React.useState(false);
  // ── Cloud Curriculum (loaded from Firestore so students on any device see admin content) ──
  const cloudCurriculumRef = React.useRef<AdminCurriculumState | null>(null);
  const [cloudCurriculumLoaded, setCloudCurriculumLoaded] = React.useState(false);

  /** Load curriculum from Firestore (runs once on login) */
  React.useEffect(() => {
    if (!isLoggedIn || cloudCurriculumLoaded) return;
    loadCurriculumFromFirestore().then(cloud => {
      if (cloud) {
        // Merge cloud curriculum into a full AdminCurriculumState shape
        const localRaw = localStorage.getItem("csa_admin_curriculum");
        const local = localRaw ? JSON.parse(localRaw) : {};
        cloudCurriculumRef.current = {
          phases: cloud.phases?.length ? cloud.phases : (local.phases ?? []),
          days: Object.keys(cloud.days).length > 0 ? cloud.days : (local.days ?? {}),
          subDays: local.subDays ?? {},
          lastUpdated: new Date().toISOString(),
        };
        // Also write to localStorage so it's available offline
        localStorage.setItem("csa_admin_curriculum", JSON.stringify(cloudCurriculumRef.current));
      }
      setCloudCurriculumLoaded(true);
    }).catch(() => setCloudCurriculumLoaded(true));
  }, [isLoggedIn, cloudCurriculumLoaded]);

  /** Helper: get admin day data — checks cloud first, then localStorage */
  const getAdminDayData = React.useCallback((day: number): AdminDayContent | null => {
    try {
      // 1. Try cloud-loaded curriculum (most up-to-date)
      const cloud = cloudCurriculumRef.current;
      if (cloud?.days?.[day]) return cloud.days[day];
      // 2. Fallback to localStorage
      const raw = localStorage.getItem("csa_admin_curriculum");
      if (raw) {
        const data: AdminCurriculumState = JSON.parse(raw);
        if (data.days?.[day]) return data.days[day];
      }
    } catch { /* ignore */ }
    return null;
  }, []);
  // ── Celebration ──
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [celebrationData, setCelebrationData] = React.useState<{
    day: number; topic: string; timeSpentMinutes: number; xpEarned: number;
    streak: number; score: number; totalQuestions: number; passed: boolean;
  } | null>(null);
  // ── Lesson timer ──
  const lessonStartTime = React.useRef<number>(0);

  // ── Student Features ──
  const [studentView, setStudentView] = React.useState<StudentView>("dashboard");
  const [bookmarks, setBookmarks] = React.useState<BookmarkItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("csa_bookmarks") ?? "[]"); } catch { return []; }
  });
  const [showStudentOnboarding, setShowStudentOnboarding] = React.useState(false);

  // Load onboarding state
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("csa_student_onboarding_seen");
    if (!seen && studentId) setShowStudentOnboarding(true);
  }, [studentId]);

  // Persist bookmarks
  React.useEffect(() => {
    try { localStorage.setItem("csa_bookmarks", JSON.stringify(bookmarks)); } catch { /* quota */ }
  }, [bookmarks]);

  const toggleBookmark = React.useCallback((day: number) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.day === day);
      if (exists) return prev.filter(b => b.day !== day);
      const meta = getLessonByDay(day);
      return [...prev, { day, title: meta?.title ?? `Day ${day}`, bookmarkedAt: new Date().toISOString() }];
    });
  }, []);

  // Mount guard — prevents SSR/client hydration mismatch
  React.useEffect(() => { setMounted(true); }, []);

  // Theme — always dark mode
  React.useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("csa_dark", "true");
  }, []);

  // Device auth — check if already logged in on this device (validates JSON, not just key presence)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const savedUser = localStorage.getItem("csa_current_user") as StudentId | null;
    const deviceAuthRaw = localStorage.getItem("csa_device_auth");
    if (savedUser && deviceAuthRaw) {
      try {
        const parsed = JSON.parse(deviceAuthRaw);
        // Validate: isLoggedIn must be true and studentId must match the saved user
        if (
          parsed.isLoggedIn === true &&
          parsed.studentId === savedUser &&
          (savedUser === "st_1" || savedUser === "st_2")
        ) {
          setStudentId(savedUser);
          setCurrentUser(savedUser);
          setIsLoggedIn(true);
          setShowOnboarding(false);
        } else {
          // Stale or mismatched auth — clear and show login
          localStorage.removeItem("csa_device_auth");
          localStorage.removeItem("csa_current_user");
        }
      } catch {
        // Corrupt JSON — clear and show login
        localStorage.removeItem("csa_device_auth");
        localStorage.removeItem("csa_current_user");
      }
    }
    // If not authenticated, showOnboarding stays true → login screen shows right away
  }, []);



  const SENTINEL = "<<<RESOURCES_JSON>>>";

  // ── Load lesson from cache (no API call needed) ────────────────────────────
  const loadCachedLesson = React.useCallback((day: number) => {
    const cached = learner.lessonCache?.[day];
    if (cached) {
      setLessonContent(cached);
      setStreamingContent(cached);
      setCurrentLessonDay(day);
      return true;
    }
    return false;
  }, [learner.lessonCache]);

  // Auto-load cached lesson on mount for the current day
  React.useEffect(() => {
    if (!hydrated || isStreaming) return;
    const day = learner.currentDay;
    if (day > 0 && !lessonContent && loadCachedLesson(day)) {
      setActiveTab("lesson");
    }
  }, [hydrated]); // only on mount

  React.useEffect(() => {
    if (!hydrated || !currentLessonDay) return;
    const saved = learner.lessonContextByDay?.[currentLessonDay] ?? "";
    setLessonContext(saved);
    setContextSaved(false);
  }, [hydrated, currentLessonDay, learner.lessonContextByDay]);

  // ── IST Timezone Helper ─────────────────────────────────────────────────────
  const getISTDate = () => new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });

  // ── Stream Lesson ────────────────────────────────────────────────────────────
  // ── Fetch resources for a cached lesson (background, non-blocking) ──────────
  const fetchLessonResources = React.useCallback(async (day: number) => {
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_resources", day }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setLessonResources(data);
      setShowResourceExplorer("videos"); // auto-open panel
    } catch { /* non-fatal */ }
  }, []);

  const streamLesson = async (day: number) => {
    // Check cache first — if we have it, load instantly without API call
    if (loadCachedLesson(day)) {
      setActiveTab("lesson");
      // Check if admin has provided resources for this day
      const adminDay = getAdminDayData(day);
      if (adminDay && adminDay.resources?.length > 0) {
        const ytVideos = adminDay.resources.filter(r => r.type === "youtube");
        setLessonResources({
          hindiVideos: ytVideos.map(r => ({
            videoId: (() => { try { return new URL(r.url).searchParams.get("v") ?? ""; } catch { return ""; } })(),
            title: r.title,
            channelName: r.channelName,
            thumbnailUrl: r.thumbnailUrl,
            url: r.url,
          })),
          englishVideos: [],
          webArticles: adminDay.resources.filter(r => r.type !== "youtube").map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.description,
          })),
        });
        setShowResourceExplorer("videos");
        return; // Skip API resource fetch — use admin resources
      }
      // Fallback: fetch resources from AI if no admin content
      setLessonResources(null);
      setShowResourceExplorer(false);
      fetchLessonResources(day);
      return;
    }

    // Check for admin-provided content
    const adminDay2 = getAdminDayData(day);
    if (adminDay2 && adminDay2.lessonContent) {
      setLessonContent(adminDay2.lessonContent);
      setStreamingContent(adminDay2.lessonContent);
      setCurrentLessonDay(day);
      setActiveTab("lesson");
      // Set admin-provided resources
      if (adminDay2.resources?.length > 0) {
        const ytVideos = adminDay2.resources.filter(r => r.type === "youtube");
        setLessonResources({
          hindiVideos: ytVideos.map(r => ({
            videoId: (() => { try { return new URL(r.url).searchParams.get("v") ?? ""; } catch { return ""; } })(),
            title: r.title,
            channelName: r.channelName,
            thumbnailUrl: r.thumbnailUrl,
            url: r.url,
          })),
          englishVideos: [],
          webArticles: adminDay2.resources.filter(r => r.type !== "youtube").map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.description,
          })),
        });
        setShowResourceExplorer("videos");
      }
      cacheLesson(day, adminDay2.lessonContent);
      return;
    }

    setIsStreaming(true);
    setStreamingContent("");
    setLessonResources(null);
    setCurrentLessonDay(day);
    setActiveTab("lesson");
    lessonStartTime.current = Date.now(); // Start tracking time

    let buffer = "";
    let sentinelFound = false;
    let jsonBuffer = "";

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_lesson", day, learnerProfile: learner.profile }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) { buffer += decoder.decode(); break; }
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        if (!sentinelFound) {
          const si = buffer.indexOf(SENTINEL);
          if (si !== -1) {
            sentinelFound = true;
            const content = buffer.slice(0, si);
            jsonBuffer = buffer.slice(si + SENTINEL.length);
            setStreamingContent(content);
          } else {
            setStreamingContent(buffer);
          }
        } else {
          jsonBuffer += chunk;
        }
      }

      if (jsonBuffer.trim()) {
        try {
          const parsed = JSON.parse(jsonBuffer);
          setLessonResources(parsed);
          setShowResourceExplorer("videos"); // auto-open side panel
        } catch { /* non-fatal */ }
      }

      const rawContent = sentinelFound ? buffer.slice(0, buffer.indexOf(SENTINEL)) : buffer;
      const content = stripLeakedResources(rawContent);
      setLessonContent(content);
      cacheLesson(day, content);
      saveLessonSnapshot(day, { content, resources: lessonResources ?? undefined });
      return content;
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Load Quiz ────────────────────────────────────────────────────────────────
  const loadQuiz = async (testDay: number) => {
    setQuizLoading(true);
    setQuiz(null);
    setAnswers({});
    setEvalResult(null);

    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_test", day: testDay,
        learnerProfile: learner.profile, weakTopics: learner.weakTopics,
      }),
    });
    if (!res.ok) throw new Error("Quiz API failed");
    const data = await res.json();
    setQuiz(data);
    saveLessonSnapshot(testDay, { quiz: data });
    setQuizLoading(false);
  };

  // ── Submit Quiz ──────────────────────────────────────────────────────────────
  const submitQuiz = async () => {
    if (!quiz) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate_test",
          day: parseInt(quiz.title.match(/Day (\d+)/)?.[1] ?? "1"),
          learnerProfile: learner.profile,
          currentQuestionSet: quiz,
          userAnswers: answers,
        }),
      });
      const result: EvalResult = await res.json();
      setEvalResult(result);

      const dayNum = parseInt(quiz.title.match(/Day (\d+)/)?.[1] ?? "1");
      const timeSpentMinutes = Math.round((Date.now() - (lessonStartTime.current || Date.now())) / 60000);
      const correctCount = result.correctCount ?? result.feedback.filter(f => f.isCorrect).length;
      const totalQs = result.totalQuestions ?? quiz.questions.length;

      if (result.passed) {
        completeDay(dayNum, correctCount, result.weakTopicsAdded ?? []);
        setConfettiTrigger(true);
        setTimeout(() => setConfettiTrigger(false), 100);
        console.log(`🎉 PASSED! Day ${dayNum} complete — ${correctCount}/${totalQs} correct`);

        // Show celebration screen
        setCelebrationData({
          day: dayNum,
          topic: getLessonByDay(dayNum)?.title ?? "Day " + dayNum,
          timeSpentMinutes: Math.max(1, timeSpentMinutes),
          xpEarned: correctCount * 5,
          streak: learner.streak,
          score: correctCount,
          totalQuestions: totalQs,
          passed: true,
        });
        setShowCelebration(true);
      } else {
        console.log(`❌ Failed — ${correctCount}/${totalQs}. Revise and retry.`);

        // Show celebration for fail too (with retry)
        setCelebrationData({
          day: dayNum,
          topic: getLessonByDay(dayNum)?.title ?? "Day " + dayNum,
          timeSpentMinutes: Math.max(1, timeSpentMinutes),
          xpEarned: Math.floor(correctCount * 2),
          streak: learner.streak,
          score: correctCount,
          totalQuestions: totalQs,
          passed: false,
        });
        setShowCelebration(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Next Lesson ──────────────────────────────────────────────────────────────
  const handleNextLesson = async () => {
    if (!quiz) return;
    const dayNum = parseInt(quiz.title.match(/Day (\d+)/)?.[1] ?? "1");
    const nextDay = dayNum + 1;
    if (nextDay > 100) return;
    try {
      await streamLesson(nextDay);
      setQuiz(null);
      setEvalResult(null);
      setAnswers({});
    } catch (e) {
      console.log(`❌ Error: ${e}`);
    }
  };

  // ── Lesson: read-aloud (Text-to-Speech) ─────────────────────────────────────
  const toggleListen = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const plainText = currentLesson
      .replace(/[#*_>`~]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\|/g, " ")
      .trim();
    const utterance = new SpeechSynthesisUtterance(plainText.slice(0, 6000));
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleLessonScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setReadingProgress(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0);
  };

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const handleSendChat = async (msg: string, modelId: string) => {
    // Admin mode activation — typing "kkj" in chat
    if (msg.trim().toLowerCase() === "kkj") {
      const now = new Date();
      const expires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      setAdminSession({
        isActive: true,
        activatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        viewingStudent: currentUser,
      });
      appendChat({
        role: "assistant",
        content: "🔐 **Admin mode activated!** 1 hour access granted.\n\nYou can now:\n- **Switch students** using the buttons above or type `view st_1` / `view st_2`\n- View any student's **progress, scores, weak topics**\n- Check **quiz results and analytics**\n- All data is **read-only** (no changes possible)\n\nType **'exit admin'** to deactivate early.",
        timestamp: Date.now(),
        model: "admin",
      });
      return;
    }

    // Admin view switching — typing "view st_1" or "view st_2"
    const viewMatch = msg.trim().toLowerCase().match(/^view\s+(st_\d)$/);
    if (viewMatch && adminSession.isActive) {
      const targetId = viewMatch[1] as StudentId;
      const targetProfile = STUDENT_PROFILES[targetId];
      if (!targetProfile) {
        appendChat({ role: "assistant", content: `❌ Student ID "${targetId}" not found. Available: st_1, st_2`, timestamp: Date.now() });
        return;
      }
      setAdminSession(prev => ({ ...prev, viewingStudent: targetId }));
      const raw = localStorage.getItem(getStorageKey(targetId));
      const data = raw ? { ...{ currentDay: 0, completedDays: [], xp: 0, streak: 0, weakTopics: [], badges: [], lastActiveDate: "" }, ...JSON.parse(raw) } : { currentDay: 0, completedDays: [], xp: 0, streak: 0, weakTopics: [], badges: [], lastActiveDate: "" };
      appendChat({
        role: "assistant",
        content: `📋 **Switched to ${targetProfile.emoji} ${targetProfile.name}**\n\n📊 **Progress Summary:**\n- Current Day: ${data.currentDay}/${CURRICULUM.length}\n- XP Earned: ${data.xp}\n- Streak: ${data.streak} days\n- Completed Days: ${data.completedDays.length} (${Math.round((data.completedDays.length / CURRICULUM.length) * 100)}%)\n- Weak Topics: ${data.weakTopics.length > 0 ? data.weakTopics.slice(0, 8).join(", ") : "None"}\n- Badges: ${data.badges.length > 0 ? data.badges.join(", ") : "None yet"}\n- Last Active: ${data.lastActiveDate || "Never"}`,
        timestamp: Date.now(),
        model: "admin",
      });
      return;
    }

    // Admin view all — show both students
    if (msg.trim().toLowerCase() === "view all" && adminSession.isActive) {
      setAdminSession(prev => ({ ...prev, viewingStudent: null }));
      const allData = Object.entries(STUDENT_PROFILES).map(([id, profile]) => {
        const raw = localStorage.getItem(getStorageKey(id as StudentId));
      const data = raw ? { ...{ currentDay: 0, completedDays: [], xp: 0, streak: 0, weakTopics: [] }, ...JSON.parse(raw) } : { currentDay: 0, completedDays: [], xp: 0, streak: 0, weakTopics: [] };
        return `${profile.emoji} **${profile.name}** (${id})\n   Day: ${data.currentDay}/${CURRICULUM.length} | XP: ${data.xp} | Streak: ${data.streak} | Completed: ${data.completedDays.length} | Weak: ${data.weakTopics.length}`;
      }).join("\n\n");
      appendChat({
        role: "assistant",
        content: `📊 **All Students Overview:**\n\n${allData}\n\nType \`view st_1\` or \`view st_2\` to see detailed data.`,
        timestamp: Date.now(),
        model: "admin",
      });
      return;
    }

    // Admin mode deactivation
    if (msg.trim().toLowerCase() === "exit admin" && adminSession.isActive) {
      setAdminSession({ isActive: false, activatedAt: null, expiresAt: null, viewingStudent: null });
      appendChat({
        role: "assistant",
        content: "🔓 Admin mode deactivated. Back to normal mode.",
        timestamp: Date.now(),
      });
      return;
    }

    // Auto-expire admin session
    if (adminSession.isActive && adminSession.expiresAt) {
      if (new Date() > new Date(adminSession.expiresAt)) {
        setAdminSession({ isActive: false, activatedAt: null, expiresAt: null, viewingStudent: null });
        appendChat({
          role: "assistant",
          content: "⏰ Admin mode expired (1-hour limit). Type 'kkj' again to re-activate.",
          timestamp: Date.now(),
        });
        return;
      }
    }

    const userMsg: ChatMessage = { role: "user", content: msg, timestamp: Date.now() };
    appendChat(userMsg);
    setChatLoading(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat", day: learner.currentDay,
          learnerProfile: learner.profile, weakTopics: learner.weakTopics,
          chatHistory: [...learner.chatHistory, userMsg], chatModel: modelId,
        }),
      });
      const data = await res.json();
      appendChat({
        role: "assistant",
        content: data.reply ?? "Sorry, something went wrong. Please try again.",
        timestamp: Date.now(), model: data.modelUsed ?? modelId,
      });
    } catch {
      appendChat({ role: "assistant", content: "Network error. Please check your connection.", timestamp: Date.now() });
    } finally {
      setChatLoading(false);
    }
  };



  const currentLesson = stripLeakedResources(streamingContent || lessonContent);
  const currentMeta = getLessonByDay(currentLessonDay || learner.currentDay);

  const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode; dot?: boolean; disabled?: boolean }> = [
    { id: "home", label: "Home", icon: <HomeIcon size={17} /> },
    { id: "lesson", label: "Day", icon: <BookOpen size={17} />, dot: !!currentLesson },
    { id: "chat", label: "AI Chat", icon: <MessageSquare size={17} />, disabled: quizInProgress },
    { id: "tests", label: "Tests", icon: <Target size={17} /> },
    { id: "roadmap", label: "Journey", icon: <Map size={17} /> },
  ];

  // Handle login completion
  const handleLoginComplete = (sid: StudentId) => {
    const profile = STUDENT_PROFILES[sid];
    const persistedStateRaw = localStorage.getItem(getStorageKey(sid));
    const persistedState = persistedStateRaw ? JSON.parse(persistedStateRaw) : null;
    const persistedName = persistedState?.name?.trim() || localStorage.getItem(`csa_${sid}_customname`)?.trim();
    const persistedProfile = persistedState?.profile?.trim() || localStorage.getItem(`csa_${sid}_customprofile`)?.trim();
    const nextName = persistedName || profile.name;
    const nextProfile = persistedProfile || `${nextName} — ${profile.description}`;

    setStudentId(sid);
    setCurrentUser(sid);
    setIsLoggedIn(true);
    setShowOnboarding(false);
    localStorage.setItem("csa_current_user", sid);
    localStorage.setItem("csa_device_auth", JSON.stringify({ studentId: sid, isLoggedIn: true, deviceId: getDeviceId(), lastLogin: new Date().toISOString() }));
    updateProfile(nextName, nextProfile);
  };

  // Handle admin login (password "kkj")
  const handleAdminLogin = () => {
    setIsAdminUser(true);
    setShowAdminPanel(true);
    setShowOnboarding(false);
  };

  const saveLessonContext = React.useCallback(() => {
    if (!currentLessonDay) return;
    setLearner((prev) => ({
      ...prev,
      lessonContextByDay: {
        ...(prev.lessonContextByDay ?? {}),
        [currentLessonDay]: lessonContext.trim(),
      },
    }));
    setContextSaved(true);
    setTimeout(() => setContextSaved(false), 1600);
  }, [currentLessonDay, lessonContext, setLearner]);

  const handleSaveDisplayName = () => {
    if (!currentUser) {
      setDisplayNameMsg({ type: "err", text: "Please log in first." });
      return;
    }
    if (!displayNamePassword.trim()) {
      setDisplayNameMsg({ type: "err", text: "Enter your password to confirm the change." });
      return;
    }
    if (!checkPassword(currentUser, displayNamePassword)) {
      setDisplayNameMsg({ type: "err", text: "Incorrect password. Please try again." });
      return;
    }

    const key = `csa_${currentUser}_name_edits`;
    const previousEdits = Number(localStorage.getItem(key) || "0");
    if (previousEdits >= 2) {
      setDisplayNameMsg({ type: "err", text: "You can only change your display name twice after the default name." });
      return;
    }

    const nextName = editName.trim() || learner.name;
    updateProfile(nextName, learner.profile);
    localStorage.setItem(key, String(previousEdits + 1));
    localStorage.setItem(`csa_${currentUser}_customname`, nextName);
    localStorage.setItem(`csa_${currentUser}_customprofile`, learner.profile);
    setDisplayNamePassword("");
    setDisplayNameMsg({ type: "ok", text: `✅ Display name updated. ${1 - (previousEdits + 1)} change${1 - (previousEdits + 1) === 1 ? "" : "s"} left.` });
  };

  // Logout — clears Firebase session + local auth, returns to login screen
  const handleLogout = async () => {
    await logoutStudent();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setStudentId(null);
    setShowSettings(false);
    setShowOnboarding(true);
    // Clear all session state — including admin mode to prevent privilege carry-over
    setAdminSession({ isActive: false, activatedAt: null, expiresAt: null, viewingStudent: null });
    setLessonContent(""); setStreamingContent(""); setLessonResources(null);
    setQuiz(null); setEvalResult(null); setAnswers({});
    setShowChangePwd(false); setChangePwdNew(""); setChangePwdConfirm(""); setChangePwdMsg(null);
  };

  // Change password — updates Firebase Auth + local cache
  const handleChangePassword = async () => {
    if (!changePwdNew.trim()) { setChangePwdMsg({ type: "err", text: "Enter a new password." }); return; }
    if (changePwdNew !== changePwdConfirm) { setChangePwdMsg({ type: "err", text: "Passwords don't match!" }); return; }
    if (!currentUser) { setChangePwdMsg({ type: "err", text: "Not logged in." }); return; }
    const ok = await changePassword(currentUser, changePwdNew);
    if (ok) {
      setChangePwdMsg({ type: "ok", text: "✅ Password changed! Use it next time you log in." });
      setChangePwdNew(""); setChangePwdConfirm("");
      setTimeout(() => { setChangePwdMsg(null); setShowChangePwd(false); }, 2500);
    } else {
      setChangePwdMsg({ type: "err", text: "Failed — please log out and log back in, then try again." });
    }
  };

  // Factory reset — wipes all progress AND logs out
  const handleFactoryReset = async () => {
    if (!confirm("⚠️ Factory Reset\n\nThis will permanently delete ALL your progress (XP, streaks, lessons, badges).\n\nYour login account is NOT deleted — you can log back in with the same password and start fresh.\n\nThis cannot be undone. Continue?")) return;
    resetProgress();
    setLessonContent(""); setStreamingContent(""); setLessonResources(null);
    setQuiz(null); setEvalResult(null); setAnswers({});
    await logoutStudent();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setStudentId(null);
    setShowSettings(false);
    setShowOnboarding(true);
    // Clear admin mode — must not carry over to the login screen
    setAdminSession({ isActive: false, activatedAt: null, expiresAt: null, viewingStudent: null });
    setShowChangePwd(false); setChangePwdNew(""); setChangePwdConfirm(""); setChangePwdMsg(null);
  };

  // Auto-expire admin session check
  React.useEffect(() => {
    if (adminSession.isActive && adminSession.expiresAt) {
      const timer = setInterval(() => {
        if (new Date() > new Date(adminSession.expiresAt!)) {
          setAdminSession({ isActive: false, activatedAt: null, expiresAt: null, viewingStudent: null });
        }
      }, 60000); // Check every minute
      return () => clearInterval(timer);
    }
  }, [adminSession.isActive]);

  // Render a neutral skeleton on SSR — identical on server and client, no mismatch
  if (!mounted) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "#0f172a", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎓</div>
        <div style={{ color: "#94a3b8", fontSize: 14, fontFamily: "system-ui,sans-serif" }}>Loading Computer Skills Academy…</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", height: "100dvh", overflow: "hidden", background: "var(--bg)" }}>
      <ConfettiEffect trigger={confettiTrigger} />

      {/* Login Screen */}
      {showOnboarding && (
        <LoginScreen onComplete={handleLoginComplete} onAdminLogin={handleAdminLogin} />
      )}

      {/* Onboarding Tour for first-time users */}
      {showStudentOnboarding && (
        <OnboardingFlow onComplete={() => {
          setShowStudentOnboarding(false);
          if (typeof window !== "undefined") localStorage.setItem("csa_student_onboarding_seen", "true");
        }} />
      )}

      {/* Admin Panel */}
      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}

      {/* Admin Badge & Student Switcher */}
      {adminSession.isActive && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
          background: "linear-gradient(90deg, #7c3aed22, #6366f122)",
          borderBottom: "2px solid #7c3aed",
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#a78bfa", flexShrink: 0 }}>
            🔐 ADMIN MODE
          </span>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginRight: 4 }}>|</span>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", flexShrink: 0 }}>
            View:
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.entries(STUDENT_PROFILES).map(([id, profile]) => (
              <button
                key={id}
                onClick={() => {
                  setAdminSession(prev => ({ ...prev, viewingStudent: id as StudentId }));
                  const raw = localStorage.getItem(getStorageKey(id as StudentId));
      const adminData = raw ? { ...{ currentDay: 0, completedDays: [], testScores: {}, weakTopics: [], xp: 0, streak: 0, lastActiveDate: "", badges: [], preferredChatModel: "" }, ...JSON.parse(raw) } : { currentDay: 0, completedDays: [], xp: 0, streak: 0, weakTopics: [], badges: [], lastActiveDate: "" };
                  appendChat({
                    role: "assistant",
                    content: `📋 Switched to **${profile.name}** (${profile.emoji})\n\n📊 Progress: Day ${adminData.currentDay}/${CURRICULUM.length} | XP: ${adminData.xp} | Streak: ${adminData.streak} days\n✅ Completed Days: ${adminData.completedDays.length}\n📝 Weak Topics: ${adminData.weakTopics.length > 0 ? adminData.weakTopics.slice(0, 5).join(", ") : "None"}\n🏆 Badges: ${adminData.badges.length > 0 ? adminData.badges.join(", ") : "None yet"}`,
                    timestamp: Date.now(),
                  });
                }}
                style={{
                  padding: "3px 10px", borderRadius: 6,
                  fontSize: "0.72rem", fontWeight: 600,
                  border: adminSession.viewingStudent === id
                    ? "1.5px solid #7c3aed" : "1px solid var(--border)",
                  background: adminSession.viewingStudent === id
                    ? "#7c3aed33" : "var(--surface2)",
                  color: adminSession.viewingStudent === id ? "#a78bfa" : "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {profile.emoji} {profile.name}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--text-muted)", flexShrink: 0 }}>
            View all: <code style={{ color: "#a78bfa", background: "var(--surface2)", padding: "1px 5px", borderRadius: 4, fontSize: "0.63rem" }}>view st_1</code> or <code style={{ color: "#a78bfa", background: "var(--surface2)", padding: "1px 5px", borderRadius: 4, fontSize: "0.63rem" }}>view st_2</code>
          </div>
        </div>
      )}

      {/* Celebration Screen */}
      {showCelebration && celebrationData && (
        <CelebrationScreen
          data={celebrationData}
          onClose={() => {
            setShowCelebration(false);
            setCelebrationData(null);
            setEvalResult(null);
          }}
          onNext={async () => {
            setShowCelebration(false);
            setCelebrationData(null);
            const nextDay = celebrationData.day + 1;
            if (nextDay <= 100) {
              try { await streamLesson(nextDay); setQuiz(null); setEvalResult(null); setAnswers({}); }
              catch (e) { console.log(`❌ Error: ${e}`); }
            }
          }}
        />
      )}

      {/* ── Header ── */}
      <header className="app-header" style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
        borderBottom: "1px solid var(--border)", background: "var(--surface)",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, var(--brand), var(--brand2))", fontSize: "1.1rem",
          }}>🎓</div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>CSA</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Day {learner.currentDay || 1} • {learner.completedDays?.length ?? 0}/100</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isAdminUser && (
            <button
              className="btn-primary sm"
              onClick={() => setShowAdminPanel(true)}
              style={{ padding: "6px 12px", fontSize: "0.75rem" }}
            >
              <Shield size={12} /> Admin
            </button>
          )}
          <button className="btn-icon" onClick={() => { setEditName(learner.name); setEditProfile(learner.profile); setDisplayNamePassword(""); setDisplayNameMsg(null); setShowSettings(true); }} data-tip="Settings">
            <Settings size={14} />
          </button>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav style={{
        display: "flex", alignItems: "center", gap: 2, padding: "6px 12px 0",
        borderBottom: "1px solid var(--border)", background: "var(--surface)",
        overflowX: "auto", flexShrink: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            title={tab.disabled ? "Finish the quiz first" : undefined}
            style={tab.disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
          >
            <div className="nav-tab-icon" style={{ position: "relative", display: "flex", alignItems: "center" }}>
              {tab.icon}
              {tab.dot && <div className="nav-tab-dot" />}
            </div>
            <span>{tab.label}</span>
          </button>
        ))}

        {/* Current lesson indicator */}
        {currentMeta && currentLesson && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", animation: isStreaming ? "skelPulse 1s ease-in-out infinite" : "none" }} />
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Day {currentLessonDay}: {currentMeta.title}
            </span>
          </div>
        )}
      </nav>

      {/* ── Main Content ── */}
      <main className="main-content-shell" style={{ flex: 1, overflow: "hidden" }}>

        {/* HOME */}
        {activeTab === "home" && hydrated && (
          <div style={{ height: "100%", overflowY: "auto" }}>
            <HomeTab
              learner={learner}
              hydrated={hydrated}
              isStreaming={isStreaming}
              hasLesson={!!currentLesson}
              onStartDay={async (day) => {
                setCurrentLessonDay(day);
                setActiveTab("lesson");
              }}
              onContinueLesson={() => setActiveTab("lesson")}
              onGoQuiz={async () => {
                setCurrentLessonDay(learner.currentDay || 1);
                setActiveTab("lesson");
                if (!quiz && learner.currentDay > 0) {
                  try { await loadQuiz(learner.currentDay); } catch { /* ignore */ }
                }
              }}
              onAskAi={(prompt) => {
                setShowAskAiDrawer(true);
                handleSendChat(prompt, MODEL_ASSIGNMENTS.chat);
              }}
              onSelectDay={async (day) => {
                setCurrentLessonDay(day);
                setActiveTab("lesson");
              }}
              bookmarks={bookmarks}
              onToggleBookmark={toggleBookmark}
              studentView={studentView}
              onStudentViewChange={setStudentView}
            />
          </div>
        )}

        {/* DAY — Link-only view */}
        {activeTab === "lesson" && (
          <DayLinkView
            day={currentLessonDay || learner.currentDay || 0}
            dayData={getAdminDayData(currentLessonDay || learner.currentDay || 0)}
            learner={learner}
            isStreaming={isStreaming}
            lessonContent={currentLesson}
            quiz={quiz}
            quizLoading={quizLoading}
            answers={answers}
            evalResult={evalResult}
            isSubmitting={isSubmitting}
            onAnswer={(qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }))}
            onSubmitQuiz={submitQuiz}
            onNextLesson={handleNextLesson}
            onLoadQuiz={async () => {
              const day = currentLessonDay || learner.currentDay || 1;
              try { await loadQuiz(day); } catch { /* ignore */ }
            }}
            onStartDay={async (day) => {
              setCurrentLessonDay(day);
              setActiveTab("lesson");
            }}
            onAskAi={(prompt) => {
              setShowAskAiDrawer(true);
              handleSendChat(prompt, MODEL_ASSIGNMENTS.chat);
            }}
            onWatchVideo={(videoId, title, channel) => {
              setVideoPlayerInitialTab("tx");
              setVideoPlayerTarget({ videoId, videoTitle: title, channelName: channel });
            }}
          />
        )}

        {/* CHAT */}
        {activeTab === "chat" && (
          <div className="chat-page-container">
            <ChatPanel
              chatHistory={learner.chatHistory} learner={learner}
              onSendMessage={handleSendChat} onClearHistory={clearChat}
              onModelChange={setPreferredChatModel} isLoading={chatLoading}
            />
          </div>
        )}

        {/* TESTS */}
        {activeTab === "tests" && (
          <PeriodicTest
            completedDays={learner.completedDays}
            currentDay={learner.currentDay}
            testScores={learner.testScores}
            onAskAi={(prompt) => {
              setActiveTab("chat");
              setTimeout(() => {
                handleSendChat(prompt, MODEL_ASSIGNMENTS.chat);
              }, 200);
            }}
          />
        )}

        {/* ROADMAP */}
        {activeTab === "roadmap" && (
          <RoadmapPanel
            learner={learner}
            onJumpToDay={async (day) => {
              try {
                await streamLesson(day);
              } catch (e) {
                console.log(`❌ Error: ${e}`);
              }
            }}
          />
        )}


      </main>

      {/* ── Floating Ask AI button (lesson tab, hidden while quiz is active) ── */}
      {activeTab === "lesson" && currentLesson && !isStreaming && !quizInProgress && !showAskAiDrawer && (
        <button className="ask-ai-fab" onClick={() => setShowAskAiDrawer(true)} title="Ask AI">
          <Sparkles size={18} /> <span>Ask AI</span>
        </button>
      )}

      {/* ── Ask AI slide-in drawer ── */}
      {showAskAiDrawer && (
        <>
          <div className="ask-ai-backdrop" onClick={() => setShowAskAiDrawer(false)} />
          <div className="ask-ai-drawer">
            <ChatPanel
              compact
              onClose={() => setShowAskAiDrawer(false)}
              chatHistory={learner.chatHistory} learner={learner}
              onSendMessage={handleSendChat} onClearHistory={clearChat}
              onModelChange={setPreferredChatModel} isLoading={chatLoading}
            />
          </div>
        </>
      )}

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="bottom-nav-mobile">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            title={tab.disabled ? "Finish the quiz first" : undefined}
            style={tab.disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
          >
            <div className="nav-tab-icon" style={{ position: "relative", display: "flex", alignItems: "center" }}>
              {tab.icon}
              {tab.dot && <div className="nav-tab-dot" />}
            </div>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Resource Explorer Side Panel (Videos + Blogs & Links) ── */}
      {activeTab === "lesson" && showResourceExplorer && lessonResources && (
        <ResourceExplorer
          resources={lessonResources}
          initialTab={showResourceExplorer}
          onClose={() => setShowResourceExplorer(false)}
          onSummarize={(id, title) => { setVideoPlayerInitialTab("ai"); setVideoPlayerTarget({ videoId: id, videoTitle: title }); }}
          onWatch={(id, title, channel) => { setVideoPlayerInitialTab("tx"); setVideoPlayerTarget({ videoId: id, videoTitle: title, channelName: channel }); }}
        />
      )}

      {/* ── In-App Video Player ── */}
      {videoPlayerTarget && (
        <VideoPlayerModal
          videoId={videoPlayerTarget.videoId}
          videoTitle={videoPlayerTarget.videoTitle}
          channelName={videoPlayerTarget.channelName}
          initialTab={videoPlayerInitialTab}
          onClose={() => setVideoPlayerTarget(null)}
        />
      )}

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div className="scale-in" style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 460 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <User size={16} style={{ color: "var(--brand)" }} />
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>Profile & Settings</span>
              </div>
              <button className="btn-icon" onClick={() => setShowSettings(false)}><XCircle size={15} /></button>
            </div>

            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: "12px 14px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Account</p>
                <p style={{ fontSize: "0.86rem", color: "var(--text)", lineHeight: 1.5 }}>
                  Your profile name is synced across devices. After login, the account is currently focused on password protection and progress safety.
                </p>
              </div>

              {/* Progress summary */}
              <div style={{ padding: "12px 14px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>📊 Progress Summary</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: "0.8rem" }}>
                  {[
                    ["Days done", `${learner.completedDays.length}/100`],
                    ["XP earned", String(learner.xp)],
                    ["Streak", `${learner.streak} days`],
                    ["Badges", String(learner.badges.length)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ color: "var(--text-muted)" }}>
                      {k}: <strong style={{ color: "var(--text)" }}>{v}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "12px 14px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Display Name</p>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 8 }}>You can change it only twice after the default name. This requires your password.</p>
                <input
                  type="text"
                  className="input-field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your display name"
                  style={{ marginBottom: 8 }}
                />
                <input
                  type="password"
                  className="input-field"
                  value={displayNamePassword}
                  onChange={(e) => setDisplayNamePassword(e.target.value)}
                  placeholder="Confirm password"
                  style={{ marginBottom: 8 }}
                />
                {displayNameMsg && (
                  <p style={{ fontSize: "0.78rem", color: displayNameMsg.type === "ok" ? "var(--green)" : "var(--red)", fontWeight: 600, marginBottom: 8 }}>
                    {displayNameMsg.text}
                  </p>
                )}
                <button className="btn-primary" onClick={handleSaveDisplayName} disabled={!editName.trim() || !displayNamePassword.trim()}>
                  Save Display Name
                </button>
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid var(--border)", margin: "2px 0" }} />

              {/* Change Password */}
              <div>
                <button
                  onClick={() => {
                    setShowChangePwd(!showChangePwd);
                    setChangePwdMsg(null);
                    setChangePwdNew(""); setChangePwdConfirm("");
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", fontWeight: 600, fontSize: "0.84rem", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span>🔑</span>
                  <span style={{ flex: 1 }}>Change Password</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{showChangePwd ? "▲" : "▼"}</span>
                </button>
                {showChangePwd && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      type="password" className="input-field"
                      placeholder="New password"
                      value={changePwdNew}
                      onChange={e => setChangePwdNew(e.target.value)}
                    />
                    <input
                      type="password" className="input-field"
                      placeholder="Confirm new password"
                      value={changePwdConfirm}
                      onChange={e => setChangePwdConfirm(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleChangePassword()}
                    />
                    {changePwdMsg && (
                      <p style={{ fontSize: "0.78rem", color: changePwdMsg.type === "ok" ? "var(--green)" : "var(--red)", fontWeight: 600, margin: 0 }}>
                        {changePwdMsg.text}
                      </p>
                    )}
                    <button
                      className="btn-primary"
                      onClick={handleChangePassword}
                      disabled={!changePwdNew || !changePwdConfirm}
                    >
                      Update Password
                    </button>
                  </div>
                )}
              </div>

              {/* Switch Profile / Logout */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleLogout}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "rgba(251,191,36,0.08)", color: "var(--amber)", border: "1px solid rgba(251,191,36,0.25)", cursor: "pointer", fontWeight: 600, fontSize: "0.84rem", fontFamily: "inherit" }}
                >
                  🔄 Switch Profile
                </button>
                <button
                  onClick={handleLogout}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "rgba(251,191,36,0.06)", color: "var(--amber)", border: "1px solid rgba(251,191,36,0.2)", cursor: "pointer", fontWeight: 600, fontSize: "0.84rem", fontFamily: "inherit" }}
                >
                  🚪 Logout
                </button>
              </div>

              {/* Danger zone */}
              <div style={{ borderTop: "1px solid var(--border)", margin: "2px 0" }} />
              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Danger Zone</p>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "rgba(239,68,68,0.08)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", fontFamily: "inherit" }}
                  onClick={() => {
                    if (confirm("Reset all progress? (You stay logged in, but all days/XP/streaks are deleted.)")) {
                      resetProgress(); setShowSettings(false);
                      setLessonContent(""); setStreamingContent(""); setLessonResources(null); setQuiz(null);
                    }
                  }}
                >
                  🔄 Reset Progress
                </button>
                <button
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "rgba(239,68,68,0.15)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.35)", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", fontFamily: "inherit" }}
                  onClick={handleFactoryReset}
                >
                  🗑️ Factory Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
