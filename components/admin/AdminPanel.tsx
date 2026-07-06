"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Plus, Trash2, Play, ExternalLink, Youtube, Globe, FileText,
  Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
  Sparkles, BookOpen, Brain, Link2, RefreshCw, Download, Upload,
  Settings, Shield, Eye, Edit3, Save, X, Search, Clock,
} from "lucide-react";
import type {
  AdminDayContent, AdminResourceLink, AdminCurriculumState,
  StudentId,
} from "@/types";
import { PHASES, getLessonByDay } from "@/lib/curriculum";

// ── LocalStorage helpers ──────────────────────────────────────────────────────
const ADMIN_STORAGE_KEY = "csa_admin_curriculum";

function loadAdminCurriculum(): AdminCurriculumState {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { days: {}, lastUpdated: new Date().toISOString() };
}

function saveAdminCurriculum(state: AdminCurriculumState) {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ ...state, lastUpdated: new Date().toISOString() }));
  } catch { /* quota exceeded */ }
}

function generateId(): string {
  return `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ── Resource Link Editor ──────────────────────────────────────────────────────
function ResourceLinkEditor({
  resource,
  onSave,
  onDelete,
  onCancel,
}: {
  resource?: AdminResourceLink;
  onSave: (r: AdminResourceLink) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(resource?.url ?? "");
  const [title, setTitle] = useState(resource?.title ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [type, setType] = useState<"youtube" | "blog" | "web">(resource?.type ?? "youtube");

  const detectType = (u: string) => {
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube" as const;
    if (u.includes("blog") || u.includes("medium.com") || u.includes("dev.to") || u.includes("hashnode")) return "blog" as const;
    return "web" as const;
  };

  useEffect(() => {
    if (!resource) setType(detectType(url));
  }, [url]);

  const handleSave = () => {
    if (!url.trim() || !title.trim()) return;
    const ytId = extractYouTubeId(url);
    onSave({
      id: resource?.id ?? generateId(),
      type,
      url: url.trim(),
      title: title.trim(),
      description: description.trim(),
      thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined,
      channelName: type === "youtube" ? undefined : undefined,
      addedAt: resource?.addedAt ?? new Date().toISOString(),
    });
  };

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 12, border: "1.5px solid var(--brand)",
      background: "var(--surface2)", display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link2 size={14} style={{ color: "var(--brand)" }} />
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>
          {resource ? "Edit Resource" : "Add Resource"}
        </span>
      </div>

      {/* Type selector */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["youtube", "blog", "web"] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            style={{
              padding: "5px 12px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600,
              border: `1.5px solid ${type === t ? "var(--brand)" : "var(--border)"}`,
              background: type === t ? "var(--brand-glow)" : "var(--surface)",
              color: type === t ? "var(--brand2)" : "var(--text-muted)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {t === "youtube" ? "🎥 YouTube" : t === "blog" ? "📝 Blog" : "🌐 Web"}
          </button>
        ))}
      </div>

      {/* URL */}
      <input
        type="url"
        className="input-field"
        placeholder={type === "youtube" ? "YouTube URL (e.g., https://youtube.com/watch?v=...)" : "Website URL"}
        value={url}
        onChange={e => setUrl(e.target.value)}
        autoFocus
      />

      {/* Title */}
      <input
        type="text"
        className="input-field"
        placeholder="Resource title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      {/* Description */}
      <input
        type="text"
        className="input-field"
        placeholder="Short description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      {/* Preview */}
      {url && type === "youtube" && extractYouTubeId(url) && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)" }}>
          <img
            src={`https://img.youtube.com/vi/${extractYouTubeId(url)}/hqdefault.jpg`}
            alt="thumbnail"
            style={{ width: 80, height: 45, borderRadius: 6, objectFit: "cover" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title || "Untitled"}
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>YouTube Video</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              padding: "6px 12px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600,
              border: "1px solid var(--red)", background: "rgba(239,68,68,0.1)",
              color: "var(--red)", cursor: "pointer",
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
        )}
        <button onClick={onCancel} className="btn-secondary sm">Cancel</button>
        <button
          onClick={handleSave}
          className="btn-primary sm"
          disabled={!url.trim() || !title.trim()}
        >
          <Save size={12} /> {resource ? "Update" : "Add"}
        </button>
      </div>
    </div>
  );
}

// ── Day Content Editor ────────────────────────────────────────────────────────
function DayContentEditor({
  day,
  existing,
  onSave,
  onClose,
}: {
  day: number;
  existing?: AdminDayContent;
  onSave: (content: AdminDayContent) => void;
  onClose: () => void;
}) {
  const defaultMeta = getLessonByDay(day);
  const [title, setTitle] = useState(existing?.title ?? defaultMeta?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">(existing?.difficulty ?? defaultMeta?.difficulty ?? "beginner");
  const [estimatedMinutes, setEstimatedMinutes] = useState(existing?.estimatedMinutes ?? defaultMeta?.estimatedMinutes ?? 30);
  const [topics, setTopics] = useState(existing?.topics?.join(", ") ?? defaultMeta?.topics?.join(", ") ?? "");
  const [resources, setResources] = useState<AdminResourceLink[]>(existing?.resources ?? []);
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingResource, setEditingResource] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const phase = PHASES.find(p => p.days.includes(day));

  const handleSave = () => {
    const now = new Date().toISOString();
    onSave({
      day,
      title: title.trim() || `Day ${day}`,
      description: description.trim(),
      phase: phase?.id ?? existing?.phase ?? 1,
      difficulty,
      estimatedMinutes,
      topics: topics.split(",").map(t => t.trim()).filter(Boolean),
      resources,
      transcript: existing?.transcript,
      lessonContent: existing?.lessonContent,
      quizGenerated: existing?.quizGenerated,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  };

  const handleAddResource = (r: AdminResourceLink) => {
    setResources(prev => [...prev, r]);
    setShowAddResource(false);
  };

  const handleUpdateResource = (r: AdminResourceLink) => {
    setResources(prev => prev.map(x => x.id === r.id ? r : x));
    setEditingResource(null);
  };

  const handleDeleteResource = (id: string) => {
    setResources(prev => prev.filter(x => x.id !== id));
    setEditingResource(null);
  };

  const handleAutoGenerateLesson = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_generate_lesson",
          day,
          title,
          topics: topics.split(",").map(t => t.trim()).filter(Boolean),
          resources,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.lessonContent) {
          onSave({
            day,
            title: title.trim() || `Day ${day}`,
            description: description.trim(),
            phase: phase?.id ?? existing?.phase ?? 1,
            difficulty,
            estimatedMinutes,
            topics: topics.split(",").map(t => t.trim()).filter(Boolean),
            resources,
            transcript: data.transcript,
            lessonContent: data.lessonContent,
            quizGenerated: existing?.quizGenerated,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      console.error("Failed to generate lesson:", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleTranscribeVideos = async () => {
    setGenerating(true);
    try {
      const youtubeResources = resources.filter(r => r.type === "youtube");
      let fullTranscript = "";
      for (const r of youtubeResources) {
        const videoId = extractYouTubeId(r.url);
        if (!videoId) continue;
        const res = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "admin_transcribe_video", videoId, videoTitle: r.title }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.transcript) {
            fullTranscript += `\n\n--- Video: ${r.title} ---\n${data.transcript}`;
          }
        }
      }
      if (fullTranscript) {
        const now = new Date().toISOString();
        onSave({
          day,
          title: title.trim() || `Day ${day}`,
          description: description.trim(),
          phase: phase?.id ?? existing?.phase ?? 1,
          difficulty,
          estimatedMinutes,
          topics: topics.split(",").map(t => t.trim()).filter(Boolean),
          resources,
          transcript: fullTranscript.trim(),
          lessonContent: existing?.lessonContent,
          quizGenerated: existing?.quizGenerated,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        });
      }
    } catch (e) {
      console.error("Transcription failed:", e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{
      padding: "16px 18px", borderRadius: 14, border: "1.5px solid var(--brand)",
      background: "var(--surface)", display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, var(--brand), var(--brand2))", fontSize: "0.85rem", fontWeight: 800, color: "#fff",
          }}>
            {day}
          </div>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text)" }}>Day {day} Content</h3>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {phase ? `${phase.icon} ${phase.name}` : "Phase unknown"}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="btn-icon"><X size={14} /></button>
      </div>

      {/* Basic Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Title *</label>
          <input
            type="text" className="input-field" value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Introduction to Variables in Python"
          />
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Difficulty</label>
          <select
            className="input-field" value={difficulty}
            onChange={e => setDifficulty(e.target.value as typeof difficulty)}
            style={{ cursor: "pointer" }}
          >
            <option value="beginner">🌱 Beginner</option>
            <option value="intermediate">📈 Intermediate</option>
            <option value="advanced">🔥 Advanced</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Est. Minutes</label>
          <input
            type="number" className="input-field" value={estimatedMinutes}
            onChange={e => setEstimatedMinutes(Number(e.target.value))}
            min={5} max={120}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Topics (comma separated)</label>
          <input
            type="text" className="input-field" value={topics}
            onChange={e => setTopics(e.target.value)}
            placeholder="e.g., variables, data types, assignment"
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Description</label>
          <textarea
            className="input-field" value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of this day's content"
            rows={2}
            style={{ resize: "vertical" }}
          />
        </div>
      </div>

      {/* Resources Section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>
            📎 Resources ({resources.length})
          </p>
          <button
            className="btn-secondary sm"
            onClick={() => setShowAddResource(true)}
          >
            <Plus size={12} /> Add Link
          </button>
        </div>

        {/* Resource list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {resources.map(r => (
            <React.Fragment key={r.id}>
              {editingResource === r.id ? (
                <ResourceLinkEditor
                  resource={r}
                  onSave={handleUpdateResource}
                  onDelete={() => handleDeleteResource(r.id)}
                  onCancel={() => setEditingResource(null)}
                />
              ) : (
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface2)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onClick={() => setEditingResource(r.id)}
                >
                  {r.type === "youtube" ? (
                    r.thumbnailUrl ? (
                      <img src={r.thumbnailUrl} alt="" style={{ width: 48, height: 32, borderRadius: 6, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 48, height: 32, borderRadius: 6, background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Youtube size={14} style={{ color: "#ef4444" }} />
                      </div>
                    )
                  ) : r.type === "blog" ? (
                    <div style={{ width: 48, height: 32, borderRadius: 6, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileText size={14} style={{ color: "var(--brand)" }} />
                    </div>
                  ) : (
                    <div style={{ width: 48, height: 32, borderRadius: 6, background: "rgba(6,182,212,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Globe size={14} style={{ color: "var(--cyan)" }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.title}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.url}
                    </p>
                  </div>
                  <span className={`badge ${r.type === "youtube" ? "badge-red" : r.type === "blog" ? "badge-purple" : "badge-cyan"}`}>
                    {r.type}
                  </span>
                  <Edit3 size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                </div>
              )}
            </React.Fragment>
          ))}

          {showAddResource && (
            <ResourceLinkEditor
              onSave={handleAddResource}
              onCancel={() => setShowAddResource(false)}
            />
          )}

          {resources.length === 0 && !showAddResource && (
            <div style={{
              padding: "20px 16px", borderRadius: 10, border: "1.5px dashed var(--border)",
              textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem",
            }}>
              <Link2 size={20} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
              <p>No resources added yet.</p>
              <p style={{ fontSize: "0.72rem", marginTop: 4 }}>Add YouTube videos, blogs, or web links for this day.</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn-primary sm"
          onClick={handleTranscribeVideos}
          disabled={generating || resources.filter(r => r.type === "youtube").length === 0}
          style={{ opacity: resources.filter(r => r.type === "youtube").length === 0 ? 0.5 : 1 }}
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
          Transcribe Videos
        </button>
        <button
          className="btn-secondary sm"
          onClick={handleAutoGenerateLesson}
          disabled={generating}
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Generate Lesson (AI)
        </button>
      </div>

      {/* Transcript preview */}
      {existing?.transcript && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>
            📝 Transcript ({existing.transcript.length} chars)
          </p>
          <div style={{ maxHeight: 120, overflowY: "auto", fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6 }}>
            {existing.transcript.slice(0, 500)}...
          </div>
        </div>
      )}

      {/* Lesson preview */}
      {existing?.lessonContent && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--green)", marginBottom: 6 }}>
            ✅ Lesson Content Generated ({existing.lessonContent.length} chars)
          </p>
          <div style={{ maxHeight: 120, overflowY: "auto", fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6 }}>
            {existing.lessonContent.slice(0, 500)}...
          </div>
        </div>
      )}

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <button onClick={onClose} className="btn-secondary sm">Cancel</button>
        <button onClick={handleSave} className="btn-primary sm">
          <Save size={12} /> Save Day {day}
        </button>
      </div>
    </div>
  );
}

// ── Main Admin Panel ──────────────────────────────────────────────────────────
export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [curriculum, setCurriculum] = useState<AdminCurriculumState>(loadAdminCurriculum);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"days" | "overview" | "export">("days");

  // Save on every change
  useEffect(() => {
    saveAdminCurriculum(curriculum);
  }, [curriculum]);

  const handleSaveDayContent = useCallback((content: AdminDayContent) => {
    setCurriculum(prev => ({
      ...prev,
      days: { ...prev.days, [content.day]: content },
    }));
    setSelectedDay(null);
  }, []);

  const handleDeleteDay = useCallback((day: number) => {
    if (!confirm(`Delete all content for Day ${day}?`)) return;
    setCurriculum(prev => {
      const newDays = { ...prev.days };
      delete newDays[day];
      return { ...prev, days: newDays };
    });
    setSelectedDay(null);
  }, []);

  const handleExport = () => {
    const data = JSON.stringify(curriculum, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `csa-admin-curriculum-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string) as AdminCurriculumState;
        setCurriculum(data);
      } catch { alert("Invalid curriculum file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const managedDays = Object.keys(curriculum.days).map(Number).sort((a, b) => a - b);
  const totalResources = managedDays.reduce((sum, d) => sum + (curriculum.days[d]?.resources?.length ?? 0), 0);
  const filteredDays = managedDays.filter(d => {
    if (!searchQuery) return true;
    const content = curriculum.days[d];
    return content?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           content?.topics?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, display: "flex",
      background: "var(--bg)", overflow: "hidden",
    }}>
      {/* Sidebar */}
      <div style={{
        width: 260, borderRight: "1px solid var(--border)", background: "var(--surface)",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Shield size={18} style={{ color: "var(--brand)" }} />
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text)" }}>Admin Panel</span>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Manage curriculum & content</p>
        </div>

        {/* Stats */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Days Managed</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--brand)" }}>{managedDays.length}</p>
            </div>
            <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Resources</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--cyan)" }}>{totalResources}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {([
            { id: "days" as const, icon: <BookOpen size={15} />, label: "Manage Days" },
            { id: "overview" as const, icon: <Eye size={15} />, label: "Overview" },
            { id: "export" as const, icon: <Download size={15} />, label: "Import / Export" },
          ]).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                borderRadius: 10, border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
                background: activeSection === item.id ? "var(--brand-glow)" : "transparent",
                color: activeSection === item.id ? "var(--brand2)" : "var(--text-muted)",
                transition: "all 0.15s", fontFamily: "inherit", textAlign: "left", width: "100%",
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Close */}
        <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
            ← Back to Academy
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {activeSection === "days" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search days by title or topic..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Phase groups */}
            {PHASES.map(phase => {
              const phaseDays = phase.days.filter(d => filteredDays.includes(d) || (!searchQuery && !curriculum.days[d]));
              if (phaseDays.length === 0 && searchQuery) return null;
              const isExpanded = expandedPhase === phase.id;

              return (
                <div key={phase.id} style={{ marginBottom: 12 }}>
                  <button
                    onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                      borderRadius: 10, border: "1px solid var(--border)",
                      background: isExpanded ? "var(--surface2)" : "var(--surface)",
                      cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>{phase.icon}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>
                        Phase {phase.id}: {phase.name}
                      </p>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Days {phase.days[0]}-{phase.days[phase.days.length - 1]} • {phase.days.length} days
                      </p>
                    </div>
                    <span className="badge badge-purple">
                      {phase.days.filter(d => curriculum.days[d]).length}/{phase.days.length}
                    </span>
                    <ChevronRight size={14} style={{
                      color: "var(--text-muted)", transition: "transform 0.2s",
                      transform: isExpanded ? "rotate(90deg)" : "none",
                    }} />
                  </button>

                  {isExpanded && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, padding: "10px 4px" }}>
                      {phaseDays.map(day => {
                        const content = curriculum.days[day];
                        const isSelected = selectedDay === day;
                        const hasContent = !!content;

                        return (
                          <button
                            key={day}
                            onClick={() => setSelectedDay(isSelected ? null : day)}
                            style={{
                              padding: "10px 12px", borderRadius: 10, textAlign: "left",
                              border: `1.5px solid ${isSelected ? "var(--brand)" : hasContent ? "var(--green)" : "var(--border)"}`,
                              background: isSelected ? "var(--brand-glow)" : hasContent ? "rgba(16,185,129,0.08)" : "var(--surface)",
                              cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)" }}>Day {day}</span>
                              {hasContent ? (
                                <CheckCircle2 size={12} style={{ color: "var(--green)" }} />
                              ) : (
                                <Plus size={12} style={{ color: "var(--text-muted)" }} />
                              )}
                            </div>
                            <p style={{
                              fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.3,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {content?.title ?? getLessonByDay(day)?.title ?? "Click to add"}
                            </p>
                            {hasContent && content.resources.length > 0 && (
                              <p style={{ fontSize: "0.65rem", color: "var(--cyan)", marginTop: 3 }}>
                                📎 {content.resources.length} resource{content.resources.length !== 1 ? "s" : ""}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeSection === "overview" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>
              📊 Curriculum Overview
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Days Managed", value: managedDays.length, color: "var(--brand)" },
                { label: "Total Resources", value: totalResources, color: "var(--cyan)" },
                { label: "YouTube Videos", value: managedDays.reduce((s, d) => s + (curriculum.days[d]?.resources?.filter(r => r.type === "youtube").length ?? 0), 0), color: "#ef4444" },
                { label: "Blog/Web Links", value: managedDays.reduce((s, d) => s + (curriculum.days[d]?.resources?.filter(r => r.type !== "youtube").length ?? 0), 0), color: "var(--brand)" },
                { label: "Lessons Generated", value: managedDays.filter(d => curriculum.days[d]?.lessonContent).length, color: "var(--green)" },
                { label: "Transcripts Ready", value: managedDays.filter(d => curriculum.days[d]?.transcript).length, color: "var(--amber)" },
              ].map(stat => (
                <div key={stat.label} style={{
                  padding: "14px 16px", borderRadius: 12, background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 4 }}>{stat.label}</p>
                  <p style={{ fontSize: "1.5rem", fontWeight: 800, color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Recent days */}
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Recent Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {managedDays.slice(-10).reverse().map(d => {
                const content = curriculum.days[d];
                return (
                  <div key={d} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "var(--brand-glow)", fontSize: "0.8rem", fontWeight: 800, color: "var(--brand)",
                    }}>{d}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{content.title}</p>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {content.resources.length} resources • Updated {new Date(content.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="btn-secondary sm" onClick={() => { setSelectedDay(d); setActiveSection("days"); }}>
                      Edit
                    </button>
                  </div>
                );
              })}
              {managedDays.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  <BookOpen size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <p>No days managed yet. Start by adding content to Day 1!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "export" && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>
              📦 Import / Export
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: "16px 18px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Export Curriculum</h3>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
                  Download all your managed days, resources, and generated content as a JSON file.
                </p>
                <button className="btn-primary sm" onClick={handleExport}>
                  <Download size={12} /> Export ({managedDays.length} days)
                </button>
              </div>

              <div style={{ padding: "16px 18px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Import Curriculum</h3>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
                  Upload a previously exported curriculum JSON file.
                </p>
                <label className="btn-secondary sm" style={{ cursor: "pointer" }}>
                  <Upload size={12} /> Import File
                  <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Day Editor Modal */}
      {selectedDay !== null && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 210, display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
        }}>
          <div style={{ width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }}>
            <DayContentEditor
              day={selectedDay}
              existing={curriculum.days[selectedDay]}
              onSave={handleSaveDayContent}
              onClose={() => setSelectedDay(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
