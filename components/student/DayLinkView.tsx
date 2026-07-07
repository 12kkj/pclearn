"use client";

import React, { useState } from "react";
import {
  Play, ExternalLink, Youtube, Globe, Search, Sparkles,
  CheckCircle2, Lock, Clock, ChevronRight, BookOpen, Target,
  MessageSquare, AlertCircle, Loader2, RotateCcw, Flame,
  Zap, Star, ChevronDown, Eye, ArrowRight,
} from "lucide-react";
import MarkdownViewer from "@/components/ui/MarkdownViewer";
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
}

// ─── Link Card ────────────────────────────────────────────────────────────────
function LinkCard({
  link,
  onWatch,
  index,
}: {
  link: AdminResourceLink;
  onWatch: () => void;
  index: number;
}) {
  const isVideo = link.type === "youtube";
  const videoId = isVideo
    ? (() => { try { return new URL(link.url).searchParams.get("v") ?? ""; } catch { return ""; } })()
    : "";
  const thumb = link.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  return (
    <div
      className="scale-in"
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        transition: "all 0.2s ease",
        animationDelay: `${index * 0.08}s`,
      }}
    >
      {/* Thumbnail for videos */}
      {isVideo && thumb && (
        <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
          <img
            src={thumb}
            alt={link.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }}
          />
          {/* Play overlay */}
          <button
            onClick={onWatch}
            style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(0,0,0,0.25)", border: "none",
              cursor: "pointer", transition: "background 0.2s",
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(239,68,68,0.9)", display: "flex", alignItems: "center",
              justifyContent: "center", boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
              border: "2px solid rgba(255,255,255,0.3)",
            }}>
              <Play size={22} fill="#fff" color="#fff" style={{ marginLeft: 2 }} />
            </div>
          </button>
          {/* Language badge */}
          <div style={{
            position: "absolute", top: 8, left: 8,
            padding: "3px 8px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700,
            background: "rgba(0,0,0,0.7)", color: "#fff", backdropFilter: "blur(4px)",
          }}>
            🎥 Video
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          {/* Icon for non-video */}
          {!isVideo && (
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: "rgba(6,182,212,0.12)", display: "flex", alignItems: "center",
              justifyContent: "center",
            }}>
              {link.type === "blog" ? (
                <Globe size={16} style={{ color: "var(--cyan)" }} />
              ) : (
                <Search size={16} style={{ color: "var(--brand)" }} />
              )}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{
              fontSize: "0.88rem", fontWeight: 700, color: "var(--text)",
              lineHeight: 1.35, marginBottom: 4,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {link.title}
            </h4>
            {link.channelName && (
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 4 }}>
                <Youtube size={10} style={{ display: "inline", marginRight: 3, color: "#ef4444" }} />
                {link.channelName}
              </p>
            )}
            {link.description && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                {link.description.length > 120 ? link.description.slice(0, 120) + "…" : link.description}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (isVideo && videoId) {
                e.preventDefault();
                onWatch();
              }
            }}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "10px 16px", borderRadius: 10,
              background: isVideo ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, var(--brand), var(--brand2))",
              color: "#fff", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none",
              border: "none", cursor: "pointer", transition: "all 0.15s",
              boxShadow: isVideo ? "0 4px 14px rgba(239,68,68,0.3)" : "0 4px 14px var(--brand-glow)",
            }}
          >
            <Play size={14} fill="#fff" /> Watch Here
          </a>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "10px 14px", borderRadius: 10,
              background: "var(--surface3)", color: "var(--text-muted)",
              fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
              border: "1px solid var(--border)", cursor: "pointer",
            }}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Section ─────────────────────────────────────────────────────────────
function QuizSection({
  quiz, answers, evalResult, onAnswer, onSubmit, onNextLesson,
  isSubmitting, day, onAskAi, onLoadQuiz, quizLoading,
}: {
  quiz: QuizData | null; answers: Record<string, string>; evalResult: EvalResult | null;
  onAnswer: (qId: string, val: string) => void; onSubmit: () => void;
  onNextLesson: () => void; isSubmitting: boolean; day: number;
  onAskAi: (prompt: string) => void; onLoadQuiz: () => void; quizLoading: boolean;
}) {
  const [showHint, setShowHint] = useState<string | null>(null);

  if (quizLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--brand)", margin: "0 auto 12px" }} />
        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>Generating quiz…</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px",
          background: "linear-gradient(135deg, var(--brand), var(--brand2))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Target size={28} color="#fff" />
        </div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
          Ready for the Quiz?
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
          Test your knowledge for Day {day}. You need 70% to pass and unlock the next day!
        </p>
        <button
          onClick={onLoadQuiz}
          style={{
            padding: "12px 28px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, var(--brand), var(--brand2))",
            color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 16px var(--brand-glow)",
          }}
        >
          <Target size={16} style={{ marginRight: 6 }} /> Start Quiz
        </button>
      </div>
    );
  }

  const allAnswered = quiz.questions.every(q => answers[q.id]?.trim());

  return (
    <div style={{ padding: 16 }}>
      {/* Quiz header */}
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
          {quiz.title}
        </h3>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Answer all questions — need 70% to unlock Day {day + 1}
        </p>
        {evalResult && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
            borderRadius: 10, marginTop: 10, fontWeight: 700, fontSize: "0.85rem",
            background: evalResult.passed ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
            color: evalResult.passed ? "var(--green)" : "var(--red)",
            border: `1.5px solid ${evalResult.passed ? "var(--green)" : "var(--red)"}40`,
          }}>
            {evalResult.passed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {evalResult.passed
              ? `PASSED! ${evalResult.correctCount ?? "?"}/${evalResult.totalQuestions ?? 12}`
              : `${evalResult.correctCount ?? 0}/${evalResult.totalQuestions ?? 12} — Need 70%`}
          </div>
        )}
      </div>

      {/* Mentor message */}
      {evalResult?.mentorMessage && (
        <div style={{
          padding: "12px 14px", marginBottom: 16, fontSize: "0.85rem", lineHeight: 1.6,
          borderRadius: 10,
          background: evalResult.passed ? "rgba(16,185,129,0.07)" : "rgba(99,102,241,0.07)",
          border: `1px solid ${evalResult.passed ? "var(--green)" : "var(--brand)"}30`,
          color: "var(--text)",
        }}>
          {evalResult.passed ? "🎉 " : "💪 "}{evalResult.mentorMessage}
        </div>
      )}

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {quiz.questions.map((q, i) => {
          const fb = evalResult?.feedback.find(f => f.questionId === q.id);
          const answered = !!answers[q.id]?.trim();
          return (
            <div key={i} style={{
              width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 700,
              background: fb ? (fb.isCorrect ? "var(--green)" : "var(--red)") : answered ? "var(--brand)" : "var(--surface3)",
              color: fb || answered ? "#fff" : "var(--text-muted)",
            }}>{i + 1}</div>
          );
        })}
      </div>

      {/* Questions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {quiz.questions.map((q, idx) => {
          const feedback = evalResult?.feedback.find(f => f.questionId === q.id);
          const isCorrect = feedback?.isCorrect;
          const isMCQ = q.type === "mcq" || q.type === "tf";

          return (
            <div key={q.id} style={{
              padding: 14, borderRadius: 12,
              background: "var(--surface2)",
              border: `1px solid ${feedback ? (isCorrect ? "var(--green)" : "var(--red)") : "var(--border)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                  flexShrink: 0, marginTop: 2,
                  background: "var(--brand-glow)", color: "var(--brand2)",
                }}>
                  Q{idx + 1}
                </span>
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.5 }}>
                  {q.question}
                </span>
              </div>

              {isMCQ && q.options.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {q.options.map(opt => {
                    const isSelected = answers[q.id] === opt;
                    let bg = "var(--surface3)";
                    let border = "var(--border)";
                    let color = "var(--text2)";

                    if (feedback) {
                      if (opt === feedback.correctAnswer) {
                        bg = "rgba(16,185,129,0.15)"; border = "var(--green)"; color = "var(--green)";
                      } else if (isSelected && !isCorrect) {
                        bg = "rgba(239,68,68,0.15)"; border = "var(--red)"; color = "var(--red)";
                      }
                    } else if (isSelected) {
                      bg = "rgba(99,102,241,0.15)"; border = "var(--brand)"; color = "var(--brand2)";
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => !evalResult && onAnswer(q.id, opt)}
                        disabled={!!evalResult}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, width: "100%",
                          padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${border}`,
                          background: bg, color, fontSize: "0.82rem", fontWeight: 500,
                          cursor: evalResult ? "default" : "pointer", textAlign: "left",
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{
                          width: 20, height: 20, borderRadius: "50%", border: "2px solid currentColor",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          fontSize: "0.7rem",
                        }}>
                          {feedback && opt === feedback.correctAnswer && "✓"}
                          {feedback && isSelected && !isCorrect && opt !== feedback.correctAnswer && "✗"}
                          {!feedback && isSelected && "●"}
                        </span>
                        <span style={{ flex: 1 }}>{opt}</span>
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
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    background: "var(--surface3)", border: "1px solid var(--border)",
                    color: "var(--text)", fontSize: "0.82rem", resize: "none",
                    fontFamily: "inherit",
                  }}
                />
              )}

              {/* Feedback */}
              {feedback && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 8, fontSize: "0.8rem", lineHeight: 1.5,
                  background: isCorrect ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)",
                  border: `1px solid ${isCorrect ? "var(--green)" : "var(--red)"}30`,
                  color: "var(--text)",
                }}>
                  {isCorrect ? "✅ Correct! " : `❌ Answer: ${feedback.correctAnswer}. `}
                  {feedback.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit / Next */}
      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        {!evalResult ? (
          <button
            onClick={onSubmit}
            disabled={!allAnswered || isSubmitting}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 20px", borderRadius: 12, border: "none",
              background: (!allAnswered || isSubmitting) ? "var(--surface3)" : "linear-gradient(135deg, var(--brand), var(--brand2))",
              color: (!allAnswered || isSubmitting) ? "var(--text-muted)" : "#fff",
              fontSize: "0.88rem", fontWeight: 700, cursor: (!allAnswered || isSubmitting) ? "not-allowed" : "pointer",
              boxShadow: (!allAnswered || isSubmitting) ? "none" : "0 4px 16px var(--brand-glow)",
            }}
          >
            {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Evaluating…</> : <><Target size={15} /> Submit Answers</>}
          </button>
        ) : evalResult.passed ? (
          <button
            onClick={onNextLesson}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 20px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #059669, #10b981)",
              color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
            }}
          >
            <ArrowRight size={15} /> Unlock Day {day + 1} 🎉
          </button>
        ) : (
          <button
            onClick={onSubmit}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 20px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, var(--brand), var(--brand2))",
              color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
            }}
          >
            <RotateCcw size={15} /> Try Again
          </button>
        )}
      </div>

      {/* Ask AI after results */}
      {evalResult && (
        <button
          onClick={() => onAskAi(
            evalResult.passed
              ? `I passed Day ${day} quiz. Help me prepare for Day ${day + 1}.`
              : `I failed Day ${day} quiz. Explain my weak areas and help me pass.`
          )}
          style={{
            width: "100%", marginTop: 10, padding: "10px 16px", borderRadius: 10,
            border: "1px solid var(--brand)", background: "rgba(99,102,241,0.08)",
            color: "var(--brand2)", fontSize: "0.82rem", fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Sparkles size={14} /> Ask AI About Results
        </button>
      )}
    </div>
  );
}

// ─── Main DayLinkView ─────────────────────────────────────────────────────────
export default function DayLinkView({
  day, dayData, learner, isStreaming, lessonContent,
  quiz, quizLoading, answers, evalResult, isSubmitting,
  onAnswer, onSubmitQuiz, onNextLesson, onLoadQuiz,
  onStartDay, onAskAi, onWatchVideo,
}: Props) {
  const [activeSection, setActiveSection] = useState<"links" | "quiz">("links");

  if (!day) {
    return (
      <div style={{
        height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16, padding: 32,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <BookOpen size={36} style={{ color: "var(--brand)" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
            Select a Day to Begin
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 360, lineHeight: 1.5 }}>
            Choose a day from the sidebar or start your journey from Day 1. Each day has curated videos and resources — no boring textbooks!
          </p>
        </div>
      </div>
    );
  }

  const links = dayData?.resources ?? [];
  const videoLinks = links.filter(l => l.type === "youtube");
  const articleLinks = links.filter(l => l.type !== "youtube");
  const hasLinks = links.length > 0;
  const phaseColors: Record<number, string> = {
    1: "#3b82f6", 2: "#8b5cf6", 3: "#f97316", 4: "#22c55e",
    5: "#14b8a6", 6: "#eab308", 7: "#ef4444", 8: "#6366f1",
    9: "#06b6d4", 10: "#ec4899", 11: "#7c3aed",
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>
        {/* Day Header */}
        <div style={{
          background: "linear-gradient(135deg, var(--brand), var(--brand2))",
          borderRadius: 16, padding: "20px 24px", marginBottom: 20, color: "#fff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "1.2rem", fontWeight: 800,
            }}>
              D{day}
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, lineHeight: 1.3 }}>
                {dayData?.title || `Day ${day}`}
              </h2>
              <p style={{ fontSize: "0.75rem", opacity: 0.85 }}>
                {dayData?.description || "Watch the videos and take the quiz to proceed"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {dayData?.phase && (
              <span style={{
                padding: "3px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 600,
                background: "rgba(255,255,255,0.2)", color: "#fff",
              }}>
                Phase {dayData.phase}
              </span>
            )}
            {dayData?.difficulty && (
              <span style={{
                padding: "3px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 600,
                background: "rgba(255,255,255,0.2)", color: "#fff",
              }}>
                {dayData.difficulty === "beginner" ? "🌱" : dayData.difficulty === "intermediate" ? "📈" : "🔥"} {dayData.difficulty}
              </span>
            )}
            {dayData?.estimatedMinutes && (
              <span style={{
                padding: "3px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 600,
                background: "rgba(255,255,255,0.2)", color: "#fff",
              }}>
                ⏱ {dayData.estimatedMinutes} min
              </span>
            )}
            <span style={{
              padding: "3px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 600,
              background: "rgba(255,255,255,0.2)", color: "#fff",
            }}>
              {links.length} resource{links.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Section Toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--surface2)", borderRadius: 10, padding: 4 }}>
          <button
            onClick={() => setActiveSection("links")}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
              background: activeSection === "links" ? "var(--brand)" : "transparent",
              color: activeSection === "links" ? "#fff" : "var(--text-muted)",
              fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 0.15s",
            }}
          >
            <Play size={14} /> Watch & Learn
            {hasLinks && (
              <span style={{
                padding: "1px 6px", borderRadius: 99, fontSize: "0.65rem",
                background: activeSection === "links" ? "rgba(255,255,255,0.2)" : "var(--brand-glow)",
                color: activeSection === "links" ? "#fff" : "var(--brand2)",
              }}>
                {links.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSection("quiz")}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
              background: activeSection === "quiz" ? "var(--brand)" : "transparent",
              color: activeSection === "quiz" ? "#fff" : "var(--text-muted)",
              fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 0.15s",
            }}
          >
            <Target size={14} /> Quiz
          </button>
        </div>

        {/* LINKS Section */}
        {activeSection === "links" && (
          <div>
            {!hasLinks ? (
              <div style={{
                textAlign: "center", padding: "40px 20px", background: "var(--surface2)",
                borderRadius: 14, border: "1px dashed var(--border)",
              }}>
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔗</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                  No Links Added Yet
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, maxWidth: 320, margin: "0 auto" }}>
                  The admin hasn't added resources for Day {day} yet. Check back soon or ask your teacher!
                </p>
              </div>
            ) : (
              <>
                {/* Videos */}
                {videoLinks.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{
                      fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <Youtube size={14} style={{ color: "#ef4444" }} />
                      Videos to Watch ({videoLinks.length})
                    </h3>
                    <div style={{ display: "grid", gap: 12 }}>
                      {videoLinks.map((link, i) => (
                        <LinkCard
                          key={link.id}
                          link={link}
                          index={i}
                          onWatch={() => {
                            const videoId = (() => { try { return new URL(link.url).searchParams.get("v") ?? ""; } catch { return ""; } })();
                            onWatchVideo(videoId, link.title, link.channelName ?? "");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Articles & Links */}
                {articleLinks.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{
                      fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <Globe size={14} style={{ color: "var(--cyan)" }} />
                      Articles & Links ({articleLinks.length})
                    </h3>
                    <div style={{ display: "grid", gap: 10 }}>
                      {articleLinks.map((link, i) => (
                        <LinkCard
                          key={link.id}
                          link={link}
                          index={i + videoLinks.length}
                          onWatch={() => window.open(link.url, "_blank")}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick AI actions */}
                <div style={{
                  background: "var(--surface2)", borderRadius: 12, padding: "14px 16px",
                  border: "1px solid var(--border)",
                }}>
                  <h4 style={{
                    fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
                  }}>
                    🤖 Quick Help
                  </h4>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { label: "📋 Explain this day", prompt: `Explain Day ${day}: ${dayData?.title || ""} in simple terms` },
                      { label: "🎯 Quiz me", prompt: `Ask me 3 quick questions about Day ${day}: ${dayData?.title || ""}` },
                      { label: "📝 Key points", prompt: `Give me the key takeaways from Day ${day}: ${dayData?.title || ""}` },
                    ].map(qa => (
                      <button
                        key={qa.label}
                        onClick={() => onAskAi(qa.prompt)}
                        style={{
                          padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)",
                          background: "var(--surface3)", color: "var(--text2)",
                          fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* QUIZ Section */}
        {activeSection === "quiz" && (
          <div style={{
            background: "var(--surface2)", borderRadius: 14,
            border: "1px solid var(--border)", overflow: "hidden",
          }}>
            <QuizSection
              quiz={quiz}
              answers={answers}
              evalResult={evalResult}
              onAnswer={onAnswer}
              onSubmit={onSubmitQuiz}
              onNextLesson={onNextLesson}
              isSubmitting={isSubmitting}
              day={day}
              onAskAi={onAskAi}
              onLoadQuiz={onLoadQuiz}
              quizLoading={quizLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
