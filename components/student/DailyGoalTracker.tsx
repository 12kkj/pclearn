"use client";
import React, { useMemo } from "react";
import { Target, CheckCircle2, Flame, TrendingUp } from "lucide-react";

/**
 * Daily goal tracker showing streak, XP earned today, and weekly goal progress.
 */
export default function DailyGoalTracker({
  xp,
  streak,
  completedDays,
  lastActiveDate,
  weeklyGoal = 5,
}: {
  xp: number;
  streak: number;
  completedDays: number[];
  lastActiveDate: string;
  weeklyGoal?: number;
}) {
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const thisWeek = completedDays.filter(d => {
      // Approximate - use completed day numbers as rough proxy
      return d > 0;
    }).length;
    const completedThisWeek = Math.min(thisWeek, weeklyGoal);
    return {
      done: completedThisWeek,
      goal: weeklyGoal,
      pct: Math.round((completedThisWeek / weeklyGoal) * 100),
    };
  }, [completedDays, weeklyGoal]);

  const isToday = lastActiveDate === new Date().toISOString().slice(0, 10);
  const xpToday = isToday ? Math.max(10, streak * 5) : 0;

  return (
    <div style={{ padding: 16, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Target size={18} style={{ color: "var(--brand)" }} />
        <p style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text)" }}>Daily Goals</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ padding: 10, borderRadius: 10, background: "var(--surface2)", textAlign: "center" }}>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand)" }}>{completedDays.length}</p>
          <p style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Days Done</p>
        </div>
        <div style={{ padding: 10, borderRadius: 10, background: "var(--surface2)", textAlign: "center" }}>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--amber)" }}>🔥 {streak}</p>
          <p style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Streak</p>
        </div>
        <div style={{ padding: 10, borderRadius: 10, background: "var(--surface2)", textAlign: "center" }}>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--green)" }}>{xp}</p>
          <p style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Total XP</p>
        </div>
      </div>

      {/* Weekly goal */}
      <div style={{ padding: 12, borderRadius: 10, background: "var(--surface2)", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)" }}>Weekly Goal</p>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--brand)" }}>{weeklyStats.done}/{weeklyStats.goal}</p>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
          <div style={{
            width: `${Math.min(weeklyStats.pct, 100)}%`, height: "100%", borderRadius: 4,
            background: weeklyStats.pct >= 100 ? "var(--green)" : "var(--brand)", transition: "width 0.3s",
          }} />
        </div>
        {weeklyStats.pct >= 100 && (
          <p style={{ fontSize: "0.65rem", color: "var(--green)", marginTop: 4, fontWeight: 700 }}>🎯 Weekly goal achieved!</p>
        )}
      </div>

      {/* Motivational tip */}
      <div style={{ padding: 10, borderRadius: 8, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--brand)", lineHeight: 1.5 }}>
          {streak === 0
            ? "💡 Start a new streak today! Complete any lesson to begin."
            : streak < 3
            ? `💪 Great start! ${3 - streak} more days to build a habit.`
            : streak < 7
            ? `🔥 ${7 - streak} more days to unlock the Week Warrior badge!`
            : streak < 14
            ? `⚡ Amazing streak! ${14 - streak} days until you're Unstoppable!`
            : "👑 You're a learning machine! Keep going!"}
        </p>
      </div>
    </div>
  );
}
