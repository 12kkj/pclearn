"use client";

import { Sun, Moon, Download, Upload, RotateCcw } from "lucide-react";
import type { StudentState, StudentId } from "@/types";
import { PHASES } from "@/lib/curriculum";
import ProgressRing from "@/components/ui/ProgressRing";

interface Props {
  student1: StudentState;
  student2: StudentState;
  activeStudentId: StudentId;
  onSwitchStudent: (id: StudentId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onExport: () => void;
  onImportClick: () => void;
}

function xpToLevel(xp: number): { level: number; label: string } {
  if (xp < 500)   return { level: 1, label: "Rookie"    };
  if (xp < 1500)  return { level: 2, label: "Learner"   };
  if (xp < 3500)  return { level: 3, label: "Explorer"  };
  if (xp < 7000)  return { level: 4, label: "Coder"     };
  if (xp < 12000) return { level: 5, label: "Pro"       };
  if (xp < 20000) return { level: 6, label: "Expert"    };
  return { level: 7, label: "Master" };
}

function getPhaseColor(phaseId: number): string {
  const colors: Record<number, string> = {
    1: "#3b82f6", 2: "#8b5cf6", 3: "#f97316", 4: "#22c55e",
    5: "#14b8a6", 6: "#eab308", 7: "#ef4444", 8: "#6366f1",
    9: "#06b6d4", 10: "#ec4899", 11: "#7c3aed",
  };
  return colors[phaseId] ?? "#6366f1";
}

function StudentChip({
  student,
  isActive,
  onClick,
}: {
  student: StudentState;
  isActive: boolean;
  onClick: () => void;
}) {
  const total = 100;
  const done = student.completedDays.length;
  const pct = Math.round((done / total) * 100);
  const phase = PHASES.find((p) => p.days.includes(Math.max(1, student.currentDay)));
  const { label } = xpToLevel(student.xp);
  const phaseColor = getPhaseColor(phase?.id ?? 1);

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px 5px 6px",
        borderRadius: 10,
        border: isActive ? "1px solid var(--csa-primary)" : "1px solid var(--border)",
        background: isActive ? "rgba(99,102,241,0.1)" : "var(--surface2)",
        cursor: "pointer",
        transition: "all 0.15s",
        minWidth: 0,
      }}
    >
      <ProgressRing
        percent={pct}
        size={32}
        strokeWidth={3}
        color={phaseColor}
        label={
          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: phaseColor }}>
            {done}
          </span>
        }
      />
      <div style={{ textAlign: "left", minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: isActive ? "var(--csa-primary)" : "var(--text)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 120,
          }}
        >
          {student.name.split(" ").slice(0, 2).join(" ")}
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
          {phase?.icon} {label} · {student.xp} XP
        </div>
      </div>
    </button>
  );
}

export default function Header({
  student1,
  student2,
  activeStudentId,
  onSwitchStudent,
  isDark,
  onToggleTheme,
  onExport,
  onImportClick,
}: Props) {
  const iconBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    cursor: "pointer",
    color: "var(--text-muted)",
    transition: "all 0.15s",
    flexShrink: 0,
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 16px",
        height: 56,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 4 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1rem",
            flexShrink: 0,
          }}
        >
          🎓
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--text)",
              whiteSpace: "nowrap",
            }}
          >
            Computer Skills Academy
          </span>
          <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
            Elite AI Mentor · NVIDIA NIM
          </span>
        </div>
        <span
          style={{
            fontSize: "0.6rem",
            fontWeight: 700,
            padding: "1px 6px",
            borderRadius: 6,
            background: "rgba(99,102,241,0.15)",
            color: "#6366f1",
            border: "1px solid rgba(99,102,241,0.3)",
            marginLeft: 2,
          }}
        >
          v3.0
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Student switcher */}
      <div style={{ display: "flex", gap: 6 }}>
        <StudentChip
          student={student1}
          isActive={activeStudentId === "student1"}
          onClick={() => onSwitchStudent("student1")}
        />
        <StudentChip
          student={student2}
          isActive={activeStudentId === "student2"}
          onClick={() => onSwitchStudent("student2")}
        />
      </div>

      {/* Model pills */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: 8,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
        }}
      >
        {["Qwen 3.5", "Nemotron 550B", "GPT-OSS 120B"].map((m) => (
          <span
            key={m}
            style={{
              fontSize: "0.6rem",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {m}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        <button title="Export Progress" style={iconBtn} onClick={onExport}>
          <Download size={15} />
        </button>
        <button title="Import Progress" style={iconBtn} onClick={onImportClick}>
          <Upload size={15} />
        </button>
        {/* Theme toggle removed – dark mode is now fixed */}
      </div>
    </header>
  );
}
