"use client";

import { ExternalLink, Play, Globe } from "lucide-react";
import type { LessonResources, YouTubeResult, WebResult } from "@/types";

interface Props {
  resources: LessonResources;
  onSummarizeVideo?: (video: YouTubeResult) => void;
}

function YouTubeCard({
  video,
  badge,
  onSummarize,
}: {
  video: YouTubeResult;
  badge: string;
  onSummarize?: () => void;
}) {
  const thumb =
    video.thumbnailUrl ||
    `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;

  return (
    <div
      className="card-hover"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--surface2)",
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
        <img
          src={thumb}
          alt={video.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            transition: "opacity 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "0")}
        >
          <a
            href={`https://youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={20} color="#fff" />
          </a>
        </div>
        {/* Language badge */}
        <span
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            fontSize: "0.6rem",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 6,
            background: video.language === "hindi" ? "#ef4444" : "#1d4ed8",
            color: "#fff",
          }}
        >
          {badge}
        </span>
        {video.duration && (
          <span
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              fontSize: "0.62rem",
              padding: "1px 5px",
              borderRadius: 4,
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
            }}
          >
            {video.duration}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "8px 10px" }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--text)",
            lineHeight: 1.3,
            marginBottom: 4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
          title={video.title}
        >
          {video.title}
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: 6 }}>
          {video.channelTitle}
          {video.viewCount && ` · ${video.viewCount}`}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <a
            href={`https://youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 6,
              background: "#ef4444",
              color: "#fff",
              fontSize: "0.7rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Play size={11} /> Watch
          </a>
          {onSummarize && (
            <button
              onClick={onSummarize}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "4px 8px",
                borderRadius: 6,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: "0.7rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🤖 AI Summary
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WebResultCard({ result }: { result: WebResult }) {
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-hover"
      style={{
        display: "block",
        padding: "10px 12px",
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--surface2)",
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <Globe size={14} color="var(--csa-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--csa-primary)",
              marginBottom: 2,
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {result.title}
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {result.snippet}
          </div>
        </div>
        <ExternalLink size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </div>
      <div style={{ marginTop: 4, fontSize: "0.62rem", color: "var(--text-muted)" }}>
        {result.source === "wikipedia" ? "📖 Wikipedia" : "🔍 Web"}
      </div>
    </a>
  );
}

export default function ResourceCards({ resources, onSummarizeVideo }: Props) {
  const youtubeHindi = resources.hindiVideos ?? [];
  const youtubeEnglish = resources.englishVideos ?? [];
  const webResults = resources.webArticles ?? [];

  const allVideos = [
    ...youtubeHindi.slice(0, 2).map((v) => ({ v, badge: "🇮🇳 Hindi", isHindi: true })),
    ...youtubeEnglish.slice(0, 2).map((v) => ({ v, badge: "🇬🇧 English", isHindi: false })),
  ];

  return (
    <div>
      {/* YouTube videos */}
      {allVideos.length > 0 && (
        <section>
          <h3
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: "0 0 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ▶ Videos
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {allVideos.map(({ v, badge }) => (
              <YouTubeCard
                key={v.videoId}
                video={v}
                badge={badge}
                onSummarize={onSummarizeVideo ? () => onSummarizeVideo(v) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* Web results */}
      {webResults.length > 0 && (
        <section>
          <h3
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: "0 0 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🔍 Articles & Docs
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {webResults.slice(0, 4).map((r, i) => (
              <WebResultCard key={i} result={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
