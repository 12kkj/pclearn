"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Lock, CheckCircle2, Circle, Star, Zap } from "lucide-react";
import type { StudentState, AppTab } from "@/types";
import { CURRICULUM, PHASES, getPhaseForDay } from "@/lib/curriculum";

interface Props {
  activeStudent: StudentState;
  activeTab: AppTab;
  onSelectDay: (day: number) => void;
  onTabChange: (tab: AppTab) => void;
}

const PHASE_COLORS: Record<number, string> = {
  1: "#3b82f6", 2: "#8b5cf6", 3: "#f97316", 4: "#22c55e",
  5: "#14b8a6", 6: "#eab308", 7: "#ef4444", 8: "#6366f1",
  9: "#06b6d4", 10: "#ec4899", 11: "#7c3aed",
};

function getDayStatus(day: number, student: StudentState): "completed" | "current" | "locked" {
  if (student.completedDays.includes(day)) return "completed";
  const maxUnlocked = student.completedDays.length === 0 ? 0 : Math.max(...student.completedDays);
  if (day <= maxUnlocked + 1) return "current";
  return "locked";
}

export default function Sidebar({ activeStudent, activeTab, onSelectDay, onTabChange }: Props) {
  const [expandedPhases, setExpandedPhases] = useState<number[]>([1]);
  const [search, setSearch] = useState("");

  const totalDays = CURRICULUM.length;
  const done = activeStudent.completedDays.length;
  const pct = Math.round((done / totalDays) * 100);

  const togglePhase = (id: number) => {
    setExpandedPhases((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const filtered = search.trim()
    ? CURRICULUM.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.topics.some((t) => t.toLowerCase().includes(search.toLowerCase())),
      )
    : null;

  // Progress bar
  const progressBar = (
    <div style={{ padding: "10px 12px 6px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)" }}>
          PROGRESS
        </span>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--csa-primary)" }}>
          {done}/{totalDays} Days
        </span>
      </div>
      <div
        style={{
          height: 5,
          background: "var(--border)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
            borderRadius: 99,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "flex", gap: 3, alignItems: "center" }}>
          <Zap size={10} color="#f59e0b" />
          {activeStudent.xp} XP
        </span>
        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "flex", gap: 3, alignItems: "center" }}>
          🔥 {activeStudent.streak}d streak
        </span>
        {activeStudent.badges.length > 0 && (
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "flex", gap: 3, alignItems: "center" }}>
            <Star size={10} color="#eab308" />
            {activeStudent.badges.length} badges
          </span>
        )}
      </div>
    </div>
  );

  // Search box
  const searchBox = (
    <div style={{ padding: "4px 10px 8px" }}>
      <input
        className="input-base"
        style={{ fontSize: "0.75rem", padding: "5px 8px" }}
        placeholder="Search curriculum..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );

  // Render a single day row
  const renderDay = (day: number) => {
    const meta = CURRICULUM.find((l) => l.day === day);
    if (!meta) return null;
    const status = getDayStatus(day, activeStudent);
    const isSpecial = meta.isRevisionDay || meta.isMonthlyTest || meta.isMilestone;

    return (
      <button
        key={day}
        onClick={() => status !== "locked" && onSelectDay(day)}
        className={`sidebar-item ${status === "completed" ? "completed" : status === "locked" ? "locked" : ""}`}
        style={{ width: "100%", textAlign: "left", cursor: status === "locked" ? "not-allowed" : "pointer" }}
        disabled={status === "locked"}
        title={meta.title}
      >
        {status === "completed" ? (
          <CheckCircle2 size={13} color="#10b981" style={{ flexShrink: 0 }} />
        ) : status === "locked" ? (
          <Lock size={13} style={{ flexShrink: 0 }} />
        ) : (
          <Circle size={13} color="#6366f1" style={{ flexShrink: 0 }} />
        )}
        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", minWidth: 20 }}>
          D{day}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: "0.72rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color:
              status === "completed"
                ? "#10b981"
                : status === "locked"
                ? "var(--text-muted)"
                : "var(--text)",
          }}
        >
          {meta.title}
        </span>
        {isSpecial && (
          <span style={{ fontSize: "0.6rem", flexShrink: 0 }}>
            {meta.isMonthlyTest ? "📅" : meta.isMilestone ? "🏆" : "📋"}
          </span>
        )}
      </button>
    );
  };

  // Search results view
  if (filtered) {
    return (
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {progressBar}
        {searchBox}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 4px 8px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              No results found
            </div>
          ) : (
            filtered.map((l) => renderDay(l.day))
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {progressBar}
      {searchBox}

      {/* Phase accordion */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 4px 8px" }}>
        {PHASES.map((phase) => {
          const phaseDone = phase.days.filter((d) =>
            activeStudent.completedDays.includes(d),
          ).length;
          const phaseTotal = phase.days.length;
          const phaseColor = PHASE_COLORS[phase.id] ?? "#6366f1";
          const isExpanded = expandedPhases.includes(phase.id);

          return (
            <div key={phase.id} style={{ marginBottom: 2 }}>
              {/* Phase header */}
              <button
                onClick={() => togglePhase(phase.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "background 0.12s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: "0.85rem" }}>{phase.icon}</span>
                <span
                  style={{
                    flex: 1,
                    textAlign: "left",
                    fontSize: "0.73rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {phase.name}
                </span>
                <span
                  style={{
                    fontSize: "0.62rem",
                    color: phaseDone === phaseTotal ? "#10b981" : "var(--text-muted)",
                    fontWeight: 600,
                    marginRight: 2,
                  }}
                >
                  {phaseDone}/{phaseTotal}
                </span>
                {isExpanded ? (
                  <ChevronDown size={12} color="var(--text-muted)" />
                ) : (
                  <ChevronRight size={12} color="var(--text-muted)" />
                )}
              </button>

              {/* Phase progress micro-bar */}
              <div style={{ margin: "0 8px 2px", height: 2, background: "var(--border)", borderRadius: 99 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(phaseDone / phaseTotal) * 100}%`,
                    background: phaseColor,
                    borderRadius: 99,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              {/* Day list */}
              {isExpanded && (
                <div style={{ paddingLeft: 6 }}>
                  {phase.days.map((day) => renderDay(day))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
