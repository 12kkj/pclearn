"use client";

interface Props {
  label: string;
  icon?: string;
  color?: "primary" | "success" | "warning" | "danger" | "muted";
  size?: "sm" | "md";
}

const colorMap = {
  primary: { bg: "rgba(99,102,241,0.12)", text: "#6366f1", border: "rgba(99,102,241,0.3)" },
  success: { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "rgba(16,185,129,0.3)" },
  warning: { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", border: "rgba(245,158,11,0.3)"  },
  danger:  { bg: "rgba(239,68,68,0.12)",   text: "#ef4444", border: "rgba(239,68,68,0.3)"   },
  muted:   { bg: "rgba(107,114,128,0.12)", text: "#6b7280", border: "rgba(107,114,128,0.3)" },
};

export default function Badge({ label, icon, color = "primary", size = "sm" }: Props) {
  const c = colorMap[color];
  const pad = size === "sm" ? "2px 7px" : "3px 10px";
  const fs = size === "sm" ? "0.68rem" : "0.75rem";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: pad,
        borderRadius: 99,
        fontSize: fs,
        fontWeight: 600,
        letterSpacing: "0.03em",
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        lineHeight: 1.4,
      }}
    >
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}
