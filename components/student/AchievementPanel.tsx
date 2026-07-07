"use client";
import React, { useMemo } from "react";
import { Trophy, Star, Flame, Zap, BookOpen, Target, Award, Clock, Medal, Crown } from "lucide-react";
import type { LearnerState } from "@/types";

/** Achievement definitions based on learner progress */
const ACHIEVEMENTS = [
  { id: "first_day", title: "First Steps", desc: "Complete your first day", icon: "🌟", color: "#eab308", check: (l: LearnerState) => l.completedDays.length >= 1 },
  { id: "week1", title: "Week Warrior", desc: "Complete 7 days", icon: "🔥", color: "#f97316", check: (l: LearnerState) => l.completedDays.length >= 7 },
  { id: "week2", title: "Dedicated Learner", desc: "Complete 14 days", icon: "📚", color: "#8b5cf6", check: (l: LearnerState) => l.completedDays.length >= 14 },
  { id: "week3", title: "Knowledge Seeker", desc: "Complete 21 days", icon: "🧠", color: "#3b82f6", check: (l: LearnerState) => l.completedDays.length >= 21 },
  { id: "month1", title: "Monthly Champion", desc: "Complete 30 days", icon: "🏆", color: "#eab308", check: (l: LearnerState) => l.completedDays.length >= 30 },
  { id: "halfway", title: "Halfway Hero", desc: "Complete 50 days", icon: "⚡", color: "#06b6d4", check: (l: LearnerState) => l.completedDays.length >= 50 },
  { id: "streak3", title: "3-Day Streak", desc: "3 consecutive days", icon: "🔥", color: "#ef4444", check: (l: LearnerState) => l.streak >= 3 },
  { id: "streak7", title: "Week Streak", desc: "7 consecutive days", icon: "💎", color: "#8b5cf6", check: (l: LearnerState) => l.streak >= 7 },
  { id: "streak14", title: "Unstoppable", desc: "14 consecutive days", icon: "👑", color: "#eab308", check: (l: LearnerState) => l.streak >= 14 },
  { id: "xp100", title: "Century Club", desc: "Earn 100 XP", icon: "🎯", color: "#10b981", check: (l: LearnerState) => l.xp >= 100 },
  { id: "xp500", title: "XP Hunter", desc: "Earn 500 XP", icon: "🏹", color: "#f97316", check: (l: LearnerState) => l.xp >= 500 },
  { id: "xp1000", title: "XP Legend", desc: "Earn 1000 XP", icon: "🏅", color: "#eab308", check: (l: LearnerState) => l.xp >= 1000 },
  { id: "perfect_quiz", title: "Perfect Score", desc: "Score 100% on any quiz", icon: "💯", color: "#10b981", check: (l: LearnerState) => Object.values(l.testScores).some(s => s === 100) },
  { id: "high_quiz", title: "Smart Cookie", desc: "Score 80%+ on 5 quizzes", icon: "🎓", color: "#6366f1", check: (l: LearnerState) => Object.values(l.testScores).filter(s => s >= 80).length >= 5 },
  { id: "graduate", title: "Graduate", desc: "Complete all 100 days", icon: "🎉", color: "#eab308", check: (l: LearnerState) => l.completedDays.length >= 100 },
];

export default function AchievementPanel({ learner }: { learner: LearnerState }) {
  const earned = useMemo(() => {
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check(learner) }));
  }, [learner]);

  const unlockedCount = earned.filter(a => a.unlocked).length;
  const progress = Math.round((unlockedCount / earned.length) * 100);

  return (
    <div style={{ padding: 16, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Trophy size={18} style={{ color: "var(--brand)" }} />
        <p style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text)" }}>Achievements</p>
        <span style={{ marginLeft: "auto", fontSize: "0.72rem", fontWeight: 700, color: "var(--brand)" }}>{unlockedCount}/{earned.length}</span>
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: "var(--surface2)", marginBottom: 14, overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, var(--brand), var(--cyan))", transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
        {earned.map(a => (
          <div key={a.id} style={{
            padding: "12px 10px", borderRadius: 10, textAlign: "center",
            border: `1.5px solid ${a.unlocked ? a.color : "var(--border)"}`,
            background: a.unlocked ? `${a.color}12` : "var(--surface2)",
            opacity: a.unlocked ? 1 : 0.55,
            transition: "all 0.2s",
          }}>
            <p style={{ fontSize: "1.5rem", marginBottom: 4 }}>{a.icon}</p>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text)" }}>{a.title}</p>
            <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 2 }}>{a.desc}</p>
            {a.unlocked && <p style={{ fontSize: "0.58rem", color: a.color, marginTop: 4, fontWeight: 700 }}>✓ Unlocked</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
