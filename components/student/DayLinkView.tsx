"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Play, Pause, SkipForward, SkipBack, ExternalLink, Globe,
  Sparkles, CheckCircle2, Target, ArrowRight, Loader2, RotateCcw,
  MessageSquare, List, Volume2, X, ChevronDown, ChevronUp, Clock,
  FileText, Brain, BookOpen, ListChecks,
} from "lucide-react";
import type { AdminDayContent, AdminResourceLink } from "@/types";
import type { LearnerState, QuizQuestion } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuizData { title: string; questions: QuizQuestion[]; }
interface EvalFeedback {
  questionId: string; isCorrect: boolean;
  correctAnswer: string; studentAnswer: string; explanation: string;
}
interface EvalResult {
  passed: boolean; overallScore: number; totalQuestions?: number; correctCount?: number;
  feedback: EvalFeedback[]; weakTopicsAdded: string[]; mentorMessage: string;
}

interface Props {
  day: number;
  dayData: AdminDayContent | null;
  learner: LearnerState;
  isStreaming: boolean;
  lessonContent: string;
  quiz: QuizData | null;
  quizLoading: boolean;
  answers: Record<string, string>;
  evalResult: EvalResult | null;
  isSubmitting: boolean;
  onAnswer: (qId: string, val: string) => void;
  onSubmitQuiz: () => void;
  onNextLesson: () => void;
  onLoadQuiz: () => void;
  onStartDay: (day: number) => void;
  onAskAi: (prompt: string) => void;
  onWatchVideo: (videoId: string, title: string, channel: string) => void;
  onVideoClose?: () => void;
  videoCloseTrigger?: number;
  quizOnly?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getVideoId(url: string): string {
  try { return new URL(url).searchParams.get("v") ?? ""; } catch { return ""; }
}

function getThumbnail(url: string): string {
  const id = getVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

// ─── Transcript Cache (localStorage) ──────────────────────────────────────────
const TRANSCRIPT_KEY = "csa_transcripts";

function getTranscriptCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(TRANSCRIPT_KEY) || "{}"); } catch { return {}; }
}

function saveTranscriptCache(cache: Record<string, string>) {
  try { localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(cache)); } catch {}
}

function getCachedTranscript(videoId: string): string | null {
  return getTranscriptCache()[videoId] || null;
}

async function fetchTranscript(videoId: string): Promise<string> {
  const cached = getCachedTranscript(videoId);
  if (cached) return cached;

  try {
    const res = await fetch(`https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3`);
    if (!res.ok) {
      const res2 = await fetch(`https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&kind=asr&fmt=json3`);
      if (!res2.ok) return "";
      const data = await res2.json();
      const text = (data.events || [])
        .filter((e: any) => e.segs)
        .map((e: any) => e.segs.map((s: any) => s.utf8).join(""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const cache = getTranscriptCache();
      cache[videoId] = text;
      saveTranscriptCache(cache);
      return text;
    }
    const data = await res.json();
    const text = (data.events || [])
      .filter((e: any) => e.segs)
      .map((e: any) => e.segs.map((s: any) => s.utf8).join(""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const cache = getTranscriptCache();
    cache[videoId] = text;
    saveTranscriptCache(cache);
    return text;
  } catch {
    return "";
  }
}

// ─── Quiz View ────────────────────────────────────────────────────────────────
function QuizView({
  quiz, answers, evalResult, onAnswer, onSubmit, onNextLesson,
  isSubmitting, day, onLoadQuiz, quizLoading,
}: {
  quiz: QuizData | null; answers: Record<string, string>; evalResult: EvalResult | null;
  onAnswer: (qId: string, val: string) => void; onSubmit: () => void;
  onNextLesson: () => void; isSubmitting: boolean; day: number;
  onLoadQuiz: () => void; quizLoading: boolean;
}) {
  if (quizLoading) {
    return (
      <div style={{ textAlign: "center", padding: "30px 16px" }}>
        <Loader2 size={24} className="spinner" style={{ color: "var(--brand)", margin: "0 auto 8px" }} />
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading quiz…</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ textAlign: "center", padding: "30px 16px" }}>
        <Target size={24} style={{ color: "var(--brand)", margin: "0 auto 8px", opacity: 0.5 }} />
        <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Ready for the quiz?</p>
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 10 }}>Need 67% to unlock Day {day + 1}</p>
        <button onClick={onLoadQuiz} className="watch-btn purple" style={{ maxWidth: 180, margin: "0 auto" }}>
          <Target size={13} /> Start Quiz
        </button>
      </div>
    );
  }

  const allAnswered = quiz.questions.every(q => answers[q.id]?.trim());

  return (
    <div>
      {evalResult && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 12, textAlign: "center",
          background: evalResult.passed ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${evalResult.passed ? "var(--green)" : "var(--red)"}30`,
          color: evalResult.passed ? "var(--green)" : "var(--red)",
          fontWeight: 700, fontSize: "0.82rem",
        }}>
          {evalResult.passed ? "🎉" : "💪"} {evalResult.passed
            ? `PASSED — ${evalResult.correctCount}/${evalResult.totalQuestions}`
            : `${evalResult.correctCount}/${evalResult.totalQuestions} — Need 67%`}
        </div>
      )}

      {evalResult?.mentorMessage && (
        <div style={{
          padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: "0.75rem",
          background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)", lineHeight: 1.5,
        }}>
          {evalResult.mentorMessage}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {quiz.questions.map((q, idx) => {
          const feedback = evalResult?.feedback.find(f => f.questionId === q.id);
          const isCorrect = feedback?.isCorrect;
          const isMCQ = q.type === "mcq" || q.type === "tf";

          return (
            <div key={q.id} style={{
              padding: 12, borderRadius: 10, background: "var(--surface)",
              border: `1px solid ${feedback ? (isCorrect ? "var(--green)" : "var(--red)") : "var(--border)"}`,
            }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", marginBottom: 8, lineHeight: 1.4 }}>
                <span style={{ color: "var(--brand2)", fontWeight: 700 }}>Q{idx + 1}. </span>
                {q.question}
              </p>

              {isMCQ && q.options.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {q.options.map(opt => {
                    const isSelected = answers[q.id] === opt;
                    let bg = "var(--surface2)";
                    let border = "var(--border)";
                    let color = "var(--text2)";

                    if (feedback) {
                      if (opt === feedback.correctAnswer) { bg = "rgba(16,185,129,0.12)"; border = "var(--green)"; color = "var(--green)"; }
                      else if (isSelected && !isCorrect) { bg = "rgba(239,68,68,0.1)"; border = "var(--red)"; color = "var(--red)"; }
                    } else if (isSelected) {
                      bg = "rgba(99,102,241,0.12)"; border = "var(--brand)"; color = "var(--brand2)";
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => !evalResult && onAnswer(q.id, opt)}
                        disabled={!!evalResult}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, width: "100%",
                          padding: "8px 10px", borderRadius: 6, border: `1.5px solid ${border}`,
                          background: bg, color, fontSize: "0.78rem", fontWeight: 500,
                          cursor: evalResult ? "default" : "pointer", textAlign: "left",
                        }}
                      >
                        <span style={{
                          width: 16, height: 16, borderRadius: "50%", border: "2px solid currentColor",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.6rem",
                        }}>
                          {feedback && opt === feedback.correctAnswer && "✓"}
                          {feedback && isSelected && !isCorrect && opt !== feedback.correctAnswer && "✗"}
                          {!feedback && isSelected && "●"}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  placeholder="Type your answer…"
                  value={answers[q.id] ?? ""}
                  onChange={e => !evalResult && onAnswer(q.id, e.target.value)}
                  disabled={!!evalResult}
                  rows={2}
                  style={{
                    width: "100%", padding: "8px", borderRadius: 6,
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    color: "var(--text)", fontSize: "0.78rem", resize: "none", fontFamily: "inherit",
                  }}
                />
              )}

              {feedback && (
                <div style={{
                  marginTop: 6, padding: "6px 8px", borderRadius: 6, fontSize: "0.72rem",
                  background: isCorrect ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                  border: `1px solid ${isCorrect ? "var(--green)" : "var(--red)"}20`,
                  color: "var(--text2)", lineHeight: 1.4,
                }}>
                  {isCorrect ? "✅ " : `❌ ${feedback.correctAnswer}. `}
                  {feedback.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        {!evalResult ? (
          <button onClick={onSubmit} disabled={!allAnswered || isSubmitting} className="watch-btn purple"
            style={{ opacity: (!allAnswered || isSubmitting) ? 0.5 : 1, cursor: (!allAnswered || isSubmitting) ? "not-allowed" : "pointer" }}>
            {isSubmitting ? <><Loader2 size={14} className="spinner" /> Evaluating…</> : <><Target size={14} /> Submit</>}
          </button>
        ) : evalResult.passed ? (
          <button onClick={onNextLesson} className="watch-btn" style={{ background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff" }}>
            <ArrowRight size={14} /> Unlock Day {day + 1}
          </button>
        ) : (
          <button onClick={onSubmit} className="watch-btn purple">
            <RotateCcw size={14} /> Try Again
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DAY LINK VIEW — YouTube-Style Layout
// ══════════════════════════════════════════════════════════════════════════════

export default function DayLinkView({
  day, dayData, learner,
  quiz, quizLoading, answers, evalResult, isSubmitting,
  onAnswer, onSubmitQuiz, onNextLesson, onLoadQuiz,
  onStartDay, onAskAi, onWatchVideo, onVideoClose,
  videoCloseTrigger = 0,
  quizOnly = false,
}: Props) {
  const [activeVideo, setActiveVideo] = useState<number>(-1);
  const [watchedVideos, setWatchedVideos] = useState<Set<number>>(new Set());
  const [bottomTab, setBottomTab] = useState<"transcript" | "ai" | "quiz" | "none">("none");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [mobilePlaylistOpen, setMobilePlaylistOpen] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const links = dayData?.resources ?? [];
  const videoLinks = links.filter(l => l.type === "youtube");
  const hasVideos = videoLinks.length > 0;

  const currentVideo = activeVideo >= 0 ? videoLinks[activeVideo] : null;
  const currentVideoId = currentVideo ? getVideoId(currentVideo.url) : "";

  // Auto-load quiz in quiz-only mode
  useEffect(() => {
    if (quizOnly && !quiz && !quizLoading) onLoadQuiz();
  }, [quizOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle video close from external modal (advances playlist)
  useEffect(() => {
    if (videoCloseTrigger === 0) return;
    if (activeVideo >= 0) {
      setWatchedVideos(prev => new Set([...prev, activeVideo]));
      if (activeVideo < videoLinks.length - 1) {
        setActiveVideo(activeVideo + 1);
      } else {
        setActiveVideo(-1);
        setBottomTab("quiz");
        onLoadQuiz();
      }
    }
  }, [videoCloseTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load transcript when video changes
  useEffect(() => {
    if (activeVideo >= 0 && videoLinks[activeVideo]) {
      const vid = getVideoId(videoLinks[activeVideo].url);
      if (vid) {
        setLoadingTranscript(true);
        fetchTranscript(vid).then(t => {
          setCurrentTranscript(t);
          setLoadingTranscript(false);
        });
      }
    } else {
      setCurrentTranscript("");
    }
  }, [activeVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play a specific video — INLINE only, no modal
  const playVideo = useCallback((idx: number) => {
    if (idx === activeVideo) return;
    if (activeVideo >= 0) {
      setWatchedVideos(prev => new Set([...prev, activeVideo]));
    }
    setActiveVideo(idx);
    setMobilePlaylistOpen(false);
  }, [activeVideo]);

  // Start playlist from beginning
  const startPlaylist = useCallback(() => {
    setWatchedVideos(new Set());
    playVideo(0);
  }, [playVideo]);

  // Skip / prev
  const skipVideo = useCallback(() => {
    if (activeVideo < videoLinks.length - 1) playVideo(activeVideo + 1);
  }, [activeVideo, videoLinks, playVideo]);

  const prevVideo = useCallback(() => {
    if (activeVideo > 0) playVideo(activeVideo - 1);
  }, [activeVideo, playVideo]);

  // ─── Empty state ────────────────────────────────────────────────────────
  if (!day) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📚</div>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Select a day to begin</h3>
        <p style={{ fontSize: "0.82rem", maxWidth: 300, textAlign: "center", lineHeight: 1.5 }}>Pick a day from the sidebar to start learning.</p>
      </div>
    );
  }

  // ─── Quiz-only mode ─────────────────────────────────────────────────────
  if (quizOnly) {
    return (
      <div style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px" }}>
          <div style={{
            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
            borderRadius: 14, padding: "16px 20px", marginBottom: 16, color: "#fff",
          }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 800 }}>Day {day} Quiz</h2>
            <p style={{ fontSize: "0.72rem", opacity: 0.8 }}>{dayData?.title || ""} • Need 67% to pass</p>
          </div>
          <QuizView quiz={quiz} answers={answers} evalResult={evalResult}
            onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
            isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading} />
          {evalResult?.passed && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <a href={`https://t.me/csalearningbot?start=day${day + 1}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#229ED9", color: "#fff", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none" }}>
                💬 Continue in Telegram — Day {day + 1}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN VIEW — YouTube-style layout
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Day Header Bar ──────────────────────────────────────────────── */}
      <div style={{
        padding: "8px 14px", background: "var(--surface)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, var(--brand), var(--brand2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.7rem", fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>
          {day}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {dayData?.title || `Day ${day}`}
          </h2>
          {dayData?.description && (
            <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {dayData.description}
            </p>
          )}
        </div>
        {/* Mobile playlist toggle */}
        {hasVideos && (
          <button onClick={() => setMobilePlaylistOpen(!mobilePlaylistOpen)}
            className="mobile-playlist-toggle"
            style={{
              padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)",
              background: mobilePlaylistOpen ? "rgba(99,102,241,0.15)" : "var(--surface2)",
              color: mobilePlaylistOpen ? "var(--brand2)" : "var(--text-muted)",
              fontSize: "0.65rem", fontWeight: 600, cursor: "pointer",
              display: "none", alignItems: "center", gap: 3,
            }}>
            <List size={10} /> Playlist
          </button>
        )}
        <button onClick={() => setBottomTab(bottomTab === "quiz" ? "none" : "quiz")}
          style={{
            padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)",
            background: bottomTab === "quiz" ? "rgba(139,92,246,0.15)" : "var(--surface2)",
            color: bottomTab === "quiz" ? "#a78bfa" : "var(--text-muted)",
            fontSize: "0.65rem", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 3,
          }}>
          <Target size={10} /> Quiz
        </button>
        <button onClick={() => setBottomTab(bottomTab === "ai" ? "none" : "ai")}
          style={{
            padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)",
            background: bottomTab === "ai" ? "rgba(99,102,241,0.15)" : "var(--surface2)",
            color: bottomTab === "ai" ? "var(--brand2)" : "var(--text-muted)",
            fontSize: "0.65rem", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 3,
          }}>
          <Sparkles size={10} /> AI
        </button>
      </div>

      {/* ── Main: Player + Sidebar ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── Left Column: Video Player + Bottom Panel ─────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Video Player */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            {activeVideo >= 0 && currentVideo ? (
              <>
                {/* YouTube Embed — 16:9 */}
                <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#000", flexShrink: 0 }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1`}
                    title={currentVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                  />
                  {/* Now Playing badge */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    padding: "6px 10px",
                    background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.65rem", color: "#fff", fontWeight: 600, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {activeVideo + 1}/{videoLinks.length} — {currentVideo.title}
                    </span>
                  </div>
                </div>

                {/* Player Controls */}
                <div style={{
                  padding: "6px 10px", background: "var(--surface)", borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                }}>
                  <button onClick={prevVideo} disabled={activeVideo <= 0}
                    style={{
                      padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)",
                      background: "var(--surface2)", color: activeVideo <= 0 ? "var(--text-faint)" : "var(--text)",
                      fontSize: "0.65rem", fontWeight: 600, cursor: activeVideo <= 0 ? "default" : "pointer",
                      display: "flex", alignItems: "center", gap: 3, opacity: activeVideo <= 0 ? 0.4 : 1,
                    }}>
                    <SkipBack size={10} /> Prev
                  </button>
                  {/* Progress dots */}
                  <div style={{ flex: 1, display: "flex", gap: 2, justifyContent: "center" }}>
                    {videoLinks.map((_, i) => (
                      <div key={i} onClick={() => playVideo(i)}
                        style={{
                          width: i === activeVideo ? 16 : 5, height: 5, borderRadius: 3,
                          background: watchedVideos.has(i) ? "#10b981" : i === activeVideo ? "#ef4444" : "var(--border)",
                          cursor: "pointer", transition: "all 0.2s",
                        }} />
                    ))}
                  </div>
                  <button onClick={skipVideo} disabled={activeVideo >= videoLinks.length - 1}
                    style={{
                      padding: "4px 8px", borderRadius: 6,
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "#fff", fontSize: "0.65rem", fontWeight: 600, border: "none",
                      cursor: activeVideo >= videoLinks.length - 1 ? "default" : "pointer",
                      display: "flex", alignItems: "center", gap: 3,
                      opacity: activeVideo >= videoLinks.length - 1 ? 0.5 : 1,
                    }}>
                    {activeVideo < videoLinks.length - 1 ? <><SkipForward size={10} /> Next</> : <><Target size={10} /> Quiz</>}
                  </button>
                </div>

                {/* Bottom Panel */}
                {bottomTab !== "none" && (
                  <div style={{ height: 200, flexShrink: 0, overflow: "hidden", borderTop: "1px solid var(--border)", background: "var(--bg2)" }}>
                    {/* Tab switcher */}
                    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                      {([
                        { id: "transcript" as const, label: "Transcript", icon: <FileText size={10} /> },
                        { id: "ai" as const, label: "Ask AI", icon: <Brain size={10} /> },
                        { id: "quiz" as const, label: "Quiz", icon: <ListChecks size={10} /> },
                      ]).map(t => (
                        <button key={t.id} onClick={() => { setBottomTab(t.id); if (t.id === "quiz" && !quiz && !quizLoading) onLoadQuiz(); }}
                          style={{
                            flex: 1, padding: "6px 0", fontSize: "0.65rem", fontWeight: 600,
                            background: bottomTab === t.id ? "var(--bg2)" : "transparent",
                            color: bottomTab === t.id ? "var(--brand2)" : "var(--text-muted)",
                            border: "none", borderBottom: bottomTab === t.id ? "2px solid var(--brand)" : "2px solid transparent",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                          }}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                      <button onClick={() => setBottomTab("none")}
                        style={{ padding: "6px 8px", background: "transparent", border: "none", color: "var(--text-faint)", cursor: "pointer" }}>
                        <X size={11} />
                      </button>
                    </div>

                    <div style={{ height: "calc(100% - 32px)", overflowY: "auto" }} ref={transcriptRef}>
                      {bottomTab === "transcript" && (
                        <div style={{ padding: "10px 14px" }}>
                          {loadingTranscript ? (
                            <div style={{ textAlign: "center", padding: 14, color: "var(--text-muted)", fontSize: "0.72rem" }}>
                              <Loader2 size={13} className="spinner" style={{ display: "inline", marginRight: 5 }} /> Loading transcript…
                            </div>
                          ) : currentTranscript ? (
                            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                              {currentTranscript}
                            </p>
                          ) : (
                            <div style={{ textAlign: "center", padding: 14, color: "var(--text-faint)", fontSize: "0.72rem" }}>
                              No transcript available for this video
                            </div>
                          )}
                        </div>
                      )}

                      {bottomTab === "ai" && (
                        <div style={{ padding: "10px 14px" }}>
                          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 8 }}>
                            💡 Ask about this video or Day {day}&apos;s topic
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {[
                              { label: "💡 Explain simply", prompt: `Explain the video "${currentVideo?.title || `Day ${day}`}" in simple terms` },
                              { label: "📝 Key points", prompt: `Key points from "${currentVideo?.title || `Day ${day}`}"` },
                              { label: "❓ Quiz me", prompt: `Give me 3 practice questions about "${currentVideo?.title || `Day ${day}`}"` },
                              { label: "🔗 Real-life examples", prompt: `Real-life examples for "${currentVideo?.title || `Day ${day}`}"` },
                            ].map((item, i) => (
                              <button key={i} onClick={() => onAskAi(item.prompt)} style={{
                                display: "flex", alignItems: "center", gap: 6, width: "100%",
                                padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)",
                                background: "var(--surface)", color: "var(--text)", fontSize: "0.7rem",
                                fontWeight: 500, cursor: "pointer", textAlign: "left",
                              }}>
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {bottomTab === "quiz" && (
                        <div style={{ padding: "10px 14px" }}>
                          <QuizView quiz={quiz} answers={answers} evalResult={evalResult}
                            onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
                            isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ── No video — Day intro ──────────────────────────────────── */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
                {hasVideos ? (
                  <>
                    <div style={{
                      width: 56, height: 56, borderRadius: 14, overflow: "hidden", marginBottom: 12,
                      background: "var(--surface2)", border: "2px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {getThumbnail(videoLinks[0].url) ? (
                        <img src={getThumbnail(videoLinks[0].url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <Play size={22} style={{ color: "var(--text-faint)" }} />
                      )}
                    </div>
                    <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: 4, textAlign: "center" }}>
                      {dayData?.title || `Day ${day}`}
                    </h3>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 12, textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
                      {dayData?.description || `${videoLinks.length} video${videoLinks.length > 1 ? "s" : ""} to watch`}
                    </p>
                    <button onClick={startPlaylist} style={{
                      padding: "10px 22px", borderRadius: 10,
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "#fff", fontSize: "0.82rem", fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                      boxShadow: "0 4px 14px rgba(239,68,68,0.3)", border: "none",
                    }}>
                      <Play size={15} fill="#fff" /> Play All ({videoLinks.length} videos)
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>📚</div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>No videos yet</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Ask your teacher to add resources</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Playlist Sidebar ──────────────────────────────────── */}
        {hasVideos && (
          <div style={{
            width: 260, flexShrink: 0, borderLeft: "1px solid var(--border)",
            background: "var(--surface)", display: "flex", flexDirection: "column", overflow: "hidden",
          }}
            className="playlist-sidebar">

            {/* Sidebar Header */}
            <div style={{
              padding: "7px 12px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                <List size={11} /> Playlist
              </span>
              <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                {watchedVideos.size}/{videoLinks.length} watched
              </span>
            </div>

            {/* Playlist Items */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* ── Watched Section ── */}
              {watchedVideos.size > 0 && (
                <div>
                  <div style={{
                    padding: "4px 12px", fontSize: "0.58rem", fontWeight: 700, color: "#10b981",
                    textTransform: "uppercase" as const, letterSpacing: "0.05em",
                    display: "flex", alignItems: "center", gap: 3,
                  }}>
                    <CheckCircle2 size={9} /> Watched
                  </div>
                  {videoLinks.map((link, idx) => {
                    if (!watchedVideos.has(idx)) return null;
                    const thumb = getThumbnail(link.url);
                    return (
                      <div key={link.id} onClick={() => playVideo(idx)}
                        style={{
                          display: "flex", alignItems: "center", gap: 7,
                          padding: "5px 12px", cursor: "pointer",
                          borderBottom: "1px solid var(--border)", opacity: 0.55, transition: "opacity 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}>
                        <div style={{
                          width: 44, height: 32, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                          position: "relative", background: "var(--surface3)",
                        }}>
                          {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                          <div style={{
                            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(16,185,129,0.4)",
                          }}>
                            <CheckCircle2 size={11} color="#fff" />
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "0.64rem", fontWeight: 500, color: "var(--text-muted)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {link.title}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Up Next Section ── */}
              <div>
                {watchedVideos.size > 0 && (
                  <div style={{
                    padding: "4px 12px", fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase" as const, letterSpacing: "0.05em",
                    display: "flex", alignItems: "center", gap: 3,
                  }}>
                    <Clock size={9} /> Up Next
                  </div>
                )}
                {videoLinks.map((link, idx) => {
                  if (watchedVideos.has(idx)) return null;
                  const thumb = getThumbnail(link.url);
                  const isPlaying = activeVideo === idx;
                  return (
                    <div key={link.id} onClick={() => playVideo(idx)}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "5px 12px", cursor: "pointer",
                        background: isPlaying ? "rgba(239,68,68,0.08)" : "transparent",
                        borderLeft: isPlaying ? "3px solid #ef4444" : "3px solid transparent",
                        borderBottom: "1px solid var(--border)", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.background = "var(--surface2)"; }}
                      onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.background = "transparent"; }}>
                      <div style={{
                        width: 44, height: 32, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                        position: "relative", background: "var(--surface3)",
                      }}>
                        {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        <div style={{
                          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                          background: isPlaying ? "rgba(239,68,68,0.5)" : "rgba(0,0,0,0.3)",
                        }}>
                          {isPlaying
                            ? <Pause size={10} fill="#fff" color="#fff" />
                            : <Play size={10} fill="#fff" color="#fff" style={{ marginLeft: 1 }} />}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: "0.64rem", fontWeight: isPlaying ? 700 : 500,
                          color: isPlaying ? "var(--text)" : "var(--text2)",
                          lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {link.title}
                        </p>
                        {link.channelName && (
                          <p style={{ fontSize: "0.55rem", color: "var(--text-faint)", marginTop: 1 }}>
                            {link.channelName}
                          </p>
                        )}
                      </div>
                      <span style={{
                        fontSize: "0.58rem", fontWeight: 700, color: isPlaying ? "#ef4444" : "var(--text-faint)",
                        flexShrink: 0, width: 14, textAlign: "center",
                      }}>
                        {idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Footer */}
            <div style={{ padding: "6px 10px", borderTop: "1px solid var(--border)", display: "flex", gap: 4 }}>
              <a href={`https://pclearn.vercel.app/?day=${day}`} target="_blank" rel="noopener noreferrer"
                style={{
                  flex: 1, padding: "4px 6px", borderRadius: 5, textAlign: "center",
                  border: "1px solid var(--border)", background: "var(--surface2)",
                  color: "var(--text-muted)", fontSize: "0.6rem", fontWeight: 600,
                  textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                }}>
                <Globe size={9} /> Full Screen
              </a>
              <button onClick={() => { setBottomTab("quiz"); if (!quiz && !quizLoading) onLoadQuiz(); }}
                style={{
                  flex: 1, padding: "4px 6px", borderRadius: 5,
                  border: "1px solid var(--border)", background: "var(--surface2)",
                  color: "var(--text-muted)", fontSize: "0.6rem", fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                }}>
                <Target size={9} /> Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
