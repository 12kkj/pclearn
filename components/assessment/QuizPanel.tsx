"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, XCircle, HelpCircle, AlertTriangle, Loader2 } from "lucide-react";
import type { QuizData, Question } from "@/types";

interface Props {
  quiz: QuizData | null;
  isLoading: boolean;
  onSubmit: (answers: Record<string, string>) => void;
  feedback: FeedbackState | null;
  onRequestQuiz: () => void;
}

export interface FeedbackState {
  passed: boolean;
  score: number;
  totalQuestions: number;
  feedback: string;
  answers: Array<{ questionId: string; correct: boolean; explanation: string }>;
}

function QuestionCard({
  question,
  answer,
  onChange,
  feedback,
  submitted,
}: {
  question: Question;
  answer: string;
  onChange: (val: string) => void;
  feedback?: { correct: boolean; explanation: string };
  submitted: boolean;
}) {
  const typeLabel: Record<Question["type"], string> = {
    mcq: "MCQ",
    fill: "Fill in the Blank",
    truefalse: "True / False",
    scenario: "Scenario",
    viva: "Viva / Short Answer",
  };

  const diffColor: Record<string, string> = {
    easy: "#10b981",
    medium: "#f59e0b",
    hard: "#ef4444",
  };

  return (
    <div
      style={{
        border: "1px solid",
        borderColor: submitted
          ? feedback?.correct
            ? "rgba(16,185,129,0.4)"
            : "rgba(239,68,68,0.4)"
          : "var(--border)",
        borderRadius: 12,
        padding: "14px 16px",
        background: submitted
          ? feedback?.correct
            ? "rgba(16,185,129,0.06)"
            : "rgba(239,68,68,0.06)"
          : "var(--surface2)",
      }}
    >
      {/* Question header */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {typeLabel[question.type]}
        </span>
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 600,
            color: diffColor[question.difficulty] ?? "#6b7280",
          }}
        >
          {question.difficulty}
        </span>
        {question.isWeakTopic && (
          <span
            style={{
              fontSize: "0.62rem",
              color: "#f59e0b",
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <AlertTriangle size={11} /> Weak topic
          </span>
        )}
        {submitted && (
          <span style={{ marginLeft: "auto" }}>
            {feedback?.correct ? (
              <CheckCircle2 size={16} color="#10b981" />
            ) : (
              <XCircle size={16} color="#ef4444" />
            )}
          </span>
        )}
      </div>

      {/* Question text */}
      <p
        style={{
          fontSize: "0.88rem",
          fontWeight: 500,
          color: "var(--text)",
          margin: "0 0 12px",
          lineHeight: 1.6,
        }}
      >
        {question.text}
      </p>

      {/* MCQ options */}
      {question.type === "mcq" && question.options && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {question.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = answer === letter;
            const isCorrect = submitted && feedback?.correct && isSelected;
            const isWrong = submitted && !feedback?.correct && isSelected;

            return (
              <button
                key={i}
                className={`quiz-option ${isSelected ? (isCorrect ? "correct" : isWrong ? "wrong" : "selected") : ""}`}
                onClick={() => !submitted && onChange(letter)}
                disabled={submitted}
                style={{ width: "100%" }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: isSelected
                      ? isCorrect
                        ? "#10b981"
                        : isWrong
                        ? "#ef4444"
                        : "#6366f1"
                      : "var(--surface2)",
                    color: isSelected ? "#fff" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    flexShrink: 0,
                    border: "1px solid var(--border)",
                  }}
                >
                  {letter}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--text)", textAlign: "left" }}>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* True/False */}
      {question.type === "truefalse" && (
        <div style={{ display: "flex", gap: 8 }}>
          {["True", "False"].map((opt) => {
            const isSelected = answer === opt;
            const isCorrect = submitted && feedback?.correct && isSelected;
            const isWrong = submitted && !feedback?.correct && isSelected;
            return (
              <button
                key={opt}
                className={`quiz-option ${isSelected ? (isCorrect ? "correct" : isWrong ? "wrong" : "selected") : ""}`}
                onClick={() => !submitted && onChange(opt)}
                disabled={submitted}
                style={{ flex: 1, justifyContent: "center" }}
              >
                <span style={{ fontSize: "0.9rem" }}>
                  {opt === "True" ? "✅" : "❌"}
                </span>
                <span style={{ fontWeight: 600 }}>{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Fill in the blank / Scenario / Viva */}
      {(question.type === "fill" || question.type === "scenario" || question.type === "viva") && (
        <textarea
          value={answer}
          onChange={(e) => !submitted && onChange(e.target.value)}
          disabled={submitted}
          rows={question.type === "fill" ? 2 : 4}
          placeholder={
            question.type === "fill"
              ? "Type your answer..."
              : "Write your detailed answer here..."
          }
          style={{
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 10px",
            color: "var(--text)",
            fontSize: "0.85rem",
            resize: "vertical",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.6,
          }}
        />
      )}

      {/* Feedback explanation */}
      {submitted && feedback && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            borderRadius: 8,
            background: feedback.correct
              ? "rgba(16,185,129,0.08)"
              : "rgba(239,68,68,0.08)",
            border: `1px solid ${feedback.correct ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
            fontSize: "0.78rem",
            color: feedback.correct ? "#10b981" : "#ef4444",
            lineHeight: 1.6,
          }}
        >
          {feedback.explanation}
        </div>
      )}
    </div>
  );
}

export default function QuizPanel({
  quiz,
  isLoading,
  onSubmit,
  feedback,
  onRequestQuiz,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = useCallback((questionId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  }, []);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    onSubmit(answers);
  }, [answers, onSubmit]);

  const handleRetry = useCallback(() => {
    setAnswers({});
    setSubmitted(false);
    onRequestQuiz();
  }, [onRequestQuiz]);

  const allAnswered =
    quiz && quiz.questions.every((q) => answers[q.id]?.trim());

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 16,
        }}
      >
        <Loader2 size={32} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Generating your assessment...
        </p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 16,
          color: "var(--text-muted)",
        }}
      >
        <HelpCircle size={40} style={{ opacity: 0.3 }} />
        <div style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>No assessment loaded</p>
          <p style={{ fontSize: "0.85rem", marginBottom: 16 }}>
            Type <code style={{ background: "var(--surface2)", padding: "2px 6px", borderRadius: 4 }}>day N</code> in the terminal to trigger a test
          </p>
        </div>
        <button
          onClick={onRequestQuiz}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            background: "#6366f1",
            color: "#fff",
            border: "none",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Generate Quiz
        </button>
      </div>
    );
  }

  const score = feedback?.score ?? 0;
  const passed = feedback?.passed ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Quiz header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
              📝 Day {quiz.day} Assessment
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
              {quiz.topic} · {quiz.questions.length} questions · All must be correct to pass
            </div>
          </div>
          {feedback && (
            <div
              style={{
                padding: "6px 14px",
                borderRadius: 99,
                background: passed ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                border: `1px solid ${passed ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                fontSize: "0.85rem",
                fontWeight: 700,
                color: passed ? "#10b981" : "#ef4444",
              }}
            >
              {passed ? "✅ PASSED" : `❌ ${score}/${quiz.questions.length}`}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!submitted && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(Object.keys(answers).length / quiz.questions.length) * 100}%`,
                  background: "#6366f1",
                  borderRadius: 99,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 4 }}>
              {Object.keys(answers).filter((k) => answers[k]?.trim()).length}/{quiz.questions.length} answered
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* Overall feedback */}
        {feedback && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              marginBottom: 16,
              background: passed ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${passed ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
              fontSize: "0.85rem",
              lineHeight: 1.7,
              color: "var(--text)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {passed ? "🎉 Excellent work!" : "💪 Keep going!"}
            </div>
            {feedback.feedback}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {quiz.questions.map((q, idx) => {
            const qFeedback = feedback?.answers.find((a) => a.questionId === q.id);
            return (
              <div key={q.id}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 6 }}>
                  Question {idx + 1} of {quiz.questions.length}
                </div>
                <QuestionCard
                  question={q}
                  answer={answers[q.id] ?? ""}
                  onChange={(val) => handleChange(q.id, val)}
                  feedback={qFeedback}
                  submitted={submitted}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "12px 16px",
          background: "var(--surface)",
          flexShrink: 0,
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
        }}
      >
        {submitted ? (
          <>
            {!passed && (
              <button
                onClick={handleRetry}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  background: "#6366f1",
                  color: "#fff",
                  border: "none",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🔄 Try Again
              </button>
            )}
            {passed && (
              <div
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  background: "rgba(16,185,129,0.15)",
                  color: "#10b981",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  border: "1px solid rgba(16,185,129,0.3)",
                }}
              >
                🎉 Next lesson unlocked! Check the terminal.
              </div>
            )}
          </>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              padding: "9px 24px",
              borderRadius: 8,
              background: allAnswered ? "#6366f1" : "var(--surface2)",
              color: allAnswered ? "#fff" : "var(--text-muted)",
              border: `1px solid ${allAnswered ? "#6366f1" : "var(--border)"}`,
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: allAnswered ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            Submit for Grading →
          </button>
        )}
      </div>
    </div>
  );
}
