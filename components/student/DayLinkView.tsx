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
      <div style={{ textAlign: "center", padding: "30px 16px" }}>
        <Loader2 size={24} className="spinner" style={{ color: "var(--brand)", margin: "0 auto 8px" }} />
        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>Loading quiz…</p>
      </div>
    );
  }
  if (!quiz) {
    return (
      <div style={{ textAlign: "center", padding: "30px 16px" }}>
        <Target size={24} style={{ color: "var(--brand)", margin: "0 auto 8px", opacity: 0.5 }} />
        <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Ready for the quiz?</p>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12 }}>Need 67% to unlock Day {day + 1}</p>
        <button onClick={onLoadQuiz} className="watch-btn purple" style={{ maxWidth: 200, margin: "0 auto" }}>
          <Target size={14} /> Start Quiz
        </button>
      </div>
    );
  }
  const allAnswered = quiz.questions.every(q => answers[q.id]?.trim());
  return (
    <div>
      {evalResult && (
        <div style={{
          padding: "12px 16px", borderRadius: 10, marginBottom: 14, textAlign: "center",
          background: evalResult.passed ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${evalResult.passed ? "var(--green)" : "var(--red)"}30`,
          color: evalResult.passed ? "var(--green)" : "var(--red)", fontWeight: 700, fontSize: "0.9rem",
        }}>
          {evalResult.passed ? "🎉" : "💪"} {evalResult.passed
            ? `PASSED — ${evalResult.correctCount}/${evalResult.totalQuestions}`
            : `${evalResult.correctCount}/${evalResult.totalQuestions} — Need 67%`}
        </div>
      )}
      {evalResult?.mentorMessage && (
        <div style={{
          padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: "0.82rem",
          background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)", lineHeight: 1.5,
        }}>
          {evalResult.mentorMessage}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {quiz.questions.map((q, idx) => {
          const feedback = evalResult?.feedback.find(f => f.questionId === q.id);
          const isCorrect = feedback?.isCorrect;
          const isMCQ = q.type === "mcq" || q.type === "tf";
          return (
            <div key={q.id} style={{
              padding: 14, borderRadius: 12, background: "var(--surface)",
              border: `1px solid ${feedback ? (isCorrect ? "var(--green)" : "var(--red)") : "var(--border)"}`,
            }}>
              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: 10, lineHeight: 1.4 }}>
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
                          display: "flex", alignItems: "center", gap: 8, width: "100%",
                          padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${border}`,
                          background: bg, color, fontSize: "0.84rem", fontWeight: 500,
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
                    width: "100%", padding: "10px", borderRadius: 8,
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    color: "var(--text)", fontSize: "0.84rem", resize: "none", fontFamily: "inherit",
                  }} />
              )}
              {feedback && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 8, fontSize: "0.8rem",
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
      <div style={{ marginTop: 16 }}>
        {!evalResult ? (
          <button onClick={onSubmit} disabled={!allAnswered || isSubmitting} className="watch-btn purple"
            style={{ opacity: (!allAnswered || isSubmitting) ? 0.5 : 1, cursor: (!allAnswered || isSubmitting) ? "not-allowed" : "pointer" }}>
            {isSubmitting ? <><Loader2 size={15} className="spinner" /> Evaluating…</> : <><Target size={15} /> Submit</>}
          </button>
        ) : evalResult.passed ? (
          <button onClick={onNextLesson} className="watch-btn" style={{ background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff" }}>
            <ArrowRight size={15} /> Unlock Day {day + 1}
          </button>
        ) : (
          <button onClick={onSubmit} className="watch-btn purple"><RotateCcw size={15} /> Try Again</button>
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📚</div>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Select a day to begin</h3>
        <p style={{ fontSize: "0.85rem", maxWidth: 300, textAlign: "center", lineHeight: 1.5 }}>Pick a day from the sidebar to start learning.</p>
      </div>
    );
  }

  // ─── Quiz-only ──
  if (quizOnly) {
    return (
      <div style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px" }}>
          <div style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", borderRadius: 14, padding: "16px 20px", marginBottom: 16, color: "#fff" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 800 }}>Day {day} Quiz</h2>
            <p style={{ fontSize: "0.78rem", opacity: 0.8 }}>{dayData?.title || ""} • Need 67% to pass</p>
          </div>
          <QuizView quiz={quiz} answers={answers} evalResult={evalResult}
            onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
            isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading} />
          {evalResult?.passed && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <a href={`https://t.me/csalearningbot?start=day${day + 1}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, background: "#229ED9", color: "#fff", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>
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
        padding: "10px 16px", background: "var(--surface)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, var(--brand), var(--brand2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.8rem", fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>{day}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {dayData?.title || `Day ${day}`}
          </h2>
          {dayData?.description && (
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {dayData.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Main: Player + Sidebar ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, flexDirection: "row" }} className="player-layout">

        {/* ── Left: Player + Below Panel ───────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, minHeight: 0 }} className="player-main">

          {activeVideo >= 0 && currentVideo ? (
            <>
              {/* ── Video Player (responsive, capped) ── */}
              <div style={{ flexShrink: 0, background: "#000", position: "relative", width: "100%" }}>
                <div style={{ position: "relative", width: "100%", height: "auto", aspectRatio: "16/9", maxHeight: "min(40vh, 320px)" }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1`}
                    title={currentVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture"
                    allowFullScreen
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                  />
                </div>
              </div>

              {/* ── Below Video: Title + Actions + Toolbar ── */}
              <div style={{
                padding: "10px 14px", background: "var(--surface)", borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}>
                {/* Title + channel on one line */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {currentVideo.title}
                  </p>
                  {currentVideo.channelName && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                      {currentVideo.channelName}
                    </span>
                  )}
                </div>

                {/* One row: Prev + Next + Full Screen + toolbar buttons */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {activeVideo > 0 && (
                    <button onClick={prevVideo} style={{
                      padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--surface2)", color: "var(--text)", fontSize: "0.85rem", fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <SkipBack size={14} /> Prev
                    </button>
                  )}
                  {activeVideo < videoLinks.length - 1 && (
                    <button onClick={skipVideo} style={{
                      padding: "8px 14px", borderRadius: 8,
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "#fff", fontSize: "0.85rem", fontWeight: 600, border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <SkipForward size={14} /> Next
                    </button>
                  )}
                  <a href={`https://pclearn.vercel.app/?day=${day}`} target="_blank" rel="noopener noreferrer"
                    style={{
                      padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--surface2)", color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600,
                      textDecoration: "none", display: "flex", alignItems: "center", gap: 4,
                    }}>
                    <Globe size={14} /> Full Screen
                  </a>
                  <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />
                  {/* Toolbar toggles */}
                  {[
                    { id: "transcript" as const, label: "📄 Transcript", activeColor: "rgba(6,182,212,0.15)", activeBorder: "#06b6d4" },
                    { id: "ai" as const, label: "🤖 Ask AI", activeColor: "rgba(99,102,241,0.15)", activeBorder: "var(--brand)" },
                    { id: "quiz" as const, label: "🧪 Quiz", activeColor: "rgba(139,92,246,0.15)", activeBorder: "#8b5cf6" },
                  ].map(t => (
                    <button key={t.id} onClick={() => {
                      const next = bottomTab === t.id ? "none" : t.id;
                      setBottomTab(next);
                      if (next === "quiz" && !quiz && !quizLoading) onLoadQuiz();
                    }} style={{
                      padding: "8px 14px", borderRadius: 8,
                      border: `1.5px solid ${bottomTab === t.id ? t.activeBorder : "var(--border)"}`,
                      background: bottomTab === t.id ? t.activeColor : "var(--surface2)",
                      color: bottomTab === t.id ? t.activeBorder : "var(--text2)",
                      fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Bottom Panel (scrollable) ── */}
              {bottomTab !== "none" && (
                <div style={{ flex: 1, overflow: "hidden", borderTop: "1px solid var(--border)", background: "var(--bg2)", display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {/* Transcript */}
                    {bottomTab === "transcript" && (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                          <FileText size={16} style={{ color: "#06b6d4" }} />
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>
                            Transcript — Video {activeVideo + 1}
                          </span>
                        </div>
                        {loadingTranscript ? (
                          <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                            <Loader2 size={16} className="spinner" style={{ display: "inline", marginRight: 6 }} /> Loading transcript…
                          </div>
                        ) : currentTranscript ? (
                          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                            {currentTranscript}
                          </p>
                        ) : (
                          <div style={{ textAlign: "center", padding: 20, color: "var(--text-faint)", fontSize: "0.82rem" }}>
                            No transcript available for this video
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI */}
                    {bottomTab === "ai" && (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                          <Brain size={16} style={{ color: "var(--brand)" }} />
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>AI Tutor</span>
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                          Ask about this video or Day {day}&apos;s topic
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {[
                            { emoji: "💡", label: "Explain this simply", prompt: `Explain the video "${currentVideo?.title || `Day ${day}`}" in simple terms with examples` },
                            { emoji: "📝", label: "Key points & notes", prompt: `Give me key points and notes from "${currentVideo?.title || `Day ${day}`}"` },
                            { emoji: "❓", label: "Practice questions", prompt: `Create 5 practice questions about "${currentVideo?.title || `Day ${day}`}"` },
                            { emoji: "🔗", label: "Real-life examples", prompt: `Give real-life examples for "${currentVideo?.title || `Day ${day}`}"` },
                          ].map((item, i) => (
                            <button key={i} onClick={() => onAskAi(item.prompt)} style={{
                              display: "flex", alignItems: "center", gap: 10, width: "100%",
                              padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)",
                              background: "var(--surface)", color: "var(--text)", fontSize: "0.85rem",
                              fontWeight: 500, cursor: "pointer", textAlign: "left",
                            }}>
                              <span style={{ fontSize: "1.1rem" }}>{item.emoji}</span> {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quiz */}
                    {bottomTab === "quiz" && (
                      <div style={{ padding: "14px 16px" }}>
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
            /* ── No video playing ── */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
              {hasVideos ? (
                <>
                  <div style={{
                    width: 60, height: 60, borderRadius: 14, overflow: "hidden", marginBottom: 14,
                    background: "var(--surface2)", border: "2px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {getThumbnail(videoLinks[0].url) ? (
                      <img src={getThumbnail(videoLinks[0].url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : <Play size={24} style={{ color: "var(--text-faint)" }} />}
                  </div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", marginBottom: 4, textAlign: "center" }}>
                    {dayData?.title || `Day ${day}`}
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 16, textAlign: "center", maxWidth: 300, lineHeight: 1.5 }}>
                    {dayData?.description || `${videoLinks.length} video${videoLinks.length > 1 ? "s" : ""} to watch`}
                  </p>
                  <button onClick={startPlaylist} style={{
                    padding: "12px 28px", borderRadius: 12,
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    color: "#fff", fontSize: "0.95rem", fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                    boxShadow: "0 4px 14px rgba(239,68,68,0.3)", border: "none",
                  }}>
                    <Play size={18} fill="#fff" /> Play All ({videoLinks.length} videos)
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>📚</div>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>No videos yet</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Ask your teacher to add resources</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Playlist Sidebar ── */}
        {hasVideos && (
          <div className="playlist-sidebar" style={{
            width: 240, flexShrink: 0, borderLeft: "1px solid var(--border)",
            background: "var(--surface)", display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "8px 12px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                <List size={12} /> Playlist
              </span>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                {watchedVideos.size}/{videoLinks.length}
              </span>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Watched */}
              {watchedVideos.size > 0 && (
                <div>
                  <div style={{
                    padding: "4px 12px", fontSize: "0.62rem", fontWeight: 700, color: "#10b981",
                    textTransform: "uppercase" as const, letterSpacing: "0.05em",
                    display: "flex", alignItems: "center", gap: 3,
                  }}>
                    <CheckCircle2 size={10} /> Watched
                  </div>
                  {videoLinks.map((link, idx) => {
                    if (!watchedVideos.has(idx)) return null;
                    const thumb = getThumbnail(link.url);
                    return (
                      <div key={link.id} onClick={() => playVideo(idx)}
                        style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 12px", cursor: "pointer",
                          borderBottom: "1px solid var(--border)", opacity: 0.6, transition: "opacity 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}>
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
                          <p style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--text-muted)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                    padding: "4px 12px", fontSize: "0.62rem", fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase" as const, letterSpacing: "0.05em",
                    display: "flex", alignItems: "center", gap: 3,
                  }}>
                    <Clock size={10} /> Up Next
                  </div>
                )}
                {videoLinks.map((link, idx) => {
                  if (watchedVideos.has(idx)) return null;
                  const thumb = getThumbnail(link.url);
                  const isPlaying = activeVideo === idx;
                  return (
                    <div key={link.id} onClick={() => playVideo(idx)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 12px", cursor: "pointer",
                        background: isPlaying ? "rgba(239,68,68,0.08)" : "transparent",
                        borderLeft: isPlaying ? "3px solid #ef4444" : "3px solid transparent",
                        borderBottom: "1px solid var(--border)", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.background = "var(--surface2)"; }}
                      onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.background = "transparent"; }}>
                      <div style={{
                        width: 52, height: 36, borderRadius: 6, overflow: "hidden", flexShrink: 0,
                        position: "relative", background: "var(--surface3)",
                      }}>
                        {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        <div style={{
                          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                          background: isPlaying ? "rgba(239,68,68,0.5)" : "rgba(0,0,0,0.3)",
                        }}>
                          {isPlaying
                            ? <Pause size={12} fill="#fff" color="#fff" />
                            : <Play size={12} fill="#fff" color="#fff" style={{ marginLeft: 1 }} />}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: "0.75rem", fontWeight: isPlaying ? 700 : 500,
                          color: isPlaying ? "var(--text)" : "var(--text2)",
                          lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{link.title}</p>
                        {link.channelName && (
                          <p style={{ fontSize: "0.65rem", color: "var(--text-faint)", marginTop: 2 }}>{link.channelName}</p>
                        )}
                      </div>
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 700, color: isPlaying ? "#ef4444" : "var(--text-faint)",
                        flexShrink: 0, width: 16, textAlign: "center",
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
