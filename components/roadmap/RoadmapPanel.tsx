"use client";

import { PHASES, CURRICULUM, getLessonsInPhase } from "@/lib/curriculum";
import ProgressRing from "@/components/ui/ProgressRing";
import type { StudentState } from "@/types";

const PHASE_COLORS: Record<number, string> = {
  1: "#3b82f6", 2: "#8b5cf6", 3: "#f97316", 4: "#22c55e",
  5: "#14b8a6", 6: "#eab308", 7: "#ef4444", 8: "#6366f1",
  9: "#06b6d4", 10: "#ec4899", 11: "#7c3aed",
};

interface Props {
  activeStudent: StudentState;
  onSelectDay: (day: number) => void;
}

function PhaseCard({
  phaseId,
  student,
  onSelectDay,
}: {
  phaseId: number;
  student: StudentState;
  onSelectDay: (day: number) => void;
}) {
  const phase = PHASES.find((p) => p.id === phaseId);
  if (!phase) return null;

  const lessons = getLessonsInPhase(phaseId);
  const done = lessons.filter((l) => student.completedDays.includes(l.day)).length;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const color = PHASE_COLORS[phaseId] ?? "#6366f1";
  const isComplete = done === lessons.length;
  const isStarted = done > 0;

  return (
    <div
      style={{
        border: "1px solid",
        borderColor: isComplete ? `${color}55` : "var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        background: isComplete
          ? `${color}0a`
          : "var(--surface2)",
        transition: "all 0.2s",
      }}
    >
      {/* Phase header */}
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid var(--border)",
          background: isComplete ? `${color}10` : "var(--surface)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: isComplete ? color : "var(--surface2)",
            border: `2px solid ${isStarted ? color : "var(--border)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            flexShrink: 0,
          }}
        >
          {phase.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: isComplete ? color : "var(--text)" }}>
            Phase {phaseId}: {phase.name}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
            {done}/{lessons.length} lessons
            {isComplete && " · ✅ Complete"}
          </div>
        </div>
        <ProgressRing
          percent={pct}
          size={44}
          strokeWidth={4}
          color={color}
          label={
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                color: isStarted ? color : "var(--text-muted)",
              }}
            >
              {pct}%
            </span>
          }
        />
      </div>

      {/* Phase progress bar */}
      <div style={{ height: 3, background: "var(--border)" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Day dots */}
      <div style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {lessons.map((l) => {
            const status = student.completedDays.includes(l.day)
              ? "completed"
              : l.day <= Math.max(0, ...student.completedDays) + 1
              ? "available"
              : "locked";

            return (
              <button
                key={l.day}
                title={`Day ${l.day}: ${l.title}`}
                onClick={() => status !== "locked" && onSelectDay(l.day)}
                disabled={status === "locked"}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "1px solid",
                  borderColor:
                    status === "completed"
                      ? color
                      : status === "available"
                      ? `${color}66`
                      : "var(--border)",
                  background:
                    status === "completed"
                      ? color
                      : status === "available"
                      ? `${color}15`
                      : "transparent",
                  color:
                    status === "completed"
                      ? "#fff"
                      : status === "available"
                      ? color
                      : "var(--text-muted)",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  cursor: status !== "locked" ? "pointer" : "not-allowed",
                  opacity: status === "locked" ? 0.35 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.12s",
                  position: "relative",
                }}
              >
                {l.isMilestone ? "🏆" : l.isRevisionDay ? "📋" : l.isMonthlyTest ? "📅" : l.day}
              </button>
            );
          })}
        </div>

        {/* Milestone project */}
        {phase.milestoneProject && (
          <div
            style={{
              marginTop: 8,
              padding: "6px 10px",
              borderRadius: 8,
              background: isComplete ? `${color}10` : "transparent",
              border: `1px dashed ${isComplete ? color : "var(--border)"}`,
              fontSize: "0.72rem",
              color: isComplete ? color : "var(--text-muted)",
              display: "flex",
              gap: 6,
              alignItems: "flex-start",
            }}
          >
            <span style={{ flexShrink: 0 }}>🏆</span>
            <span>
              <strong>Milestone: </strong>
              {phase.milestoneProject}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoadmapPanel({ activeStudent, onSelectDay }: Props) {
  const totalDone = activeStudent.completedDays.length;
  const totalDays = CURRICULUM.length;
  const overallPct = Math.round((totalDone / totalDays) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <ProgressRing
            percent={overallPct}
            size={52}
            strokeWidth={5}
            color="#6366f1"
            label={
              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#6366f1" }}>
                {overallPct}%
              </span>
            }
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>100-Day Learning Roadmap</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
              {totalDone}/{totalDays} days complete · {activeStudent.xp} XP · {activeStudent.streak}-day streak
            </div>
          </div>
          {activeStudent.badges.length > 0 && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {activeStudent.badges.map((badge) => {
                const BADGE_MAP: Record<string, string> = {
                  week1: "🥉", month1: "🥈", halfway: "🥇", graduate: "🏆",
                };
                return (
                  <span key={badge} title={badge} style={{ fontSize: "1.2rem" }}>
                    {BADGE_MAP[badge] ?? "⭐"}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Overall progress bar */}
        <div style={{ marginTop: 10, height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${overallPct}%`,
              background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)",
              borderRadius: 99,
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>

      {/* Phase cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {PHASES.map((phase) => (
            <PhaseCard
              key={phase.id}
              phaseId={phase.id}
              student={activeStudent}
              onSelectDay={onSelectDay}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
