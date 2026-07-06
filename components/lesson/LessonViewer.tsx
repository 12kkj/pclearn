"use client";

import { useState } from "react";
import { BookOpen, Layers, AlertCircle } from "lucide-react";
import MarkdownViewer from "@/components/ui/MarkdownViewer";
import ResourceCards from "@/components/lesson/ResourceCards";
import type { LessonResources, YouTubeResult } from "@/types";
import type { LessonMeta } from "@/types";

interface Props {
  day: number | null;
  meta: LessonMeta | undefined;
  content: string;
  isStreaming: boolean;
  resources: LessonResources | null;
  onSummarizeVideo: (video: YouTubeResult) => void;
}

export default function LessonViewer({
  day,
  meta,
  content,
  isStreaming,
  resources,
  onSummarizeVideo,
}: Props) {
  const [view, setView] = useState<"lesson" | "resources">("lesson");

  if (!day) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 12,
          color: "var(--text-muted)",
        }}
      >
        <BookOpen size={40} style={{ opacity: 0.3 }} />
        <div style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>No lesson loaded</p>
          <p style={{ fontSize: "0.85rem" }}>
            Type <code style={{ background: "var(--surface2)", padding: "2px 6px", borderRadius: 4 }}>day 0</code> in the terminal to begin
          </p>
        </div>
      </div>
    );
  }

  if (!content && isStreaming) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="typing-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          AI generating your lesson...
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Day header */}
      {meta && (
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.8rem",
              flexShrink: 0,
            }}
          >
            D{meta.day}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {meta.title}
            </div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                display: "flex",
                gap: 8,
                marginTop: 2,
              }}
            >
              <span>⏱ {meta.estimatedMinutes} min</span>
              <span
                style={{
                  padding: "0 5px",
                  borderRadius: 4,
                  background:
                    meta.difficulty === "beginner"
                      ? "rgba(16,185,129,0.15)"
                      : meta.difficulty === "intermediate"
                      ? "rgba(245,158,11,0.15)"
                      : "rgba(239,68,68,0.15)",
                  color:
                    meta.difficulty === "beginner"
                      ? "#10b981"
                      : meta.difficulty === "intermediate"
                      ? "#f59e0b"
                      : "#ef4444",
                  fontWeight: 600,
                }}
              >
                {meta.difficulty}
              </span>
              {meta.isRevisionDay && <span>📋 Revision</span>}
              {meta.isMonthlyTest && <span>📅 Monthly Test</span>}
              {meta.isMilestone && <span>🏆 Milestone</span>}
            </div>
          </div>

          {/* View switcher */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              className={`tab-pill ${view === "lesson" ? "active" : ""}`}
              onClick={() => setView("lesson")}
            >
              <BookOpen size={13} /> Lesson
            </button>
            <button
              className={`tab-pill ${view === "resources" ? "active" : ""}`}
              onClick={() => setView("resources")}
              style={!resources ? { opacity: 0.4, cursor: "not-allowed" } : {}}
              disabled={!resources}
            >
              <Layers size={13} /> Resources
              {resources &&
                (resources.hindiVideos.length +
                  resources.englishVideos.length +
                  resources.webArticles.length) > 0 && (
                  <span
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      background: "#6366f1",
                      color: "#fff",
                      borderRadius: 99,
                      padding: "0 4px",
                      minWidth: 14,
                      textAlign: "center",
                    }}
                  >
                    {resources.hindiVideos.length +
                      resources.englishVideos.length +
                      resources.webArticles.length}
                  </span>
                )}
            </button>
          </div>
        </div>
      )}

      {/* Content area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {view === "lesson" ? (
          <>
            {content ? (
              <MarkdownViewer text={content} />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                }}
              >
                <AlertCircle size={16} />
                Lesson content not available yet. Use the terminal to load it.
              </div>
            )}
            {/* Streaming cursor */}
            {isStreaming && <span className="cursor-blink" />}
          </>
        ) : (
          resources && (
            <ResourceCards
              resources={resources}
              onSummarizeVideo={onSummarizeVideo}
            />
          )
        )}
      </div>
    </div>
  );
}
