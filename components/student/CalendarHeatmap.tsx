"use client";
import React, { useMemo } from "react";

/** GitHub-style contribution heatmap for learning activity. */
export default function CalendarHeatmap({
  completedDays,
  currentDay,
  totalDays = 100,
}: {
  completedDays: number[];
  currentDay: number;
  totalDays?: number;
}) {
  // Generate last 90 days of activity data
  const grid = useMemo(() => {
    const today = new Date();
    const days: { date: Date; level: number; day?: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ date: d, level: 0 });
    }
    // Mark completed days as active (simulate with completedDays)
    const completed = new Set(completedDays);
    completed.forEach(dayNum => {
      if (dayNum > 0 && dayNum <= totalDays) {
        // Find a slot to mark
        const idx = Math.min(dayNum - 1, days.length - 1);
        if (idx >= 0 && days[idx]) days[idx].level = 2;
      }
    });
    // Mark current streak
    const todayStr = today.toISOString().slice(0, 10);
    const todayIdx = days.findIndex(d => d.date.toISOString().slice(0, 10) === todayStr);
    if (todayIdx >= 0) {
      days[todayIdx].level = Math.max(1, days[todayIdx].level);
    }
    return days;
  }, [completedDays, currentDay, totalDays]);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const colors = ["var(--surface2)", "rgba(99,102,241,0.25)", "rgba(99,102,241,0.5)", "var(--brand)"];

  return (
    <div style={{ padding: 16, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: "1.1rem" }}>📅</span>
        <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Learning Activity</p>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "auto" }}>Last 90 days</span>
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {grid.map((cell, i) => (
          <div
            key={i}
            title={`${cell.date.toISOString().slice(0, 10)}${cell.day ? ` — Day ${cell.day}` : ""}`}
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: colors[cell.level],
              border: "1px solid var(--border)",
              cursor: "default",
              transition: "transform 0.1s",
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.transform = "scale(1.3)"; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.transform = "scale(1)"; }}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "flex-end" }}>
        <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>Less</span>
        {colors.map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c, border: "1px solid var(--border)" }} />
        ))}
        <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>More</span>
      </div>
    </div>
  );
}
