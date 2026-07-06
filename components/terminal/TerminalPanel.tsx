"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { TerminalLine, StudentState, StudentId } from "@/types";

interface Props {
  lines: TerminalLine[];
  onCommand: (cmd: string) => void;
  activeStudent: StudentState;
  activeStudentId: StudentId;
  isProcessing: boolean;
}

const HELP_TEXT = `
📚 COMPUTER SKILLS ACADEMY v3.0 — COMMAND REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  day 0          → Start the curriculum (Day 1 lesson)
  day <N>        → Test on Day N-1, then unlock Day N
  lesson <N>     → Load lesson for Day N directly
  status         → Show your current progress
  roadmap        → View the full 100-day roadmap  
  weak           → Show your weak topics
  help           → Show this help menu
  clear          → Clear the terminal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type 'day 0' to begin your journey!
`.trim();

export default function TerminalPanel({
  lines,
  onCommand,
  activeStudent,
  activeStudentId,
  isProcessing,
}: Props) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const cmd = input.trim();
    if (!cmd) return;
    setHistory((prev) => [cmd, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    onCommand(cmd);
    setInput("");
  }, [input, onCommand]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistIdx((prev) => {
        const next = Math.min(prev + 1, history.length - 1);
        setInput(history[next] ?? "");
        return next;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHistIdx((prev) => {
        const next = Math.max(prev - 1, -1);
        setInput(next === -1 ? "" : (history[next] ?? ""));
        return next;
      });
    }
  };

  const lineColor: Record<TerminalLine["type"], string> = {
    input:   "#a78bfa",
    output:  "#e2e8f0",
    error:   "#ef4444",
    info:    "#38bdf8",
    success: "#10b981",
    system:  "#f472b6",
  };

  return (
    <div
      className="terminal-bg"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        borderRadius: 0,
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px 8px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.82rem",
          lineHeight: 1.7,
        }}
      >
        {/* Boot header */}
        {lines.length === 0 && (
          <div style={{ marginBottom: 16 }}>
            <pre
              style={{
                color: "#6366f1",
                fontFamily: "inherit",
                margin: 0,
                fontSize: "0.75rem",
              }}
            >
{`  ██████╗███████╗ █████╗     v3.0
 ██╔════╝██╔════╝██╔══██╗
 ██║     ███████╗███████║
 ██║     ╚════██║██╔══██║
 ╚██████╗███████║██║  ██║
  ╚═════╝╚══════╝╚═╝  ╚═╝`}
            </pre>
            <div style={{ color: "#8892a4", marginTop: 8, fontSize: "0.75rem" }}>
              🚀 NVIDIA NIM | Qwen 3.5 · Nemotron Ultra · GPT-OSS 120B<br />
              🔍 Search: DuckDuckGo + Wikipedia + YouTube API v3<br />
              📖 100-Day Curriculum | Hinglish Teaching | Spaced Repetition<br />
              <span style={{ color: "#4b5563" }}>────────────────────────────────────────────</span><br />
              📅 {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}<br />
              👤 Active: <span style={{ color: "#6366f1" }}>{activeStudent.name}</span><br />
              📊 Progress: <span style={{ color: "#10b981" }}>{activeStudent.completedDays.length}/100 days</span> · <span style={{ color: "#f59e0b" }}>⚡{activeStudent.xp} XP</span><br />
              <span style={{ color: "#4b5563" }}>────────────────────────────────────────────</span><br />
              Type <span style={{ color: "#10b981" }}>'day 0'</span> to start · <span style={{ color: "#38bdf8" }}>'help'</span> for commands
            </div>
          </div>
        )}

        {/* Terminal lines */}
        {lines.map((line) => (
          <div key={line.id} style={{ color: lineColor[line.type] }}>
            {line.type === "input" ? (
              <span>
                <span style={{ color: "#6366f1" }}>❯ </span>
                {line.content}
              </span>
            ) : (
              <span style={{ whiteSpace: "pre-wrap" }}>{line.content}</span>
            )}
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div style={{ color: "#6366f1", display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-block",
                animation: "spin 1s linear infinite",
              }}
            >
              ◌
            </span>
            <span>Processing...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: "1px solid #1e1e3a",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#0d0d18",
        }}
      >
        <span style={{ color: "#6366f1", fontFamily: "monospace", fontSize: "0.9rem", flexShrink: 0 }}>❯</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          placeholder={isProcessing ? "Processing..." : "Type a command (e.g. 'day 0', 'help')"}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#e2e8f0",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.85rem",
            caretColor: "#6366f1",
          }}
        />
        {!isProcessing && (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              background: input.trim() ? "#6366f1" : "transparent",
              border: "1px solid",
              borderColor: input.trim() ? "#6366f1" : "#1e1e3a",
              color: input.trim() ? "#fff" : "#4b5563",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: input.trim() ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              fontFamily: "monospace",
            }}
          >
            RUN
          </button>
        )}
      </div>
    </div>
  );
}
