"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Target, Play, CheckCircle2, AlertCircle, RotateCcw,
  ArrowRight, Loader2, Sparkles, Clock, Trophy, Flame,
  Star, Award, Zap, ChevronRight, Shield,
} from "lucide-react";
import type { QuizQuestion } from "@/types";

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

interface PeriodicTestConfig {
  id: string;
  label: string;
  description: string;
  dayRange: number;       // e.g. 7 or 15
  requiredCompleted: number;  // minimum completed days to unlock
  icon: string;
  color: string;
}

interface TestHistory {
  testId: string;
  completedAt: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
}

interface Props {
  completedDays: number[];
  currentDay: number;
  testScores: Record<number, number>;
  onAskAi: (prompt: string) => void;
}

// ─── Test Configurations ──────────────────────────────────────────────────────
const PERIODIC_TESTS: PeriodicTestConfig[] = [
  {
    id: "weekly_7",
    label: "7-Day Review",
    description: "Covers material from the last 7 days of your journey",
    dayRange: 7,
    requiredCompleted: 7,
    icon: "📅",
    color: "#6366f1",
  },
  {
    id: "biweekly_15",
    label: "15-Day Review",
    description: "Comprehensive test covering the last 15 days of learning",
    dayRange: 15,
    requiredCompleted: 15,
    icon: "🎯",
    color: "#8b5cf6",
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────
function getTestHistory(): TestHistory[] {
  try { return JSON.parse(localStorage.getItem("csa_periodic_test_history") ?? "[]"); } catch { return []; }
}
function saveTestHistory(history: TestHistory[]) {
  try { localStorage.setItem("csa_periodic_test_history", JSON.stringify(history.slice(-20))); } catch { /* */ }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PeriodicTest({ completedDays, currentDay, testScores, onAskAi }: Props) {
  const [selectedTest, setSelectedTest] = useState<PeriodicTestConfig | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<TestHistory[]>([]);

  useEffect(() => { setHistory(getTestHistory()); }, []);

  const loadQuiz = useCallback(async (config: PeriodicTestConfig) => {
    setQuizLoading(true);
    setQuiz(null);
    setAnswers({});
    setEvalResult(null);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_weekly_quiz",
          day: currentDay,
          learnerProfile: "periodic review",
          weakTopics: [],
        }),
      });
      if (!res.ok) throw new Error("Quiz API failed");
      const data = await res.json();
      setQuiz(data);
    } catch (e) { console.error(e); }
    setQuizLoading(false);
  }, [currentDay]);

  const submitQuiz = useCallback(async () => {
    if (!quiz || !selectedTest) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate_weekly_quiz",
          day: currentDay,
          learnerProfile: "periodic review",
          currentQuestionSet: quiz,
          userAnswers: answers,
        }),
      });
      if (!res.ok) throw new Error("Evaluate API failed");
      const result: EvalResult = await res.json();
      setEvalResult(result);

      // Save to history
      const record: TestHistory = {
        testId: selectedTest.id,
        completedAt: new Date().toISOString(),
        score: result.correctCount ?? 0,
        totalQuestions: result.totalQuestions ?? 50,
        passed: result.passed,
      };
      const newHistory = [...getTestHistory(), record];
      setHistory(newHistory);
      saveTestHistory(newHistory);
    } catch (e) { console.error(e); }
    setIsSubmitting(false);
  }, [quiz, selectedTest, answers, currentDay]);

  const resetTest = () => {
    setQuiz(null);
    setAnswers({});
    setEvalResult(null);
    setSelectedTest(null);
  };

  // ─── Test Selection Screen ────────────────────────────────────────────
  if (!selectedTest) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: "0 auto 12px",
            background: "linear-gradient(135deg, var(--brand), var(--brand2))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Target size={24} color="#fff" />
          </div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
            Periodic Tests
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Test your knowledge after completing enough days. These tests review everything you've learned.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--brand)" }}>{completedDays.length}</p>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>DAYS DONE</p>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--green)" }}>{history.filter(h => h.passed).length}</p>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>PASSED</p>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--cyan)" }}>{history.length}</p>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>TAKEN</p>
          </div>
        </div>

        {/* Test Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PERIODIC_TESTS.map(test => {
            const unlocked = completedDays.length >= test.requiredCompleted;
            const lastResult = [...history].reverse().find(h => h.testId === test.id);
            return (
              <div key={test.id} style={{
                padding: 16, borderRadius: 12, background: "var(--surface)",
                border: `1px solid ${unlocked ? "var(--border)" : "var(--border)"}`,
                opacity: unlocked ? 1 : 0.5, transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: unlocked ? `${test.color}15` : "var(--surface2)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
                  }}>
                    {unlocked ? test.icon : "🔒"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>
                      {test.label}
                    </h3>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                      {unlocked ? test.description : `Complete ${test.requiredCompleted} days to unlock (${completedDays.length}/${test.requiredCompleted})`}
                    </p>
                    {lastResult && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        {lastResult.passed
                          ? <CheckCircle2 size={12} style={{ color: "var(--green)" }} />
                          : <AlertCircle size={12} style={{ color: "var(--red)" }} />}
                        <span style={{
                          fontSize: "0.68rem", fontWeight: 600,
                          color: lastResult.passed ? "var(--green)" : "var(--red)",
                        }}>
                          Last: {lastResult.score}/{lastResult.totalQuestions}
                        </span>
                        <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                          • {new Date(lastResult.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {unlocked && (
                    <button
                      onClick={() => { setSelectedTest(test); loadQuiz(test); }}
                      style={{
                        padding: "8px 14px", borderRadius: 8, border: "none",
                        background: `linear-gradient(135deg, ${test.color}, ${test.color}dd)`,
                        color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <Play size={13} fill="#fff" /> Start
                    </button>
                  )}
                </div>
                {/* Progress to unlock */}
                {!unlocked && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 4, borderRadius: 99, background: "var(--surface3)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 99,
                        background: `linear-gradient(90deg, ${test.color}, ${test.color}cc)`,
                        width: `${Math.min(100, (completedDays.length / test.requiredCompleted) * 100)}%`,
                      }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Recent History */}
        {history.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Recent Results
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {history.slice(-5).reverse().map((h, i) => {
                const config = PERIODIC_TESTS.find(t => t.id === h.testId);
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                    borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)",
                  }}>
                    {h.passed
                      ? <CheckCircle2 size={13} style={{ color: "var(--green)", flexShrink: 0 }} />
                      : <AlertCircle size={13} style={{ color: "var(--red)", flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
                        {config?.icon} {config?.label ?? h.testId}
                      </p>
                    </div>
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 700,
                      color: h.passed ? "var(--green)" : "var(--red)",
                    }}>
                      {h.score}/{h.totalQuestions}
                    </span>
                    <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                      {new Date(h.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Quiz View ─────────────────────────────────────────────────────────
  if (quizLoading) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px", textAlign: "center" }}>
        <Loader2 size={36} className="spinner" style={{ color: "var(--brand)", margin: "0 auto 12px" }} />
        <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>
          Generating {selectedTest.label}…
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
          This may take a moment — AI is crafting 50 questions
        </p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px", textAlign: "center" }}>
        <AlertCircle size={32} style={{ color: "var(--red)", margin: "0 auto 12px" }} />
        <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>Failed to load quiz</p>
        <button onClick={resetTest} className="watch-btn purple" style={{ maxWidth: 160, margin: "12px auto 0" }}>
          <RotateCcw size={14} /> Go Back
        </button>
      </div>
    );
  }

  const allAnswered = quiz.questions.every(q => answers[q.id]?.trim());

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px" }}>
      {/* Back button + header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={resetTest} style={{
          padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
          background: "var(--surface)", color: "var(--text-muted)", fontSize: "0.78rem",
          fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>← Back</button>
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text)" }}>
            {selectedTest.icon} {selectedTest.label}
          </h2>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
            {quiz.questions.length} questions • 80% to pass
          </p>
        </div>
      </div>

      {/* Result banner */}
      {evalResult && (
        <div style={{
          padding: "14px 16px", borderRadius: 12, marginBottom: 16,
          background: evalResult.passed ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.06)",
          border: `1px solid ${evalResult.passed ? "var(--green)" : "var(--red)"}30`,
          textAlign: "center",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, margin: "0 auto 8px",
            background: evalResult.passed ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {evalResult.passed ? <Trophy size={20} style={{ color: "var(--green)" }} /> : <AlertCircle size={20} style={{ color: "var(--red)" }} />}
          </div>
          <p style={{ fontSize: "0.95rem", fontWeight: 800, color: evalResult.passed ? "var(--green)" : "var(--red)" }}>
            {evalResult.passed ? "🎉 PASSED!" : "💪 Not quite there"}
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--text)", marginTop: 4 }}>
            {evalResult.correctCount}/{evalResult.totalQuestions} correct
            {evalResult.passed ? " — Excellent work!" : " — Need 80% to pass"}
          </p>
          {evalResult.mentorMessage && (
            <p style={{ fontSize: "0.75rem", color: "var(--text2)", marginTop: 8, lineHeight: 1.5 }}>
              {evalResult.mentorMessage}
            </p>
          )}
        </div>
      )}

      {/* Questions */}
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
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", marginBottom: 8, lineHeight: 1.5 }}>
                <span style={{ color: "var(--brand2)", fontWeight: 700 }}>Q{idx + 1}. </span>
                {q.question}
              </p>

              {isMCQ && q.options.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {q.options.map(opt => {
                    const isSelected = answers[q.id] === opt;
                    let bg = "var(--surface2)";
                    let border = "var(--border)";
                    let color = "var(--text2)";

                    if (feedback) {
                      if (opt === feedback.correctAnswer) { bg = "rgba(16,185,129,0.12)"; border = "var(--green)"; color = "var(--green)"; }
                      else if (isSelected && !isCorrect) { bg = "rgba(239,68,68,0.1)"; border = "var(--red)"; color = "var(--red)"; }
                    } else if (isSelected) {
                      bg = "rgba(99,102,241,0.1)"; border = "var(--brand)"; color = "var(--brand2)";
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => !evalResult && setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        disabled={!!evalResult}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, width: "100%",
                          padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${border}`,
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
                  onChange={e => !evalResult && setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  disabled={!!evalResult}
                  rows={2}
                  style={{
                    width: "100%", padding: "8px", borderRadius: 8,
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

      {/* Submit / Next */}
      <div style={{ marginTop: 16 }}>
        {!evalResult ? (
          <button
            onClick={submitQuiz}
            disabled={!allAnswered || isSubmitting}
            className="watch-btn purple"
            style={{ opacity: (!allAnswered || isSubmitting) ? 0.5 : 1, cursor: (!allAnswered || isSubmitting) ? "not-allowed" : "pointer" }}
          >
            {isSubmitting ? <><Loader2 size={14} className="spinner" /> Evaluating…</> : <><Target size={14} /> Submit Test</>}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={resetTest} className="watch-btn purple" style={{ flex: 1 }}>
              <RotateCcw size={14} /> View All Tests
            </button>
            {!evalResult.passed && (
              <button
                onClick={() => { setQuiz(null); setAnswers({}); setEvalResult(null); loadQuiz(selectedTest); }}
                className="watch-btn red"
                style={{ flex: 1 }}
              >
                <RotateCcw size={14} /> Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ask AI */}
      {evalResult && (
        <button
          onClick={() => onAskAi(
            evalResult.passed
              ? `I passed the ${selectedTest.label}. Help me prepare for the next milestone.`
              : `I scored ${evalResult.correctCount}/${evalResult.totalQuestions} on the ${selectedTest.label}. Help me improve.`
          )}
          style={{
            width: "100%", marginTop: 10, padding: "10px", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--text2)", fontSize: "0.78rem", fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "inherit",
          }}
        >
          <Sparkles size={13} /> Ask AI About Results
        </button>
      )}
    </div>
  );
}
