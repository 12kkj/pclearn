"use client";
import React, { useState } from "react";
import { BookOpen, Target, MessageSquare, Map, Trophy, Sparkles, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    icon: "👋",
    title: "Welcome to Computer Skills Academy!",
    desc: "Your personal AI-powered learning journey. Let's take a quick tour of what you can do here.",
    highlight: null,
  },
  {
    icon: "📖",
    title: "Daily Lessons",
    desc: "Each day, you'll get a new lesson with curated video tutorials, written content, and interactive examples. Just click any day on the roadmap to start learning!",
    highlight: "lesson",
  },
  {
    icon: "📝",
    title: "Quizzes & Tests",
    desc: "After each lesson, take a quiz to test your knowledge. AI generates questions based on what you just learned. Score 70%+ to mark the day complete!",
    highlight: "quiz",
  },
  {
    icon: "🤖",
    title: "AI Tutor Chat",
    desc: "Stuck on something? Ask our AI tutor anything! It knows exactly what you've learned and can explain concepts, give examples, or help debug code.",
    highlight: "chat",
  },
  {
    icon: "🗺️",
    title: "Learning Roadmap",
    desc: "See your entire journey from Computer Fundamentals to Python Mastery. Track your progress through phases and unlock achievements as you go!",
    highlight: "roadmap",
  },
  {
    icon: "🏆",
    title: "XP, Streaks & Achievements",
    desc: "Earn XP for completing lessons and quizzes. Build daily streaks for bonus points. Unlock achievement badges as you hit milestones!",
    highlight: "home",
  },
  {
    icon: "⭐",
    title: "Ready to Start!",
    desc: "Your first lesson is waiting. Don't worry about perfection — just show up, learn, and the AI will adapt to your pace. Let's go!",
    highlight: null,
  },
];

export default function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 520, background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)",
        overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 4, justifyContent: "center", padding: "18px 0 0" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? "var(--brand)" : i < step ? "var(--green)" : "var(--border)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "28px 32px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "3rem", marginBottom: 8 }}>{s.icon}</p>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>{s.title}</h2>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.7 }}>{s.desc}</p>
        </div>

        {/* Feature highlight */}
        {s.highlight && (
          <div style={{ margin: "0 32px", padding: 12, borderRadius: 10, background: "var(--brand-glow)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--brand)", fontWeight: 600 }}>
              💡 Tip: You can find this in the {s.highlight === "lesson" ? "📖 Lesson" : s.highlight === "quiz" ? "🎯 Quiz" : s.highlight === "chat" ? "💬 Chat" : s.highlight === "roadmap" ? "🗺️ Roadmap" : "🏠 Home"} tab below
            </p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px 28px", gap: 10 }}>
          {!isFirst ? (
            <button onClick={() => setStep(p => p - 1)} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface2)",
              color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}><ChevronLeft size={14} /> Back</button>
          ) : (
            <button onClick={onComplete} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Skip Tour</button>
          )}
          {isLast ? (
            <button onClick={onComplete} style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, var(--brand), var(--cyan))",
              color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}><CheckCircle2 size={14} /> Start Learning!</button>
          ) : (
            <button onClick={() => setStep(p => p + 1)} style={{
              padding: "10px 24px", borderRadius: 10, border: "none", background: "var(--brand)",
              color: "#fff", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}>Next <ChevronRight size={14} /></button>
          )}
        </div>
      </div>
    </div>
  );
}
