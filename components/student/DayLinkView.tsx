"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Play, ExternalLink, Youtube, Globe, Sparkles,
  CheckCircle2, Target, ArrowRight, Loader2, RotateCcw,
  AlertCircle, HelpCircle, ChevronRight, List, SkipForward,
  Pause, MessageSquare, ExternalLinkIcon,
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
  /** Called when video player closes — for playlist auto-advance */
  onVideoClose?: () => void;
  /** Trigger counter — increments each time video player closes */
  videoCloseTrigger?: number;
  /** Quiz-only mode: show only quiz, no video list */
  quizOnly?: boolean;
}

// ─── Minimal Link Card ────────────────────────────────────────────────────────
function LinkCard({ link, onWatch }: { link: AdminResourceLink; onWatch: () => void }) {
  const isVideo = link.type === "youtube";
  const videoId = isVideo
    ? (() => { try { return new URL(link.url).searchParams.get("v") ?? ""; } catch { return ""; } })()
    : "";
  const thumb = link.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  return (
    <div className="link-card">
      {isVideo && thumb && (
        <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
          <img
            src={thumb}
            alt={link.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }}
          />
          <button
            onClick={onWatch}
            style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(0,0,0,0.2)", border: "none", cursor: "pointer",
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
            }}>
              <Play size={20} fill="#fff" color="#fff" style={{ marginLeft: 2 }} />
            </div>
          </button>
        </div>
      )}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          {!isVideo && (
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "rgba(6,182,212,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {link.type === "blog" ? <Globe size={14} style={{ color: "var(--cyan)" }} /> : <ExternalLink size={14} style={{ color: "var(--brand)" }} />}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{
              fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.3,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {link.title}
            </h4>
            {link.channelName && (
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
                <Youtube size={10} style={{ display: "inline", marginRight: 3, color: "#ef4444" }} />
                {link.channelName}
              </p>
            )}
          </div>
        </div>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (isVideo && videoId) { e.preventDefault(); onWatch(); }
          }}
          className={`watch-btn ${isVideo ? "red" : "purple"}`}
        >
          <Play size={15} fill="#fff" /> Watch Here
        </a>
      </div>
    </div>
  );
}

// ─── Minimal Quiz ─────────────────────────────────────────────────────────────
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
      <div className="empty-state">
        <Loader2 size={32} className="spinner" style={{ color: "var(--brand)", margin: "0 auto 12px" }} />
        <p style={{ fontSize: "0.88rem" }}>Generating quiz…</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="empty-state">
        <Target size={32} style={{ color: "var(--brand)", margin: "0 auto 12px", opacity: 0.5 }} />
        <p style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Ready for the quiz?</p>
        <p style={{ fontSize: "0.82rem", marginBottom: 16 }}>Need 67% to unlock Day {day + 1}</p>
        <button onClick={onLoadQuiz} className="watch-btn purple" style={{ maxWidth: 200, margin: "0 auto" }}>
          <Target size={15} /> Start Quiz
        </button>
      </div>
    );
  }

  const allAnswered = quiz.questions.every(q => answers[q.id]?.trim());

  return (
    <div style={{ padding: 0 }}>
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

// ─── Main DayLinkView ─────────────────────────────────────────────────────────
export default function DayLinkView({
  day, dayData, learner,
  quiz, quizLoading, answers, evalResult, isSubmitting,
  onAnswer, onSubmitQuiz, onNextLesson, onLoadQuiz,
  onStartDay, onAskAi, onWatchVideo, onVideoClose,
  videoCloseTrigger = 0,
  quizOnly = false,
}: Props) {
  const [tab, setTab] = useState<"watch" | "quiz">(quizOnly ? "quiz" : "watch");
  const [playlistIdx, setPlaylistIdx] = useState(-1); // -1 = not playing
  const [watchedVideos, setWatchedVideos] = useState<Set<number>>(new Set());

  const links = dayData?.resources ?? [];
  const videoLinks = links.filter(l => l.type === "youtube");
  const nonVideoLinks = links.filter(l => l.type !== "youtube");
  const hasLinks = links.length > 0;
  const hasVideos = videoLinks.length > 0;

  // Auto-load quiz in quiz-only mode
  useEffect(() => {
    if (quizOnly && !quiz && !quizLoading) {
      onLoadQuiz();
    }
  }, [quizOnly]);

  // Auto-advance playlist when video player closes
  useEffect(() => {
    if (videoCloseTrigger === 0) return; // skip initial
    if (playlistIdx >= 0 && playlistIdx < videoLinks.length - 1) {
      // More videos to play — auto-advance after short delay
      const timer = setTimeout(() => {
        const nextIdx = playlistIdx + 1;
        setWatchedVideos(prev => new Set([...prev, playlistIdx]));
        setPlaylistIdx(nextIdx);
        const link = videoLinks[nextIdx];
        const videoId = (() => { try { return new URL(link.url).searchParams.get("v") ?? ""; } catch { return ""; } })();
        onWatchVideo(videoId, link.title, link.channelName ?? "");
      }, 800);
      return () => clearTimeout(timer);
    } else if (playlistIdx >= 0) {
      // Last video done — switch to quiz
      setWatchedVideos(prev => new Set([...prev, playlistIdx]));
      setPlaylistIdx(-1);
      setTab("quiz");
      onLoadQuiz();
    }
  }, [videoCloseTrigger]);

  // Playlist: play next video
  const playNext = useCallback(() => {
    if (playlistIdx < videoLinks.length - 1) {
      const nextIdx = playlistIdx + 1;
      setWatchedVideos(prev => new Set([...prev, playlistIdx]));
      setPlaylistIdx(nextIdx);
      const link = videoLinks[nextIdx];
      const videoId = (() => { try { return new URL(link.url).searchParams.get("v") ?? ""; } catch { return ""; } })();
      onWatchVideo(videoId, link.title, link.channelName ?? "");
    } else {
      // All videos watched — switch to quiz
      setWatchedVideos(prev => new Set([...prev, playlistIdx]));
      setPlaylistIdx(-1);
      setTab("quiz");
      onLoadQuiz();
    }
  }, [playlistIdx, videoLinks, onWatchVideo, onLoadQuiz]);

  // Skip current video in playlist
  const skipVideo = useCallback(() => {
    playNext();
  }, [playNext]);

  // Start playlist from beginning
  const startPlaylist = useCallback(() => {
    setPlaylistIdx(0);
    setWatchedVideos(new Set());
    const link = videoLinks[0];
    if (link) {
      const videoId = (() => { try { return new URL(link.url).searchParams.get("v") ?? ""; } catch { return ""; } })();
      onWatchVideo(videoId, link.title, link.channelName ?? "");
    }
  }, [videoLinks, onWatchVideo]);

  if (!day) {
    return (
      <div className="empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📚</div>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Select a day to begin</h3>
        <p style={{ fontSize: "0.82rem", maxWidth: 320, lineHeight: 1.5 }}>
          Pick a day from the sidebar. Each day has videos and resources curated by your teacher.
        </p>
      </div>
    );
  }

  // Quiz-only mode
  if (quizOnly) {
    return (
      <div style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px" }}>
          {/* Compact header */}
          <div style={{
            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
            borderRadius: 14, padding: "16px 20px", marginBottom: 16, color: "#fff",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Target size={20} />
              <div>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 800 }}>Day {day} Quiz</h2>
                <p style={{ fontSize: "0.72rem", opacity: 0.8 }}>{dayData?.title || ""} • Need 67% to pass</p>
              </div>
            </div>
          </div>

          <QuizView
            quiz={quiz} answers={answers} evalResult={evalResult}
            onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
            isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading}
          />

          {/* Continue in Telegram */}
          {evalResult?.passed && (
            <div style={{
              marginTop: 20, padding: "14px 16px", borderRadius: 12,
              background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
              textAlign: "center",
            }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                🎉 Great job! Day {day} completed!
              </p>
              <a
                href={`https://t.me/csalearningbot?start=day${day + 1}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 8,
                  background: "#229ED9", color: "#fff",
                  fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
                }}
              >
                💬 Continue in Telegram — Day {day + 1}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px" }}>
        {/* Day header */}
        <div style={{
          background: "linear-gradient(135deg, var(--brand), var(--brand2))",
          borderRadius: 14, padding: "18px 20px", marginBottom: 16, color: "#fff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem", fontWeight: 800, flexShrink: 0,
            }}>
              {day}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 800, lineHeight: 1.3 }}>
                {dayData?.title || `Day ${day}`}
              </h2>
              <p style={{ fontSize: "0.72rem", opacity: 0.8, marginTop: 2 }}>
                {dayData?.description || "Watch the videos and take the quiz"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {dayData?.difficulty && (
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 600, background: "rgba(255,255,255,0.15)" }}>
                {dayData.difficulty}
              </span>
            )}
            {dayData?.estimatedMinutes && (
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 600, background: "rgba(255,255,255,0.15)" }}>
                ⏱ {dayData.estimatedMinutes} min
              </span>
            )}
            <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 600, background: "rgba(255,255,255,0.15)" }}>
              {links.length} resource{links.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Tab pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setTab("watch")} className={`simple-pill ${tab === "watch" ? "active" : ""}`}>
            <Play size={14} /> Watch & Learn
          </button>
          <button onClick={() => { setTab("quiz"); if (!quiz && !quizLoading) onLoadQuiz(); }} className={`simple-pill ${tab === "quiz" ? "active" : ""}`}>
            <Target size={14} /> Quiz
          </button>
        </div>

        {/* WATCH TAB — with playlist */}
        {tab === "watch" && (
          <div>
            {!hasLinks ? (
              <div className="empty-state">
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🔗</div>
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>No links yet</p>
                <p style={{ fontSize: "0.78rem" }}>Ask your teacher to add resources for Day {day}</p>
              </div>
            ) : (
              <>
                {/* Playlist Controls */}
                {hasVideos && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
                    padding: "10px 14px", borderRadius: 12,
                    background: "var(--surface2)", border: "1px solid var(--border)",
                  }}>
                    <List size={16} style={{ color: "var(--brand)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>
                        {playlistIdx >= 0
                          ? `Playing ${playlistIdx + 1}/${videoLinks.length}`
                          : `${videoLinks.length} video${videoLinks.length !== 1 ? "s" : ""} — play all in sequence`
                        }
                      </p>
                      <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                        {playlistIdx >= 0 ? "Next video plays automatically after current" : "Videos play one after another, then quiz"}
                      </p>
                    </div>
                    {playlistIdx >= 0 ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={skipVideo} style={{
                          padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
                          background: "var(--surface)", color: "var(--text)", fontSize: "0.72rem",
                          fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <SkipForward size={12} /> Skip
                        </button>
                      </div>
                    ) : (
                      <button onClick={startPlaylist} style={{
                        padding: "6px 12px", borderRadius: 8,
                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                        color: "#fff", fontSize: "0.72rem", fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        flexShrink: 0,
                      }}>
                        <Play size={12} fill="#fff" /> Play All
                      </button>
                    )}
                  </div>
                )}

                {/* Progress dots for playlist */}
                {playlistIdx >= 0 && hasVideos && (
                  <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                    {videoLinks.map((_, i) => (
                      <div key={i} style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: i < playlistIdx || watchedVideos.has(i)
                          ? "#10b981" : i === playlistIdx ? "#ef4444" : "var(--border)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                )}

                {/* Video cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {videoLinks.map((link, idx) => {
                    const videoId = (() => { try { return new URL(link.url).searchParams.get("v") ?? ""; } catch { return ""; } })();
                    const isPlaying = playlistIdx === idx;
                    const isWatched = watchedVideos.has(idx);

                    return (
                      <div key={link.id} style={{
                        ...linkCardStyle,
                        border: isPlaying
                          ? "2px solid #ef4444"
                          : isWatched
                          ? "2px solid #10b981"
                          : "1px solid var(--border)",
                        opacity: isWatched && !isPlaying ? 0.6 : 1,
                      }}>
                        {/* Video thumbnail */}
                        <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
                          <img
                            src={link.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                            alt={link.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }}
                          />
                          <button
                            onClick={() => {
                              if (playlistIdx >= 0) {
                                // In playlist mode — jump to this video
                                setPlaylistIdx(idx);
                                setWatchedVideos(prev => { const s = new Set(prev); for (let i = idx; i < playlistIdx; i++) s.add(i); return s; });
                              }
                              onWatchVideo(videoId, link.title, link.channelName ?? "");
                            }}
                            style={{
                              position: "absolute", inset: 0, display: "flex", alignItems: "center",
                              justifyContent: "center", background: "rgba(0,0,0,0.2)", border: "none", cursor: "pointer",
                            }}
                          >
                            <div style={{
                              width: 48, height: 48, borderRadius: "50%",
                              background: isPlaying ? "rgba(239,68,68,0.95)" : "rgba(239,68,68,0.9)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
                            }}>
                              {isPlaying ? <Pause size={20} fill="#fff" color="#fff" /> : <Play size={20} fill="#fff" color="#fff" style={{ marginLeft: 2 }} />}
                            </div>
                          </button>
                          {/* Status badge */}
                          <span style={{
                            position: "absolute", top: 6, left: 6,
                            padding: "2px 8px", borderRadius: 6, fontSize: "0.6rem", fontWeight: 700,
                            background: isWatched ? "#10b981" : isPlaying ? "#ef4444" : "rgba(0,0,0,0.6)",
                            color: "#fff",
                          }}>
                            {isWatched ? "✓ Done" : isPlaying ? "▶ Now" : `#${idx + 1}`}
                          </span>
                        </div>
                        <div style={{ padding: "10px 14px" }}>
                          <h4 style={{
                            fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.3,
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                          }}>
                            {link.title}
                          </h4>
                          {link.channelName && (
                            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 3 }}>
                              <Youtube size={10} style={{ display: "inline", marginRight: 3, color: "#ef4444" }} />
                              {link.channelName}
                            </p>
                          )}
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              if (playlistIdx >= 0) {
                                setPlaylistIdx(idx);
                                setWatchedVideos(prev => { const s = new Set(prev); for (let i = idx; i < playlistIdx; i++) s.add(i); return s; });
                              }
                              onWatchVideo(videoId, link.title, link.channelName ?? "");
                            }}
                            className="watch-btn red"
                            style={{ marginTop: 8 }}
                          >
                            <Play size={13} fill="#fff" /> {isPlaying ? "Now Playing" : "Watch"}
                          </a>
                        </div>
                      </div>
                    );
                  })}

                  {/* Non-video links */}
                  {nonVideoLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "12px 14px", borderRadius: 12,
                        background: "var(--surface2)", border: "1px solid var(--border)",
                        textDecoration: "none",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: "rgba(6,182,212,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {link.type === "blog" ? <Globe size={16} style={{ color: "var(--cyan)" }} /> : <ExternalLink size={16} style={{ color: "var(--brand)" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{link.title}</p>
                        <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{link.type === "blog" ? "Blog" : "Link"}</p>
                      </div>
                      <ExternalLink size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    </a>
                  ))}
                </div>
              </>
            )}

            {hasLinks && (
              <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => onAskAi(`Explain Day ${day}: ${dayData?.title || ""} in simple terms`)} className="simple-pill" style={{ fontSize: "0.75rem" }}>
                  <Sparkles size={12} /> Explain
                </button>
                <button onClick={() => onAskAi(`Key points from Day ${day}: ${dayData?.title || ""}`)} className="simple-pill" style={{ fontSize: "0.75rem" }}>
                  📝 Key points
                </button>
                <button onClick={() => { setTab("quiz"); onLoadQuiz(); }} className="simple-pill" style={{ fontSize: "0.75rem" }}>
                  <Target size={12} /> Take Quiz
                </button>
              </div>
            )}
          </div>
        )}

        {/* QUIZ TAB */}
        {tab === "quiz" && (
          <>
            <QuizView
              quiz={quiz} answers={answers} evalResult={evalResult}
              onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
              isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading}
            />

            {/* Continue in Telegram after pass */}
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
                  <a
                    href={`https://t.me/csalearningbot?start=day${day + 1}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", borderRadius: 8,
                      background: "#229ED9", color: "#fff",
                      fontSize: "0.78rem", fontWeight: 600, textDecoration: "none",
                    }}
                  >
                    💬 Telegram — Day {day + 1}
                  </a>
                  <button
                    onClick={onNextLesson}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", borderRadius: 8,
                      background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff",
                      fontSize: "0.78rem", fontWeight: 600, border: "none", cursor: "pointer",
                    }}
                  >
                    <ArrowRight size={13} /> Next Day Here
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Shared card style ────────────────────────────────────────────────────────
const linkCardStyle: React.CSSProperties = {
  borderRadius: 12,
  overflow: "hidden",
  background: "var(--surface)",
  transition: "border-color 0.2s",
};
