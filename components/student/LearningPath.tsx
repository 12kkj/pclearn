"use client";
import React, { useMemo } from "react";
import { Route, ChevronRight, CheckCircle2, Lock, Play, Star } from "lucide-react";
import { PHASES, getLessonByDay, getPhaseForDay } from "@/lib/curriculum";

/**
 * Visual learning path showing progress through all phases.
 * Timeline-style with connected nodes.
 */
export default function LearningPath({
  completedDays,
  currentDay,
  onSelectDay,
}: {
  completedDays: number[];
  currentDay: number;
  onSelectDay: (day: number) => void;
}) {
  const completedSet = useMemo(() => new Set(completedDays), [completedDays]);

  const phaseData = useMemo(() => {
    return PHASES.map(phase => {
      const lessons = phase.days.map(d => getLessonByDay(d)).filter(Boolean);
      const done = phase.days.filter(d => completedSet.has(d)).length;
      const pct = phase.days.length > 0 ? Math.round((done / phase.days.length) * 100) : 0;
      const firstIncomplete = phase.days.find(d => !completedSet.has(d));
      return { ...phase, done, pct, lessons, firstIncomplete };
    });
  }, [completedDays]);

  const totalDone = completedDays.length;
  const totalLessons = 100;

  return (
    <div style={{ padding: 16, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Route size={18} style={{ color: "var(--brand)" }} />
        <p style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text)" }}>Learning Path</p>
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16 }}>
        {totalDone}/{totalLessons} days completed • {Math.round((totalDone / totalLessons) * 100)}% overall
      </p>

      {/* Overall progress */}
      <div style={{ height: 8, borderRadius: 4, background: "var(--surface2)", marginBottom: 20, overflow: "hidden" }}>
        <div style={{
          width: `${(totalDone / totalLessons) * 100}%`, height: "100%", borderRadius: 4,
          background: "linear-gradient(90deg, var(--brand), var(--cyan))", transition: "width 0.5s",
        }} />
      </div>

      {/* Phase timeline */}
      <div style={{ position: "relative", paddingLeft: 28 }}>
        {/* Vertical line */}
        <div style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 2, background: "var(--border)", borderRadius: 1 }} />

        {phaseData.map((phase, i) => {
          const isComplete = phase.done === phase.days.length;
          const isCurrent = !isComplete && phase.days.some(d => d <= currentDay + 2);
          const nodeColor = isComplete ? "var(--green)" : isCurrent ? "var(--brand)" : "var(--border)";

          return (
            <div key={phase.id} style={{ position: "relative", marginBottom: i < phaseData.length - 1 ? 16 : 0 }}>
              {/* Node */}
              <div style={{
                position: "absolute", left: -28, top: 2, width: 24, height: 24, borderRadius: "50%",
                background: nodeColor, display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid var(--surface)`, zIndex: 1,
              }}>
                {isComplete ? (
                  <CheckCircle2 size={12} style={{ color: "#fff" }} />
                ) : isCurrent ? (
                  <Play size={10} style={{ color: "#fff", marginLeft: 1 }} />
                ) : (
                  <Lock size={10} style={{ color: "var(--text-muted)" }} />
                )}
              </div>

              {/* Phase card */}
              <div style={{
                padding: "10px 14px", borderRadius: 10, border: `1px solid ${isCurrent ? "var(--brand)" : "var(--border)"}`,
                background: isCurrent ? "var(--brand-glow)" : "var(--surface2)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: "1rem" }}>{phase.icon}</span>
                  <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", flex: 1 }}>
                    Phase {phase.id}: {phase.name}
                  </p>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: nodeColor }}>{phase.done}/{phase.days.length}</span>
                </div>

                {/* Progress bar */}
                <div style={{ height: 3, borderRadius: 2, background: "var(--border)", marginBottom: 8 }}>
                  <div style={{ width: `${phase.pct}%`, height: "100%", borderRadius: 2, background: nodeColor, transition: "width 0.3s" }} />
                </div>

                {/* Day chips - show first 8 */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {phase.days.slice(0, 10).map(day => {
                    const done = completedSet.has(day);
                    const isCur = day === currentDay;
                    return (
                      <button key={day} onClick={() => onSelectDay(day)} style={{
                        width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
                        background: done ? "var(--green)" : isCur ? "var(--brand)" : "var(--surface)",
                        color: done || isCur ? "#fff" : "var(--text-muted)",
                        fontSize: "0.6rem", fontWeight: 700, fontFamily: "inherit",
                        opacity: done ? 1 : isCur ? 1 : 0.5,
                      }}>{day}</button>
                    );
                  })}
                  {phase.days.length > 10 && (
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", display: "flex", alignItems: "center", padding: "0 4px" }}>+{phase.days.length - 10}</span>
                  )}
                </div>

                {/* Action button */}
                {!isComplete && phase.firstIncomplete && (
                  <button onClick={() => onSelectDay(phase.firstIncomplete!)} style={{
                    marginTop: 8, padding: "5px 12px", borderRadius: 8, border: "none",
                    background: isCurrent ? "var(--brand)" : "var(--surface)",
                    color: isCurrent ? "#fff" : "var(--text-muted)", fontSize: "0.68rem", fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                  }}>
                    Continue Day {phase.firstIncomplete} <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
