"use client";

import { X, Loader2 } from "lucide-react";
import MarkdownViewer from "@/components/ui/MarkdownViewer";

interface Props {
  videoId: string | null;
  videoTitle: string | null;
  summary: string | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function VideoSummaryModal({
  videoId,
  videoTitle,
  summary,
  isLoading,
  onClose,
}: Props) {
  if (!videoId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 100,
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "min(640px, 92vw)",
          maxHeight: "80vh",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🤖</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>AI Video Summary</div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {videoTitle ?? `youtube.com/watch?v=${videoId}`}
            </div>
          </div>
          <a
            href={`https://youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.72rem",
              padding: "4px 10px",
              borderRadius: 6,
              background: "#ef4444",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            ▶ Watch
          </a>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 0",
                gap: 12,
              }}
            >
              <Loader2
                size={28}
                color="#6366f1"
                style={{ animation: "spin 1s linear infinite" }}
              />
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Fetching transcript and summarizing...
              </p>
              <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
            </div>
          ) : summary ? (
            <MarkdownViewer text={summary} />
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: "32px 0",
                fontSize: "0.85rem",
              }}
            >
              Could not generate summary. The video may not have a transcript.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
