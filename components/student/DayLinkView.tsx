"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Play, Pause, SkipForward, SkipBack, ExternalLink, Globe,
  Sparkles, CheckCircle2, Target, ArrowRight, Loader2, RotateCcw,
  MessageSquare, List, X, Clock, FileText, Brain, ListChecks, BookOpen,
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

// ─── Transcript Cache ─────────────────────────────────────────────────────────
const TRANSCRIPT_KEY = "csa_transcripts";
function getTranscriptCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(TRANSCRIPT_KEY) || "{}"); } catch { return {}; }
}
function saveTranscriptCache(cache: Record<string, string>) {
  try { localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(cache)); } catch {}
}
async function fetchTranscript(videoId: string): Promise<string> {
  const cached = getTranscriptCache()[videoId];
  if (cached) return cached;
  try {
    const tryUrl = (kind?: string) =>
      `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}${kind ? `&kind=${kind}` : ""}&fmt=json3`;
    let res = await fetch(tryUrl());
    if (!res.ok) res = await fetch(tryUrl("asr"));
    if (!res.ok) return "";
    const data = await res.json();
    const text = (data.events || [])
      .filter((e: any) => e.segs)
      .map((e: any) => e.segs.map((s: any) => s.utf8).join(""))
      .join(" ").replace(/\s+/g, " ").trim();
    if (text) { const c = getTranscriptCache(); c[videoId] = text; saveTranscriptCache(c); }
    return text;
  } catch { return ""; }
}

// ══════════════════════════════════════════════════════════════════════════════
// QUIZ VIEW (compact for bottom panel)
// ══════════════════════════════════════════════════════════════════════════════
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
      <div style={{ textAlign: "center", padding: "24px 14px" }}>
        <Loader2 size={20} className="spinner" style={{ color: "var(--brand)", margin: "0 auto 6px" }} />
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading quiz…</p>
      </div>
    );
  }
  if (!quiz) {
    return (
      <div style={{ textAlign: "center", padding: "24px 14px" }}>
        <Target size={20} style={{ color: "var(--brand)", margin: "0 auto 6px", opacity: 0.5 }} />
        <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Ready for the quiz?</p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 10 }}>Need 67% to unlock Day {day + 1}</p>
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
          padding: "8px 14px", borderRadius: 8, marginBottom: 10, textAlign: "center",
          background: evalResult.passed ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${evalResult.passed ? "var(--green)" : "var(--red)"}30`,
          color: evalResult.passed ? "var(--green)" : "var(--red)", fontWeight: 700, fontSize: "0.82rem",
        }}>
          {evalResult.passed ? "🎉" : "💪"} {evalResult.passed
            ? `PASSED — ${evalResult.correctCount}/${evalResult.totalQuestions}`
            : `${evalResult.correctCount}/${evalResult.totalQuestions} — Need 67%`}
        </div>
      )}
      {evalResult?.mentorMessage && (
        <div style={{
          padding: "8px 12px", borderRadius: 8, marginBottom: 10, fontSize: "0.78rem",
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
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", marginBottom: 8, lineHeight: 1.4 }}>
                <span style={{ color: "var(--brand2)", fontWeight: 700 }}>Q{idx + 1}. </span>{q.question}
              </p>
              {isMCQ && q.options.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {q.options.map(opt => {
                    const isSelected = answers[q.id] === opt;
                    let bg = "var(--surface2)", border = "var(--border)", color = "var(--text2)";
                    if (feedback) {
                      if (opt === feedback.correctAnswer) { bg = "rgba(16,185,129,0.12)"; border = "var(--green)"; color = "var(--green)"; }
                      else if (isSelected && !isCorrect) { bg = "rgba(239,68,68,0.1)"; border = "var(--red)"; color = "var(--red)"; }
                    } else if (isSelected) { bg = "rgba(99,102,241,0.12)"; border = "var(--brand)"; color = "var(--brand2)"; }
                    return (
                      <button key={opt} onClick={() => !evalResult && onAnswer(q.id, opt)} disabled={!!evalResult}
                        style={{
                          display: "flex", alignItems: "center", gap: 7, width: "100%",
                          padding: "8px 12px", borderRadius: 7, border: `1.5px solid ${border}`,
                          background: bg, color, fontSize: "0.8rem", fontWeight: 500,
                          cursor: evalResult ? "default" : "pointer", textAlign: "left",
                        }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", border: "2px solid currentColor",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.65rem",
                        }}>
                          {feedback && opt === feedback.correctAnswer && "✓"}
                          {feedback && isSelected && !isCorrect && opt !== feedback.correctAnswer && "✗"}
                          {!feedback && isSelected && "●"}
                        </span>{opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea placeholder="Type your answer…" value={answers[q.id] ?? ""}
                  onChange={e => !evalResult && onAnswer(q.id, e.target.value)} disabled={!!evalResult} rows={2}
                  style={{
                    width: "100%", padding: "8px", borderRadius: 7,
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    color: "var(--text)", fontSize: "0.8rem", resize: "none", fontFamily: "inherit",
                  }} />
              )}
              {feedback && (
                <div style={{
                  marginTop: 6, padding: "6px 10px", borderRadius: 7, fontSize: "0.76rem",
                  background: isCorrect ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                  border: `1px solid ${isCorrect ? "var(--green)" : "var(--red)"}20`,
                  color: "var(--text2)", lineHeight: 1.4,
                }}>
                  {isCorrect ? "✅ " : `❌ ${feedback.correctAnswer}. `}{feedback.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        {!evalResult ? (
          <button onClick={onSubmit} disabled={!allAnswered || isSubmitting} className="watch-btn purple"
            style={{ opacity: (!allAnswered || isSubmitting) ? 0.5 : 1, cursor: (!allAnswered || isSubmitting) ? "not-allowed" : "pointer", padding: "8px 16px", fontSize: "0.82rem" }}>
            {isSubmitting ? <><Loader2 size={13} className="spinner" /> Evaluating…</> : <><Target size={13} /> Submit</>}
          </button>
        ) : evalResult.passed ? (
          <button onClick={onNextLesson} className="watch-btn" style={{ background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", padding: "8px 16px", fontSize: "0.82rem" }}>
            <ArrowRight size={13} /> Unlock Day {day + 1}
          </button>
        ) : (
          <button onClick={onSubmit} className="watch-btn purple" style={{ padding: "8px 16px", fontSize: "0.82rem" }}><RotateCcw size={13} /> Try Again</button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DAY LINK VIEW
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

  const links = dayData?.resources ?? [];
  const videoLinks = links.filter(l => l.type === "youtube");
  const hasVideos = videoLinks.length > 0;
  const currentVideo = activeVideo >= 0 ? videoLinks[activeVideo] : null;
  const currentVideoId = currentVideo ? getVideoId(currentVideo.url) : "";

  // Auto-load quiz in quiz-only mode
  useEffect(() => { if (quizOnly && !quiz && !quizLoading) onLoadQuiz(); }, [quizOnly]); // eslint-disable-line

  // Auto-play first video when day loads (if has videos and nothing playing)
  useEffect(() => {
    if (hasVideos && activeVideo === -1 && !quizOnly) {
      setActiveVideo(0);
    }
  }, [hasVideos, quizOnly]); // eslint-disable-line

  // Advance on external close
  useEffect(() => {
    if (videoCloseTrigger === 0) return;
    if (activeVideo >= 0) {
      setWatchedVideos(prev => new Set([...prev, activeVideo]));
      if (activeVideo < videoLinks.length - 1) setActiveVideo(activeVideo + 1);
      else { setActiveVideo(-1); setBottomTab("quiz"); onLoadQuiz(); }
    }
  }, [videoCloseTrigger]); // eslint-disable-line

  // Load transcript
  useEffect(() => {
    if (activeVideo >= 0 && videoLinks[activeVideo]) {
      const vid = getVideoId(videoLinks[activeVideo].url);
      if (vid) {
        setLoadingTranscript(true);
        fetchTranscript(vid).then(t => { setCurrentTranscript(t); setLoadingTranscript(false); });
      }
    } else { setCurrentTranscript(""); }
  }, [activeVideo]); // eslint-disable-line

  const playVideo = useCallback((idx: number) => {
    if (idx === activeVideo) return;
    if (activeVideo >= 0) setWatchedVideos(prev => new Set([...prev, activeVideo]));
    setActiveVideo(idx);
  }, [activeVideo]);

  const startPlaylist = useCallback(() => { setWatchedVideos(new Set()); playVideo(0); }, [playVideo]);
  const skipVideo = useCallback(() => { if (activeVideo < videoLinks.length - 1) playVideo(activeVideo + 1); }, [activeVideo, videoLinks.length, playVideo]);
  const prevVideo = useCallback(() => { if (activeVideo > 0) playVideo(activeVideo - 1); }, [activeVideo, playVideo]);

  // ─── Empty ──
  if (!day) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", padding: 16 }}>
        <div style={{ fontSize: "2.2rem", marginBottom: 8 }}>📚</div>
        <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Select a day to begin</h3>
        <p style={{ fontSize: "0.78rem", maxWidth: 260, textAlign: "center", lineHeight: 1.4 }}>Pick a day from the sidebar to start learning.</p>
      </div>
    );
  }

  // ─── Quiz-only ──
  if (quizOnly) {
    return (
      <div style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "12px 14px" }}>
          <div style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", borderRadius: 12, padding: "12px 16px", marginBottom: 14, color: "#fff" }}>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 800 }}>Day {day} Quiz</h2>
            <p style={{ fontSize: "0.72rem", opacity: 0.8 }}>{dayData?.title || ""} • Need 67% to pass</p>
          </div>
          <QuizView quiz={quiz} answers={answers} evalResult={evalResult}
            onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
            isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading} />
          {evalResult?.passed && (
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <a href={`https://t.me/csalearningbot?start=day${day + 1}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, background: "#229ED9", color: "#fff", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
                💬 Continue in Telegram — Day {day + 1}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Day Header ──────────────────────────────────────────────────── */}
      <div style={{
        padding: "8px 14px", background: "var(--surface)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, var(--brand), var(--brand2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.72rem", fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>{day}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {dayData?.title || `Day ${day}`}
          </h2>
          {dayData?.description && (
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {dayData.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Main: Player + Sidebar ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }} className="player-layout">

        {/* ── Left: Player + Below Panel (scrollable) ──────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, minHeight: 0 }} className="player-main">

          {activeVideo >= 0 && currentVideo ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              {/* ── Video Player (fixed compact height) ── */}
              <div style={{ flexShrink: 0, background: "#000", width: "100%", height: "clamp(180px, 28vh, 320px)" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1`}
                  title={currentVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              </div>

              {/* ── Title + Toolbar (always visible) ── */}
              <div style={{
                padding: "8px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}>
                {/* Title */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {currentVideo.title}
                  </p>
                  {currentVideo.channelName && (
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", flexShrink: 0 }}>{currentVideo.channelName}</span>
                  )}
                </div>

                {/* Controls row: Prev | Next | Full | Divider | Transcript | AI | Quiz */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {activeVideo > 0 && (
                    <button onClick={prevVideo} style={{
                      padding: "6px 12px", borderRadius: 6, border: "1.5px solid var(--border2)",
                      background: "var(--surface2)", color: "var(--text)", fontSize: "0.82rem", fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
                    }}>
                      <SkipBack size={13} /> Prev
                    </button>
                  )}
                  {activeVideo < videoLinks.length - 1 && (
                    <button onClick={skipVideo} style={{
                      padding: "6px 12px", borderRadius: 6, border: "none",
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "#fff", fontSize: "0.82rem", fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
                    }}>
                      <SkipForward size={13} /> Next
                    </button>
                  )}
                  <a href={`https://pclearn.vercel.app/?day=${day}`} target="_blank" rel="noopener noreferrer"
                    style={{
                      padding: "6px 10px", borderRadius: 6, border: "1.5px solid var(--border2)",
                      background: "var(--surface2)", color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 600,
                      textDecoration: "none", display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
                    }}>
                    <Globe size={13} /> Full
                  </a>
                  <div style={{ width: 1, height: 18, background: "var(--border2)", flexShrink: 0 }} />
                  {/* Toolbar toggles — highlighted when active */}
                  {[
                    { id: "transcript" as const, label: "📄 Transcript", activeBg: "#06b6d4", activeBgLight: "rgba(6,182,212,0.18)" },
                    { id: "ai" as const, label: "🤖 Ask AI", activeBg: "#6366f1", activeBgLight: "rgba(99,102,241,0.18)" },
                    { id: "quiz" as const, label: "🧪 Quiz", activeBg: "#8b5cf6", activeBgLight: "rgba(139,92,246,0.18)" },
                  ].map(t => {
                    const active = bottomTab === t.id;
                    return (
                      <button key={t.id} onClick={() => {
                        const next = active ? "none" : t.id;
                        setBottomTab(next);
                        if (next === "quiz" && !quiz && !quizLoading) onLoadQuiz();
                      }} style={{
                        padding: "6px 12px", borderRadius: 6,
                        border: `1.5px solid ${active ? t.activeBg : "var(--border2)"}`,
                        background: active ? t.activeBgLight : "var(--surface2)",
                        color: active ? t.activeBg : "var(--text2)",
                        fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
                        boxShadow: active ? `0 0 8px ${t.activeBg}30` : "none",
                      }}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Bottom Panel (scrollable) ── */}
              {bottomTab !== "none" && (
                <div style={{ flex: 1, overflow: "hidden", borderTop: "1px solid var(--border)", background: "var(--bg2)", display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {bottomTab === "transcript" && (
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <FileText size={14} style={{ color: "#06b6d4" }} />
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>
                            Transcript — Video {activeVideo + 1}
                          </span>
                        </div>
                        {loadingTranscript ? (
                          <div style={{ textAlign: "center", padding: 16, color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            <Loader2 size={14} className="spinner" style={{ display: "inline", marginRight: 6 }} /> Loading transcript…
                          </div>
                        ) : currentTranscript ? (
                          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                            {currentTranscript}
                          </p>
                        ) : (
                          <div style={{ textAlign: "center", padding: 16, color: "var(--text-faint)", fontSize: "0.8rem" }}>
                            No transcript available for this video
                          </div>
                        )}
                      </div>
                    )}

                    {bottomTab === "ai" && (
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <Brain size={14} style={{ color: "var(--brand)" }} />
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>AI Tutor</span>
                        </div>
                        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
                          Ask about this video or Day {day}&apos;s topic
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {[
                            { emoji: "💡", label: "Explain simply", prompt: `Explain the video "${currentVideo?.title || `Day ${day}`}" in simple terms with examples` },
                            { emoji: "📝", label: "Key points", prompt: `Give key points and notes from "${currentVideo?.title || `Day ${day}`}"` },
                            { emoji: "❓", label: "Practice questions", prompt: `Create 5 practice questions about "${currentVideo?.title || `Day ${day}`}"` },
                            { emoji: "🔗", label: "Real examples", prompt: `Give real-life examples for "${currentVideo?.title || `Day ${day}`}"` },
                          ].map((item, i) => (
                            <button key={i} onClick={() => onAskAi(item.prompt)} style={{
                              display: "flex", alignItems: "center", gap: 8, width: "100%",
                              padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)",
                              background: "var(--surface)", color: "var(--text)", fontSize: "0.82rem",
                              fontWeight: 500, cursor: "pointer", textAlign: "left",
                            }}>
                              <span style={{ fontSize: "1rem" }}>{item.emoji}</span> {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {bottomTab === "quiz" && (
                      <div style={{ padding: "12px 14px" }}>
                        <QuizView quiz={quiz} answers={answers} evalResult={evalResult}
                          onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
                          isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── No video playing ── */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
              {hasVideos ? (
                <>
                  <div style={{
                    width: 50, height: 50, borderRadius: 12, overflow: "hidden", marginBottom: 10,
                    background: "var(--surface2)", border: "2px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {getThumbnail(videoLinks[0].url) ? (
                      <img src={getThumbnail(videoLinks[0].url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : <Play size={20} style={{ color: "var(--text-faint)" }} />}
                  </div>
                  <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: 3, textAlign: "center" }}>
                    {dayData?.title || `Day ${day}`}
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12, textAlign: "center", maxWidth: 260, lineHeight: 1.4 }}>
                    {dayData?.description || `${videoLinks.length} video${videoLinks.length > 1 ? "s" : ""} to watch`}
                  </p>
                  <button onClick={startPlaylist} style={{
                    padding: "10px 22px", borderRadius: 10,
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    color: "#fff", fontSize: "0.88rem", fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    boxShadow: "0 4px 14px rgba(239,68,68,0.3)", border: "none",
                  }}>
                    <Play size={16} fill="#fff" /> Play All ({videoLinks.length})
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📚</div>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>No videos yet</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Ask your teacher to add resources</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Playlist Sidebar ── */}
        {hasVideos && (
          <div className="playlist-sidebar" style={{
            width: 220, flexShrink: 0, borderLeft: "1px solid var(--border)",
            background: "var(--surface)", display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "6px 10px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                <List size={11} /> Playlist
              </span>
              <span style={{ fontSize: "0.64rem", color: "var(--text-muted)" }}>
                {watchedVideos.size}/{videoLinks.length}
              </span>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Watched */}
              {watchedVideos.size > 0 && (
                <div>
                  <div style={{
                    padding: "3px 10px", fontSize: "0.58rem", fontWeight: 700, color: "#10b981",
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
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", cursor: "pointer",
                          borderBottom: "1px solid var(--border)", opacity: 0.6, transition: "opacity 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}>
                        <div style={{
                          width: 40, height: 28, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                          position: "relative", background: "var(--surface3)",
                        }}>
                          {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                          <div style={{
                            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(16,185,129,0.4)",
                          }}>
                            <CheckCircle2 size={10} color="#fff" />
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "0.68rem", fontWeight: 500, color: "var(--text-muted)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {link.title}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Up Next */}
              <div>
                {watchedVideos.size > 0 && (
                  <div style={{
                    padding: "3px 10px", fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)",
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
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", cursor: "pointer",
                        background: isPlaying ? "rgba(239,68,68,0.08)" : "transparent",
                        borderLeft: isPlaying ? "3px solid #ef4444" : "3px solid transparent",
                        borderBottom: "1px solid var(--border)", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.background = "var(--surface2)"; }}
                      onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.background = "transparent"; }}>
                      <div style={{
                        width: 44, height: 30, borderRadius: 5, overflow: "hidden", flexShrink: 0,
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
                          fontSize: "0.7rem", fontWeight: isPlaying ? 700 : 500,
                          color: isPlaying ? "var(--text)" : "var(--text2)",
                          lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{link.title}</p>
                        {link.channelName && (
                          <p style={{ fontSize: "0.6rem", color: "var(--text-faint)", marginTop: 1 }}>{link.channelName}</p>
                        )}
                      </div>
                      <span style={{
                        fontSize: "0.64rem", fontWeight: 700, color: isPlaying ? "#ef4444" : "var(--text-faint)",
                        flexShrink: 0, width: 14, textAlign: "center",
                      }}>{idx + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
