"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Play, Pause, SkipForward, SkipBack, ExternalLink, Globe,
  Sparkles, CheckCircle2, Target, ArrowRight, Loader2, RotateCcw,
  MessageSquare, List, Volume2, X,
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
  // Check cache first
  const cached = getCachedTranscript(videoId);
  if (cached) return cached;

  try {
    // Use YouTube's timed text API
    const res = await fetch(`https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3`);
    if (!res.ok) {
      // Try auto-generated captions
      const res2 = await fetch(`https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&kind=asr&fmt=json3`);
      if (!res2.ok) return "";
      const data = await res2.json();
      const text = (data.events || [])
        .filter((e: any) => e.segs)
        .map((e: any) => e.segs.map((s: any) => s.utf8).join(""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      // Cache it
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
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <Loader2 size={28} className="spinner" style={{ color: "var(--brand)", margin: "0 auto 10px" }} />
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Loading quiz…</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <Target size={28} style={{ color: "var(--brand)", margin: "0 auto 10px", opacity: 0.5 }} />
        <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Ready for the quiz?</p>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 14 }}>Need 67% to unlock Day {day + 1}</p>
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
          padding: "12px 16px", borderRadius: 10, marginBottom: 16, textAlign: "center",
          background: evalResult.passed ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${evalResult.passed ? "var(--green)" : "var(--red)"}30`,
          color: evalResult.passed ? "var(--green)" : "var(--red)",
          fontWeight: 700, fontSize: "0.88rem",
        }}>
          {evalResult.passed ? "🎉" : "💪"} {evalResult.passed
            ? `PASSED — ${evalResult.correctCount}/${evalResult.totalQuestions}`
            : `${evalResult.correctCount}/${evalResult.totalQuestions} — Need 67%`}
        </div>
      )}

      {evalResult?.mentorMessage && (
        <div style={{
          padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: "0.8rem",
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
              <p style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)", marginBottom: 10, lineHeight: 1.5 }}>
                <span style={{ color: "var(--brand2)", fontWeight: 700 }}>Q{idx + 1}. </span>
                {q.question}
              </p>

              {isMCQ && q.options.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                          padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${border}`,
                          background: bg, color, fontSize: "0.82rem", fontWeight: 500,
                          cursor: evalResult ? "default" : "pointer", textAlign: "left",
                        }}
                      >
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", border: "2px solid currentColor",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.65rem",
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
                    width: "100%", padding: "10px", borderRadius: 8,
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    color: "var(--text)", fontSize: "0.82rem", resize: "none", fontFamily: "inherit",
                  }}
                />
              )}

              {feedback && (
                <div style={{
                  marginTop: 8, padding: "8px 10px", borderRadius: 8, fontSize: "0.78rem",
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
          <button onClick={onSubmit} className="watch-btn purple">
            <RotateCcw size={15} /> Try Again
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DAY LINK VIEW — Clean Playlist Player
// ══════════════════════════════════════════════════════════════════════════════

export default function DayLinkView({
  day, dayData, learner,
  quiz, quizLoading, answers, evalResult, isSubmitting,
  onAnswer, onSubmitQuiz, onNextLesson, onLoadQuiz,
  onStartDay, onAskAi, onWatchVideo, onVideoClose,
  videoCloseTrigger = 0,
  quizOnly = false,
}: Props) {
  const [tab, setTab] = useState<"watch" | "quiz" | "ai">(quizOnly ? "quiz" : "watch");
  const [playlistIdx, setPlaylistIdx] = useState(-1);
  const [watchedVideos, setWatchedVideos] = useState<Set<number>>(new Set());
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  const links = dayData?.resources ?? [];
  const videoLinks = links.filter(l => l.type === "youtube");
  const hasVideos = videoLinks.length > 0;

  // Auto-load quiz in quiz-only mode
  useEffect(() => {
    if (quizOnly && !quiz && !quizLoading) onLoadQuiz();
  }, [quizOnly]);

  // Auto-advance playlist when video player closes
  useEffect(() => {
    if (videoCloseTrigger === 0) return;
    if (playlistIdx >= 0 && playlistIdx < videoLinks.length - 1) {
      const timer = setTimeout(() => {
        const nextIdx = playlistIdx + 1;
        setWatchedVideos(prev => new Set([...prev, playlistIdx]));
        setPlaylistIdx(nextIdx);
        const link = videoLinks[nextIdx];
        onWatchVideo(getVideoId(link.url), link.title, link.channelName ?? "");
      }, 600);
      return () => clearTimeout(timer);
    } else if (playlistIdx >= 0) {
      setWatchedVideos(prev => new Set([...prev, playlistIdx]));
      setPlaylistIdx(-1);
      setTab("quiz");
      onLoadQuiz();
    }
  }, [videoCloseTrigger]);

  // Load transcript for current playing video
  useEffect(() => {
    if (playlistIdx >= 0 && videoLinks[playlistIdx]) {
      const vid = getVideoId(videoLinks[playlistIdx].url);
      if (vid) {
        setLoadingTranscript(true);
        fetchTranscript(vid).then(t => {
          setCurrentTranscript(t);
          setLoadingTranscript(false);
        });
      }
    }
  }, [playlistIdx]);

  // Start playlist
  const startPlaylist = useCallback(() => {
    setPlaylistIdx(0);
    setWatchedVideos(new Set());
    const link = videoLinks[0];
    if (link) onWatchVideo(getVideoId(link.url), link.title, link.channelName ?? "");
  }, [videoLinks, onWatchVideo]);

  // Skip / Next
  const skipVideo = useCallback(() => {
    if (playlistIdx < videoLinks.length - 1) {
      const nextIdx = playlistIdx + 1;
      setWatchedVideos(prev => new Set([...prev, playlistIdx]));
      setPlaylistIdx(nextIdx);
      const link = videoLinks[nextIdx];
      onWatchVideo(getVideoId(link.url), link.title, link.channelName ?? "");
    } else {
      setWatchedVideos(prev => new Set([...prev, playlistIdx]));
      setPlaylistIdx(-1);
      setTab("quiz");
      onLoadQuiz();
    }
  }, [playlistIdx, videoLinks, onWatchVideo, onLoadQuiz]);

  // Play specific video
  const playVideo = useCallback((idx: number) => {
    setPlaylistIdx(idx);
    const link = videoLinks[idx];
    if (link) onWatchVideo(getVideoId(link.url), link.title, link.channelName ?? "");
  }, [videoLinks, onWatchVideo]);

  // Empty state
  if (!day) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📚</div>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Select a day to begin</h3>
        <p style={{ fontSize: "0.82rem", maxWidth: 300, textAlign: "center", lineHeight: 1.5 }}>
          Pick a day from the sidebar to start learning.
        </p>
      </div>
    );
  }

  // ─── Quiz-only mode ───────────────────────────────────────────────────────
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

  // ─── Main view ────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px" }}>

        {/* ── Day Header ──────────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, var(--brand), var(--brand2))",
          borderRadius: 14, padding: "16px 18px", marginBottom: 14, color: "#fff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", fontWeight: 800, flexShrink: 0,
            }}>
              {day}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 800, lineHeight: 1.3 }}>
                {dayData?.title || `Day ${day}`}
              </h2>
              {dayData?.description && (
                <p style={{ fontSize: "0.7rem", opacity: 0.8, marginTop: 2 }}>
                  {dayData.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[
            { id: "watch" as const, label: "Watch", icon: <Play size={13} /> },
            { id: "quiz" as const, label: "Quiz", icon: <Target size={13} /> },
            { id: "ai" as const, label: "Ask AI", icon: <Sparkles size={13} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id === "quiz" && !quiz && !quizLoading) onLoadQuiz();
              }}
              className={`simple-pill ${tab === t.id ? "active" : ""}`}
              style={{ fontSize: "0.78rem", padding: "6px 14px" }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* WATCH TAB — Playlist Player                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "watch" && (
          <div>
            {!hasVideos ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🔗</div>
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>No videos yet</p>
                <p style={{ fontSize: "0.78rem" }}>Ask your teacher to add resources for Day {day}</p>
              </div>
            ) : (
              <>
                {/* Now Playing Banner */}
                {playlistIdx >= 0 && videoLinks[playlistIdx] && (
                  <div style={{
                    padding: "12px 14px", borderRadius: 12, marginBottom: 12,
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", background: "#ef4444",
                        animation: "pulse 1.5s infinite",
                      }} />
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>
                        Now Playing: {playlistIdx + 1}/{videoLinks.length}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", flex: 1, textAlign: "right" }}>
                        {videoLinks[playlistIdx].title}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ display: "flex", gap: 3 }}>
                      {videoLinks.map((_, i) => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: i < playlistIdx || watchedVideos.has(i)
                            ? "#10b981" : i === playlistIdx ? "#ef4444" : "var(--border)",
                          transition: "background 0.3s",
                        }} />
                      ))}
                    </div>
                    {/* Controls */}
                    <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "center" }}>
                      <button onClick={() => playlistIdx > 0 && playVideo(playlistIdx - 1)}
                        disabled={playlistIdx <= 0}
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                          background: "var(--surface)", color: playlistIdx <= 0 ? "var(--text-faint)" : "var(--text)",
                          fontSize: "0.72rem", fontWeight: 600, cursor: playlistIdx <= 0 ? "default" : "pointer",
                          display: "flex", alignItems: "center", gap: 4, opacity: playlistIdx <= 0 ? 0.4 : 1,
                        }}>
                        <SkipBack size={12} /> Prev
                      </button>
                      <button onClick={skipVideo} style={{
                        padding: "6px 12px", borderRadius: 8,
                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                        color: "#fff", fontSize: "0.72rem", fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {playlistIdx < videoLinks.length - 1 ? <><SkipForward size={12} /> Next</> : <><Target size={12} /> Quiz</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Play All Button */}
                {playlistIdx < 0 && (
                  <button onClick={startPlaylist} style={{
                    width: "100%", padding: "12px", borderRadius: 12, marginBottom: 12,
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    color: "#fff", fontSize: "0.85rem", fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 14px rgba(239,68,68,0.3)",
                    border: "none",
                  }}>
                    <Play size={16} fill="#fff" /> Play All ({videoLinks.length} videos)
                  </button>
                )}

                {/* Video List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {videoLinks.map((link, idx) => {
                    const vid = getVideoId(link.url);
                    const thumb = getThumbnail(link.url);
                    const isPlaying = playlistIdx === idx;
                    const isWatched = watchedVideos.has(idx);

                    return (
                      <div key={link.id} onClick={() => playVideo(idx)} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", borderRadius: 10,
                        background: isPlaying ? "rgba(239,68,68,0.08)" : "var(--surface2)",
                        border: `1px solid ${isPlaying ? "rgba(239,68,68,0.3)" : isWatched ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                        cursor: "pointer", transition: "all 0.15s",
                      }}>
                        {/* Thumbnail */}
                        <div style={{
                          width: 56, height: 40, borderRadius: 6, overflow: "hidden", flexShrink: 0,
                          position: "relative", background: "var(--surface3)",
                        }}>
                          {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                          <div style={{
                            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            background: isPlaying ? "rgba(239,68,68,0.5)" : "rgba(0,0,0,0.3)",
                          }}>
                            {isPlaying ? <Pause size={14} fill="#fff" color="#fff" /> : <Play size={14} fill="#fff" color="#fff" style={{ marginLeft: 1 }} />}
                          </div>
                          {isWatched && (
                            <div style={{
                              position: "absolute", top: 2, right: 2,
                              width: 14, height: 14, borderRadius: "50%", background: "#10b981",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <CheckCircle2 size={8} color="#fff" />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.3,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {link.title}
                          </p>
                          {link.channelName && (
                            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 1 }}>
                              {link.channelName}
                            </p>
                          )}
                        </div>
                        {/* Number */}
                        <span style={{
                          fontSize: "0.7rem", fontWeight: 700, color: isPlaying ? "#ef4444" : isWatched ? "#10b981" : "var(--text-faint)",
                          flexShrink: 0,
                        }}>
                          #{idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
                  <button onClick={() => onAskAi(`Explain Day ${day}: ${dayData?.title || ""}`)}
                    className="simple-pill" style={{ fontSize: "0.75rem" }}>
                    <Sparkles size={12} /> Explain
                  </button>
                  <button onClick={() => onAskAi(`Key points from Day ${day}: ${dayData?.title || ""}`)}
                    className="simple-pill" style={{ fontSize: "0.75rem" }}>
                    📝 Key points
                  </button>
                  <button onClick={() => { setTab("quiz"); onLoadQuiz(); }}
                    className="simple-pill" style={{ fontSize: "0.75rem" }}>
                    <Target size={12} /> Take Quiz
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* QUIZ TAB                                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "quiz" && (
          <div>
            <QuizView quiz={quiz} answers={answers} evalResult={evalResult}
              onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
              isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading} />

            {evalResult?.passed && (
              <div style={{
                marginTop: 20, padding: "14px 16px", borderRadius: 12,
                background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                textAlign: "center",
              }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                  🎉 Day {day} completed!
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <a href={`https://t.me/csalearningbot?start=day${day + 1}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "#229ED9", color: "#fff", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
                    💬 Telegram — Day {day + 1}
                  </a>
                  <button onClick={onNextLesson} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 8,
                    background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff",
                    fontSize: "0.78rem", fontWeight: 600, border: "none", cursor: "pointer",
                  }}>
                    <ArrowRight size={13} /> Next Day Here
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ASK AI TAB — with transcript context                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "ai" && (
          <div>
            <div style={{
              padding: "16px", borderRadius: 12, background: "var(--surface2)",
              border: "1px solid var(--border)", marginBottom: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Sparkles size={16} style={{ color: "var(--brand)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>AI Tutor</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                Ask anything about Day {day}. I have the video transcripts and can explain concepts, give examples, or create practice questions.
              </p>

              {/* Quick prompts */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "💡 Explain this topic simply", prompt: `Explain Day ${day}: ${dayData?.title || ""} in simple terms with examples` },
                  { label: "📝 Key points & notes", prompt: `Give me key points and notes from Day ${day}: ${dayData?.title || ""}` },
                  { label: "❓ Practice questions", prompt: `Create 5 practice questions about Day ${day}: ${dayData?.title || ""}` },
                  { label: "🔗 Real-life examples", prompt: `Give real-life examples for Day ${day}: ${dayData?.title || ""}` },
                ].map((item, i) => (
                  <button key={i} onClick={() => onAskAi(item.prompt)} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--surface)", color: "var(--text)", fontSize: "0.78rem",
                    fontWeight: 500, cursor: "pointer", textAlign: "left",
                  }}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript section */}
            {playlistIdx >= 0 && currentTranscript && (
              <div style={{
                padding: "12px 14px", borderRadius: 12, background: "var(--surface2)",
                border: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
                    📄 Transcript — Video {playlistIdx + 1}
                  </span>
                </div>
                <p style={{
                  fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6,
                  maxHeight: 200, overflowY: "auto",
                }}>
                  {currentTranscript.slice(0, 1500)}{currentTranscript.length > 1500 ? "…" : ""}
                </p>
              </div>
            )}

            {loadingTranscript && (
              <div style={{ textAlign: "center", padding: "12px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                <Loader2 size={14} className="spinner" style={{ display: "inline", marginRight: 6 }} />
                Loading transcript…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
