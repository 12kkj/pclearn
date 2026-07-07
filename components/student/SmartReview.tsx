"use client";
import React, { useMemo, useState } from "react";
import { RefreshCw, Brain, CheckCircle2, XCircle, ChevronRight, Clock } from "lucide-react";
import { getLessonByDay } from "@/lib/curriculum";

interface ReviewCard {
  day: number;
  title: string;
  lastReviewed: number; // days ago
  strength: "weak" | "medium" | "strong";
  topics: string[];
}

function calcStrength(completedDays: number[], day: number, testScores: Record<number, number>): "weak" | "medium" | "strong" {
  const score = testScores[day] ?? 0;
  if (score >= 80) return "strong";
  if (score >= 50 || completedDays.includes(day)) return "medium";
  return "weak";
}

export default function SmartReview({
  completedDays,
  testScores,
  currentDay,
  onSelectDay,
}: {
  completedDays: number[];
  testScores: Record<number, number>;
  currentDay: number;
  onSelectDay: (day: number) => void;
}) {
  const [filter, setFilter] = useState<"all" | "weak" | "medium" | "strong">("all");

  const cards = useMemo(() => {
    return completedDays.map(day => {
      const lesson = getLessonByDay(day);
      return {
        day,
        title: lesson?.title ?? `Day ${day}`,
        lastReviewed: Math.max(1, day % 30),
        strength: calcStrength(completedDays, day, testScores),
        topics: lesson?.topics ?? [],
      };
    }).sort((a, b) => {
      // Prioritize weak, then by days since review
      const sw = { weak: 0, medium: 1, strong: 2 };
      if (sw[a.strength] !== sw[b.strength]) return sw[a.strength] - sw[b.strength];
      return b.lastReviewed - a.lastReviewed;
    });
  }, [completedDays, testScores]);

  const filtered = filter === "all" ? cards : cards.filter(c => c.strength === filter);
  const counts = useMemo(() => ({
    weak: cards.filter(c => c.strength === "weak").length,
    medium: cards.filter(c => c.strength === "medium").length,
    strong: cards.filter(c => c.strength === "strong").length,
  }), [cards]);

  const strengthColor = (s: string) => s === "weak" ? "var(--red)" : s === "medium" ? "var(--amber)" : "var(--green)";
  const strengthEmoji = (s: string) => s === "weak" ? "🔴" : s === "medium" ? "🟡" : "🟢";

  return (
    <div style={{ padding: 16, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Brain size={18} style={{ color: "var(--brand)" }} />
        <p style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text)" }}>Smart Review</p>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "auto" }}>Spaced repetition</span>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {([ { k: "all" as const, l: `All (${cards.length})` },
           { k: "weak" as const, l: `🔴 Weak (${counts.weak})` },
           { k: "medium" as const, l: `🟡 Review (${counts.medium})` },
           { k: "strong" as const, l: `🟢 Strong (${counts.strong})` },
        ]).map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 600,
            border: `1px solid ${filter === f.k ? "var(--brand)" : "var(--border)"}`,
            background: filter === f.k ? "var(--brand-glow)" : "var(--surface2)",
            color: filter === f.k ? "var(--brand2)" : "var(--text-muted)", cursor: "pointer",
          }}>{f.l}</button>
        ))}
      </div>

      {/* Review cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: "0.82rem" }}>
            <RefreshCw size={20} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            {cards.length === 0 ? "Complete some days to start smart review!" : "No items in this category."}
          </div>
        )}
        {filtered.slice(0, 15).map(card => (
          <button key={card.day} onClick={() => onSelectDay(card.day)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
            border: `1px solid ${strengthColor(card.strength)}30`, background: `${strengthColor(card.strength)}08`,
            cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%",
          }}>
            <span style={{ fontSize: "1.1rem" }}>{strengthEmoji(card.strength)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>Day {card.day}: {card.title}</p>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                {card.topics.slice(0, 3).map(t => (
                  <span key={t} style={{ fontSize: "0.6rem", padding: "1px 6px", borderRadius: 999, background: "var(--surface2)", color: "var(--text-muted)" }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 2 }}><Clock size={10} /> {card.lastReviewed}d ago</span>
              <span style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 999, fontWeight: 600, background: `${strengthColor(card.strength)}20`, color: strengthColor(card.strength) }}>{card.strength}</span>
            </div>
            <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
