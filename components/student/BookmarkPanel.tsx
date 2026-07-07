"use client";
import React, { useState } from "react";
import { Bookmark, BookmarkCheck, Trash2, ExternalLink, Clock } from "lucide-react";

export interface BookmarkItem {
  day: number;
  title: string;
  bookmarkedAt: string;
  notes?: string;
}

export default function BookmarkPanel({
  bookmarks,
  onToggle,
  onSelectDay,
}: {
  bookmarks: BookmarkItem[];
  onToggle: (day: number) => void;
  onSelectDay: (day: number) => void;
}) {
  const sorted = [...bookmarks].sort((a, b) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime());

  return (
    <div style={{ padding: 16, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Bookmark size={18} style={{ color: "var(--brand)" }} />
        <p style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text)" }}>Bookmarks</p>
        <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--text-muted)" }}>{bookmarks.length} saved</span>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: "0.82rem" }}>
          <BookmarkCheck size={20} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
          <p>No bookmarks yet.</p>
          <p style={{ fontSize: "0.72rem", marginTop: 4 }}>Tap the bookmark icon on any lesson to save it here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map(b => (
            <div key={b.day} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--border)", background: "var(--surface2)",
            }}>
              <button onClick={() => onSelectDay(b.day)} style={{
                flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none",
                border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", minWidth: 0,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand-glow)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--brand)" }}>D{b.day}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</p>
                  <p style={{ fontSize: "0.62rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock size={10} /> {new Date(b.bookmarkedAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
              <button onClick={() => onToggle(b.day)} style={{
                padding: 6, borderRadius: 6, border: "none", background: "rgba(239,68,68,0.1)",
                color: "var(--red)", cursor: "pointer", flexShrink: 0,
              }} title="Remove bookmark"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
