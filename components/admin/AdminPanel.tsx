"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Plus, Trash2, Youtube, Globe, FileText,
  Loader2, CheckCircle2, AlertCircle, ChevronRight,
  Sparkles, BookOpen, Brain, Link2, Download, Upload,
  Shield, Edit3, Save, X, Search,
  ArrowUp, ArrowDown, MessageSquare, TestTube2, Route, Layers,
  Tag, Cloud, CloudOff, RefreshCw, Users, BarChart3, RotateCcw,
} from "lucide-react";
import type {
  AdminDayContent, AdminResourceLink, AdminCurriculumState,
  AdminPhase, AdminSubTopic, AdminPipelineStatus,
  AdminDayTag, AdminModelTest,
} from "@/types";
import { PHASES, getLessonByDay } from "@/lib/curriculum";
import { MODELS, MODEL_INFO } from "@/constants/models";
import type { ModelId } from "@/constants/models";
import { syncCurriculumToFirestore } from "@/lib/firebase-sync";

// ── Constants ──────────────────────────────────────────────────────────────
const ADMIN_STORAGE_KEY = "csa_admin_curriculum";
const PIPELINE_STAGES: { key: AdminPipelineStatus; label: string; icon: string; color: string }[] = [
  { key: "draft", label: "Draft", icon: "📝", color: "#6b7280" },
  { key: "resources_added", label: "Resources", icon: "🔗", color: "#3b82f6" },
  { key: "transcribed", label: "Transcribed", icon: "🎙️", color: "#f97316" },
  { key: "lesson_generated", label: "Lesson Ready", icon: "📖", color: "#8b5cf6" },
  { key: "quiz_generated", label: "Quiz Ready", icon: "❓", color: "#06b6d4" },
  { key: "reviewed", label: "Reviewed", icon: "👁️", color: "#eab308" },
  { key: "published", label: "Published", icon: "🚀", color: "#10b981" },
];
const ALL_TAGS: { key: AdminDayTag; label: string; color: string }[] = [
  { key: "needs_review", label: "Needs Review", color: "#f97316" },
  { key: "premium", label: "Premium", color: "#eab308" },
  { key: "quick_lesson", label: "Quick Lesson", color: "#10b981" },
  { key: "needs_hindi_video", label: "Needs Hindi", color: "#ef4444" },
  { key: "needs_practice", label: "Needs Practice", color: "#8b5cf6" },
  { key: "draft", label: "Draft", color: "#6b7280" },
];

// ── Admin CSS ─�───────────────────────────────────────────────────────────
// Consistent styling for admin components using CSS variables

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build the default curriculum from the static PHASES constant */
function buildDefaultCurriculum(): AdminCurriculumState {
  return {
    phases: PHASES.map(ph => ({
      id: ph.id, name: ph.name, icon: ph.icon, description: `${ph.name} phase`,
      order: ph.id, color: ["#3b82f6","#8b5cf6","#f97316","#22c55e","#14b8a6","#eab308","#ef4444","#6366f1","#06b6d4","#ec4899","#7c3aed"][ph.id - 1] ?? "#6366f1",
      dayIds: ph.days, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })),
    days: {}, subDays: {}, lastUpdated: new Date().toISOString(),
  };
}

/**
 * Auto-populate empty dayIds from the static PHASES mapping.
 * This fixes corrupted Firestore/localStorage data where phases lost their day assignments.
 */
function repairDayIds(phases: AdminPhase[]): AdminPhase[] {
  const staticDaysById = new Map(PHASES.map(p => [p.id, p.days]));
  return phases.map(phase => {
    if ((!phase.dayIds || phase.dayIds.length === 0) && staticDaysById.has(phase.id)) {
      return { ...phase, dayIds: staticDaysById.get(phase.id)!, updatedAt: new Date().toISOString() };
    }
    return phase;
  });
}

function loadAdminCurriculum(): AdminCurriculumState {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        phases: repairDayIds(p.phases ?? buildDefaultCurriculum().phases),
        days: p.days ?? {},
        subDays: p.subDays ?? {},
        lastUpdated: p.lastUpdated ?? new Date().toISOString(),
      };
    }
  } catch { /* ignore */ }
  return buildDefaultCurriculum();
}

function saveAdminCurriculum(state: AdminCurriculumState) {
  try { localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ ...state, lastUpdated: new Date().toISOString() })); } catch { /* quota */ }
}

function genId(): string { return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : (url.match(/^([a-zA-Z0-9_-]{11})$/) ? url : null);
}
/** Parse "MM:SS" or "HH:MM:SS" or raw seconds to total seconds */
function parseAdminTime(v: string): number {
  if (!v.trim()) return 0;
  if (/^\d+$/.test(v.trim())) return parseInt(v.trim());
  const parts = v.trim().split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function pipeColor(s: AdminPipelineStatus): string { return PIPELINE_STAGES.find(x => x.key === s)?.color ?? "#6b7280"; }
function nextPipe(s: AdminPipelineStatus): AdminPipelineStatus {
  const i = PIPELINE_STAGES.findIndex(x => x.key === s);
  return i < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[i + 1].key : s;
}

// ── Resource Link Editor ──────────────────────────────────────────────────
function ResourceLinkEditor({ resource, onSave, onDelete, onCancel }: {
  resource?: AdminResourceLink; onSave: (r: AdminResourceLink) => void;
  onDelete?: () => void; onCancel: () => void;
}) {
  const [url, setUrl] = useState(resource?.url ?? "");
  const [title, setTitle] = useState(resource?.title ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [type, setType] = useState<"youtube" | "blog" | "web">(resource?.type ?? "youtube");
  const [autoFilling, setAutoFilling] = useState(false);
  const [startTime, setStartTime] = useState(resource?.startTime != null ? String(resource.startTime) : "");
  const [endTime, setEndTime] = useState(resource?.endTime != null ? String(resource.endTime) : "");

  // When URL changes and has ?t=, auto-fill startTime if empty
  useEffect(() => {
    if (type !== "youtube" || resource) return;
    try {
      const u = new URL(url);
      const t = u.searchParams.get("t") ?? u.searchParams.get("start");
      if (t && !startTime) {
        // Parse "2m6s" or raw seconds
        if (t.includes("m") || t.includes("s")) {
          let secs = 0;
          const mMatch = t.match(/(\d+)m/);
          const sMatch = t.match(/(\d+)s/);
          if (mMatch) secs += parseInt(mMatch[1]) * 60;
          if (sMatch) secs += parseInt(sMatch[1]);
          setStartTime(String(secs));
        } else {
          setStartTime(t);
        }
      }
    } catch {}
  }, [url, type]);

  useEffect(() => {
    if (!resource) {
      if (url.includes("youtube.com") || url.includes("youtu.be")) setType("youtube");
      else if (url.includes("blog") || url.includes("medium.com") || url.includes("dev.to")) setType("blog");
      else if (url.trim()) setType("web");
    }
  }, [url, resource]);

  const handleAutoFill = async () => {
    if (!url.trim()) return;
    setAutoFilling(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_auto_fill_link", url: url.trim(), title, type }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
      }
    } catch { /* ignore */ }
    setAutoFilling(false);
  };

  const handleSave = () => {
    if (!url.trim() || !title.trim()) return;
    const ytId = extractYouTubeId(url);
    onSave({
      id: resource?.id ?? genId(), type, url: url.trim(), title: title.trim(),
      description: description.trim(),
      thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined,
      addedAt: resource?.addedAt ?? new Date().toISOString(),
      startTime: type === "youtube" && startTime.trim() ? parseAdminTime(startTime) : undefined,
      endTime: type === "youtube" && endTime.trim() ? parseAdminTime(endTime) : undefined,
    });
  };

  return (
    <div style={{ padding: 14, borderRadius: 12, border: "1.5px solid var(--brand)", background: "var(--surface2)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link2 size={14} style={{ color: "var(--brand)" }} />
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>{resource ? "Edit Resource" : "Add Resource"}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {(["youtube", "blog", "web"] as const).map(t => (
          <button key={t} onClick={() => setType(t)} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600,
            border: `1.5px solid ${type === t ? "var(--brand)" : "var(--border)"}`,
            background: type === t ? "var(--brand-glow)" : "var(--surface)",
            color: type === t ? "var(--brand2)" : "var(--text-muted)", cursor: "pointer",
          }}>
            {t === "youtube" ? "🎥 YouTube" : t === "blog" ? "📝 Blog" : "🌐 Web"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="url" className="input-field" style={{ flex: 1 }} placeholder={type === "youtube" ? "YouTube URL" : "Website URL"} value={url} onChange={e => setUrl(e.target.value)} autoFocus />
        <button className="btn-primary sm" onClick={handleAutoFill} disabled={!url.trim() || autoFilling} style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
          {autoFilling ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Auto-Fill
        </button>
      </div>
      <input type="text" className="input-field" placeholder="Resource title" value={title} onChange={e => setTitle(e.target.value)} />
      <input type="text" className="input-field" placeholder="Short description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
      {type === "youtube" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 2, display: "block" }}>⏱ Start Time</label>
            <input type="text" className="input-field" placeholder="0:00 or 126" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ fontSize: "0.78rem" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 2, display: "block" }}>⏹ Stop Time</label>
            <input type="text" className="input-field" placeholder="Leave empty = play full" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ fontSize: "0.78rem" }} />
          </div>
        </div>
      )}
      {url && type === "youtube" && extractYouTubeId(url) && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 8, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)" }}>
          <img src={`https://img.youtube.com/vi/${extractYouTubeId(url)}/hqdefault.jpg`} alt="" style={{ width: 80, height: 45, borderRadius: 6, objectFit: "cover" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled"}</p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>YouTube Video</p>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {onDelete && <button onClick={onDelete} style={{ padding: "6px 12px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, border: "1px solid var(--red)", background: "rgba(239,68,68,0.1)", color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={12} /> Delete</button>}
        <button onClick={onCancel} className="btn-secondary sm">Cancel</button>
        <button onClick={handleSave} className="btn-primary sm" disabled={!url.trim() || !title.trim()}><Save size={12} /> {resource ? "Update" : "Add"}</button>
      </div>
    </div>
  );
}

// ── Sub-Topic Editor ──────────────────────────────────────────────────────
function SubTopicEditor({ subTopics, onChange }: { subTopics: AdminSubTopic[]; onChange: (st: AdminSubTopic[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [obj, setObj] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    onChange([...subTopics, { id: genId(), name: name.trim(), description: desc.trim(), objectives: obj.split(",").map(o => o.trim()).filter(Boolean), resources: [], order: subTopics.length }]);
    setName(""); setDesc(""); setObj(""); setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>📚 Sub-Topics ({subTopics.length})</p>
        <button className="btn-secondary sm" onClick={() => setShowAdd(true)}><Plus size={12} /> Add</button>
      </div>
      {subTopics.map(st => (
        <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>{st.name}</p>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st.description}</p>
            {st.objectives.length > 0 && <p style={{ fontSize: "0.65rem", color: "var(--cyan)", marginTop: 2 }}>🎯 {st.objectives.join(" • ")}</p>}
          </div>
          <button onClick={() => onChange(subTopics.filter(x => x.id !== st.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", padding: 4 }}><Trash2 size={12} /></button>
        </div>
      ))}
      {showAdd && (
        <div style={{ padding: 10, borderRadius: 8, border: "1px solid var(--brand)", background: "var(--surface2)", display: "flex", flexDirection: "column", gap: 6 }}>
          <input className="input-field" placeholder="Sub-topic name" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <input className="input-field" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
          <input className="input-field" placeholder="Objectives (comma separated)" value={obj} onChange={e => setObj(e.target.value)} />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="btn-secondary sm" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn-primary sm" onClick={handleAdd} disabled={!name.trim()}>Add</button>
          </div>
        </div>
      )}
      {!showAdd && subTopics.length === 0 && <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", padding: 8 }}>No sub-topics yet.</p>}
    </div>
  );
}

// ── Day Content Editor ────────────────────────────────────────────────────
function DayContentEditor({ day, existing, curriculum, onSave, onClose }: {
  day: number; existing?: AdminDayContent; curriculum: AdminCurriculumState;
  onSave: (c: AdminDayContent) => void; onClose: () => void;
}) {
  const def = getLessonByDay(day);
  const [title, setTitle] = useState(existing?.title ?? def?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">(existing?.difficulty ?? def?.difficulty ?? "beginner");
  const [estimatedMinutes, setEstimatedMinutes] = useState(existing?.estimatedMinutes ?? def?.estimatedMinutes ?? 30);
  const [topics, setTopics] = useState(existing?.topics?.join(", ") ?? def?.topics?.join(", ") ?? "");
  const [resources, setResources] = useState<AdminResourceLink[]>(existing?.resources ?? []);
  const [subTopics, setSubTopics] = useState<AdminSubTopic[]>(existing?.subTopics ?? []);
  const [pipelineStatus, setPipelineStatus] = useState<AdminPipelineStatus>(existing?.pipelineStatus ?? "draft");
  const [adminNotes, setAdminNotes] = useState<string[]>(existing?.adminNotes ?? []);
  const [tags, setTags] = useState<AdminDayTag[]>(existing?.tags ?? []);
  const [newNote, setNewNote] = useState("");
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingResource, setEditingResource] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"resources" | "subtopics" | "notes">("resources");

  const phase = curriculum.phases.find(p => (p.dayIds ?? []).includes(day)) ?? PHASES.find(p => p.days.includes(day));

  const build = (extra?: Partial<AdminDayContent>): AdminDayContent => ({
    day, title: title.trim() || `Day ${day}`, description: description.trim(),
    phase: phase?.id ?? 1, difficulty, estimatedMinutes,
    topics: topics.split(",").map(t => t.trim()).filter(Boolean),
    resources, subTopics, subDays: existing?.subDays ?? [],
    pipelineStatus, adminNotes, tags,
    transcript: existing?.transcript, lessonContent: existing?.lessonContent,
    quizGenerated: existing?.quizGenerated,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(), ...extra,
  });

  const handleSave = () => onSave(build());

  const handleTranscribeVideos = async () => {
    setGenerating(true);
    try {
      const ytR = resources.filter(r => r.type === "youtube");
      let fullTranscript = "";
      for (const r of ytR) {
        const vid = extractYouTubeId(r.url);
        if (!vid) continue;
        const res = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "admin_transcribe_video", videoId: vid, videoTitle: r.title }) });
        if (res.ok) { const d = await res.json(); if (d.transcript) fullTranscript += `\n\n--- ${r.title} ---\n${d.transcript}`; }
      }
      if (fullTranscript) { setPipelineStatus("transcribed"); onSave(build({ transcript: fullTranscript.trim() })); }
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const handleGenerateLesson = async () => {
    setGenerating(true);
    try {
      // Get transcript from existing content or from the most recent transcribe result
      let transcriptText = existing?.transcript ?? "";
      if (!transcriptText) {
        try {
          const adminRaw = localStorage.getItem("csa_admin_curriculum");
          if (adminRaw) {
            const adminData = JSON.parse(adminRaw);
            transcriptText = adminData.days?.[day]?.transcript ?? "";
          }
        } catch { /* ignore */ }
      }
      const res = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_generate_lesson", day, title, topics: topics.split(",").map(t => t.trim()).filter(Boolean), resources, transcript: transcriptText || undefined }) });
      if (res.ok) { const d = await res.json(); if (d.lessonContent) { setPipelineStatus("lesson_generated"); onSave(build({ lessonContent: d.lessonContent, transcript: d.transcript || transcriptText })); } }
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  return (
    <div style={{ padding: 16, borderRadius: 14, border: "1.5px solid var(--brand)", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${pipeColor(pipelineStatus)}, ${phase?.color ?? "#6366f1"})`, fontSize: "0.82rem", fontWeight: 800, color: "#fff" }}>{day}</div>
          <div>
            <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text)" }}>Day {day}</h3>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{phase ? `${phase.icon} ${phase.name}` : "?"} • {PIPELINE_STAGES.find(s => s.key === pipelineStatus)?.icon} {PIPELINE_STAGES.find(s => s.key === pipelineStatus)?.label}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn-secondary sm" onClick={() => setPipelineStatus(nextPipe(pipelineStatus))} style={{ display: "flex", alignItems: "center", gap: 4 }}>Advance →</button>
          <button onClick={onClose} className="btn-icon"><X size={14} /></button>
        </div>
      </div>

      {/* Pipeline bar */}
      <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
        {PIPELINE_STAGES.map((st, i) => (
          <div key={st.key} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= PIPELINE_STAGES.findIndex(s => s.key === pipelineStatus) ? st.color : "var(--border)", transition: "background 0.3s" }} title={st.label} />
        ))}
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {ALL_TAGS.map(tag => (
          <button key={tag.key} onClick={() => setTags(prev => prev.includes(tag.key) ? prev.filter(t => t !== tag.key) : [...prev, tag.key])} style={{
            padding: "3px 10px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 600,
            border: `1px solid ${tags.includes(tag.key) ? tag.color : "var(--border)"}`,
            background: tags.includes(tag.key) ? `${tag.color}20` : "transparent",
            color: tags.includes(tag.key) ? tag.color : "var(--text-muted)", cursor: "pointer",
          }}><Tag size={10} /> {tag.label}</button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Title *</label>
          <input type="text" className="input-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Day title" />
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Difficulty</label>
          <select className="input-field" value={difficulty} onChange={e => setDifficulty(e.target.value as typeof difficulty)}>
            <option value="beginner">🌱 Beginner</option>
            <option value="intermediate">📈 Intermediate</option>
            <option value="advanced">🔥 Advanced</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Est. Minutes</label>
          <input type="number" className="input-field" value={estimatedMinutes} onChange={e => setEstimatedMinutes(Number(e.target.value))} min={5} max={120} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Topics (comma separated)</label>
          <input type="text" className="input-field" value={topics} onChange={e => setTopics(e.target.value)} placeholder="variables, data types, assignment" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Description</label>
          <textarea className="input-field" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" rows={2} style={{ resize: "vertical" }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {([ { k: "resources" as const, i: <Link2 size={12} />, l: `Resources (${resources.length})` },
           { k: "subtopics" as const, i: <Layers size={12} />, l: `Sub-Topics (${subTopics.length})` },
           { k: "notes" as const, i: <MessageSquare size={12} />, l: `Notes (${adminNotes.length})` },
        ]).map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)} style={{
            padding: "8px 14px", borderRadius: "8px 8px 0 0", fontSize: "0.78rem", fontWeight: 600, border: "none",
            borderBottom: activeTab === t.k ? "2px solid var(--brand)" : "2px solid transparent",
            background: activeTab === t.k ? "var(--surface2)" : "transparent",
            color: activeTab === t.k ? "var(--brand)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit",
          }}>{t.i} {t.l}</button>
        ))}
      </div>

      {/* Resources Tab */}
      {activeTab === "resources" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-secondary sm" onClick={() => setShowAddResource(true)}><Plus size={12} /> Add Link</button>
          </div>
          {resources.map(r => (
            <React.Fragment key={r.id}>
              {editingResource === r.id ? (
                <ResourceLinkEditor resource={r}
                  onSave={(u) => { setResources(p => p.map(x => x.id === u.id ? u : x)); setEditingResource(null); }}
                  onDelete={() => { setResources(p => p.filter(x => x.id !== r.id)); setEditingResource(null); }}
                  onCancel={() => setEditingResource(null)} />
              ) : (
                <div onClick={() => setEditingResource(r.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface2)", cursor: "pointer" }}>
                  {r.type === "youtube" ? (
                    r.thumbnailUrl ? <img src={r.thumbnailUrl} alt="" style={{ width: 48, height: 32, borderRadius: 6, objectFit: "cover" }} />
                    : <div style={{ width: 48, height: 32, borderRadius: 6, background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Youtube size={14} style={{ color: "#ef4444" }} /></div>
                  ) : r.type === "blog" ? (
                    <div style={{ width: 48, height: 32, borderRadius: 6, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={14} style={{ color: "var(--brand)" }} /></div>
                  ) : (
                    <div style={{ width: 48, height: 32, borderRadius: 6, background: "rgba(6,182,212,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Globe size={14} style={{ color: "var(--cyan)" }} /></div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</p>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.url}</p>
                  </div>
                  <span className={`badge ${r.type === "youtube" ? "badge-red" : r.type === "blog" ? "badge-purple" : "badge-cyan"}`}>{r.type}</span>
                  {r.type === "youtube" && ((r.startTime ?? 0) > 0 || (r.endTime ?? 0) > 0) && (
                    <span className="badge badge-cyan" style={{ fontSize: "0.65rem" }}>
                      ⏱ {(r.startTime ?? 0) > 0 ? `${Math.floor((r.startTime ?? 0)/60)}:${String((r.startTime ?? 0)%60).padStart(2,"0")}` : "0:00"}
                      {(r.endTime ?? 0) > 0 ? ` → ${Math.floor((r.endTime ?? 0)/60)}:${String((r.endTime ?? 0)%60).padStart(2,"0")}` : " → end"}
                    </span>
                  )}
                  <Edit3 size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                </div>
              )}
            </React.Fragment>
          ))}
          {showAddResource && <ResourceLinkEditor onSave={(r) => { setResources(p => [...p, r]); setShowAddResource(false); if (pipelineStatus === "draft") setPipelineStatus("resources_added"); }} onCancel={() => setShowAddResource(false)} />}
          {resources.length === 0 && !showAddResource && (
            <div style={{ padding: 20, borderRadius: 10, border: "1.5px dashed var(--border)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              <Link2 size={20} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
              <p>No resources yet. Paste a URL and click Auto-Fill!</p>
            </div>
          )}
        </div>
      )}

      {/* Sub-Topics Tab */}
      {activeTab === "subtopics" && <SubTopicEditor subTopics={subTopics} onChange={setSubTopics} />}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input className="input-field" style={{ flex: 1 }} placeholder="Add a note, reminder..." value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === "Enter" && newNote.trim() && (setAdminNotes(p => [...p, newNote.trim()]), setNewNote(""))} />
            <button className="btn-primary sm" onClick={() => { if (newNote.trim()) { setAdminNotes(p => [...p, newNote.trim()]); setNewNote(""); } }} disabled={!newNote.trim()}><Plus size={12} /></button>
          </div>
          {adminNotes.map((n, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <MessageSquare size={12} style={{ color: "var(--brand)", flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: "0.78rem", color: "var(--text)" }}>{n}</span>
              <button onClick={() => setAdminNotes(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)" }}><X size={12} /></button>
            </div>
          ))}
          {adminNotes.length === 0 && <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", padding: 12 }}>No notes yet. Add reminders like "Skip to 2:30" or "Needs Hindi video".</p>}
        </div>
      )}

      {/* AI Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn-primary sm" onClick={handleTranscribeVideos} disabled={generating || !resources.some(r => r.type === "youtube")}>
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />} Transcribe Videos
        </button>
        <button className="btn-secondary sm" onClick={handleGenerateLesson} disabled={generating}>
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate Lesson (AI)
        </button>
      </div>

      {/* Previews */}
      {existing?.transcript && (
        <div style={{ padding: 12, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>📝 Transcript ({existing.transcript.length} chars)</p>
          <div style={{ maxHeight: 100, overflowY: "auto", fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6 }}>{existing.transcript.slice(0, 500)}...</div>
        </div>
      )}
      {existing?.lessonContent && (
        <div style={{ padding: 12, borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--green)", marginBottom: 6 }}>✅ Lesson ({existing.lessonContent.length} chars)</p>
          <div style={{ maxHeight: 100, overflowY: "auto", fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6 }}>{existing.lessonContent.slice(0, 500)}...</div>
        </div>
      )}

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <button onClick={onClose} className="btn-secondary sm">Cancel</button>
        <button onClick={handleSave} className="btn-primary sm"><Save size={12} /> Save Day {day}</button>
      </div>
    </div>
  );
}

// ── Phase Manager ─────────────────────────────────────────────────────────
function PhaseManager({ curriculum, onPhasesChange }: { curriculum: AdminCurriculumState; onPhasesChange: (p: AdminPhase[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newDayNum, setNewDayNum] = useState<Record<number, string>>({});
  const [name, setName] = useState(""); const [icon, setIcon] = useState("📚");
  const [desc, setDesc] = useState(""); const [color, setColor] = useState("#6366f1");

  const handleAdd = () => {
    if (!name.trim()) return;
    const maxId = Math.max(0, ...curriculum.phases.map(p => p.id));
    onPhasesChange([...curriculum.phases, { id: maxId + 1, name: name.trim(), icon, description: desc.trim(), order: maxId + 1, color, dayIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
    setName(""); setDesc(""); setShowAdd(false);
  };

  const handleEdit = () => {
    if (!name.trim() || editingId === null) return;
    onPhasesChange(curriculum.phases.map(p => p.id === editingId ? { ...p, name: name.trim(), icon, description: desc.trim(), color, updatedAt: new Date().toISOString() } : p));
    setName(""); setDesc(""); setEditingId(null);
  };

  const startEdit = (phase: AdminPhase) => {
    setEditingId(phase.id); setShowAdd(false);
    setName(phase.name); setIcon(phase.icon); setDesc(phase.description ?? ""); setColor(phase.color ?? "#6366f1");
  };

  const handleMove = (id: number, dir: "up" | "down") => {
    const sorted = [...curriculum.phases].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(p => p.id === id);
    if (dir === "up" && idx > 0) [sorted[idx].order, sorted[idx - 1].order] = [sorted[idx - 1].order, sorted[idx].order];
    else if (dir === "down" && idx < sorted.length - 1) [sorted[idx].order, sorted[idx + 1].order] = [sorted[idx + 1].order, sorted[idx].order];
    onPhasesChange(sorted);
  };

  const handleAddDayToPhase = (phaseId: number) => {
    const num = parseInt(newDayNum[phaseId] ?? "", 10);
    if (!num || num < 1) return;
    onPhasesChange(curriculum.phases.map(p => p.id === phaseId ? { ...p, dayIds: [...(p.dayIds ?? []).filter(d => d !== num), num].sort((a, b) => a - b), updatedAt: new Date().toISOString() } : p));
    setNewDayNum(prev => ({ ...prev, [phaseId]: "" }));
  };

  const handleRemoveDayFromPhase = (phaseId: number, dayNum: number) => {
    onPhasesChange(curriculum.phases.map(p => p.id === phaseId ? { ...p, dayIds: (p.dayIds ?? []).filter(d => d !== dayNum), updatedAt: new Date().toISOString() } : p));
  };

  const renderForm = (onSubmit: () => void, submitLabel: string, onCancel: () => void) => (
    <div style={{ padding: 16, borderRadius: 12, border: "1.5px solid var(--brand)", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>{editingId !== null ? "Edit Phase" : "Add New Phase"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 8 }}>
        <input className="input-field" placeholder="📚" value={icon} onChange={e => setIcon(e.target.value)} style={{ textAlign: "center" }} />
        <input className="input-field" placeholder="Phase name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      </div>
      <input className="input-field" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Color:</label>
        <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 32, height: 32, border: "none", borderRadius: 6, cursor: "pointer" }} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn-secondary sm" onClick={onCancel}>Cancel</button>
        <button className="btn-primary sm" onClick={onSubmit} disabled={!name.trim()}><Save size={12} /> {submitLabel}</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)" }}>📎 Manage Phases</h2>
        <button className="btn-primary sm" onClick={() => { setShowAdd(true); setEditingId(null); setName(""); setDesc(""); setIcon("📚"); setColor("#6366f1"); }}><Plus size={12} /> Add Phase</button>
      </div>
      {[...curriculum.phases].sort((a, b) => a.order - b.order).map(phase => (
        <div key={phase.id} style={{ marginBottom: 6, borderRadius: 10, border: `1px solid ${expandedId === phase.id ? (phase.color ?? "var(--brand)") : "var(--border)"}`, background: "var(--surface)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
            <button onClick={() => setExpandedId(expandedId === phase.id ? null : phase.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flex: 1, fontFamily: "inherit", textAlign: "left" }}>
              <span style={{ fontSize: "1.2rem" }}>{phase.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Phase {phase.id}: {phase.name}</p>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{(phase.dayIds ?? []).length} days • {phase.description}</p>
              </div>
              <ChevronRight size={14} style={{ color: "var(--text-muted)", transition: "transform 0.2s", transform: expandedId === phase.id ? "rotate(90deg)" : "none" }} />
            </button>
            <div style={{ display: "flex", gap: 3 }}>
              <button onClick={() => handleMove(phase.id, "up")} className="btn-icon" style={{ width: 26, height: 26 }}><ArrowUp size={11} /></button>
              <button onClick={() => handleMove(phase.id, "down")} className="btn-icon" style={{ width: 26, height: 26 }}><ArrowDown size={11} /></button>
              <button onClick={() => startEdit(phase)} className="btn-icon" style={{ width: 26, height: 26 }}><Edit3 size={11} /></button>
              <button onClick={() => { if (confirm(`Delete Phase "${phase.name}" and remove all ${phase.dayIds?.length ?? 0} day assignments?`)) { onPhasesChange(curriculum.phases.filter(p => p.id !== phase.id)); } }} className="btn-icon" style={{ width: 26, height: 26, color: "var(--red)" }}><Trash2 size={11} /></button>
            </div>
          </div>
          {expandedId === phase.id && (
            <div style={{ padding: "8px 12px 12px", borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>Days in this phase:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {(phase.dayIds ?? []).sort((a, b) => a - b).map(d => (
                  <span key={d} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 600, background: `${phase.color ?? "var(--brand)"}15`, color: phase.color ?? "var(--brand)", border: `1px solid ${phase.color ?? "var(--brand)"}30` }}>
                    Day {d}
                    <button onClick={() => handleRemoveDayFromPhase(phase.id, d)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1, opacity: 0.6 }} title="Remove day"><X size={10} /></button>
                  </span>
                ))}
                {(phase.dayIds ?? []).length === 0 && <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>No days assigned</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="number" className="input-field" placeholder="Day #" value={newDayNum[phase.id] ?? ""} onChange={e => setNewDayNum(prev => ({ ...prev, [phase.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleAddDayToPhase(phase.id)} style={{ width: 80, fontSize: "0.78rem" }} min={1} />
                <button className="btn-primary sm" onClick={() => handleAddDayToPhase(phase.id)} disabled={!newDayNum[phase.id]}><Plus size={12} /> Add Day</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {showAdd && renderForm(handleAdd, "Create", () => setShowAdd(false))}
      {editingId !== null && renderForm(handleEdit, "Save Changes", () => { setEditingId(null); setName(""); setDesc(""); })}
    </div>
  );
}

// ── Student Progress Manager ──────────────────────────────────────────────
function StudentProgressManager() {
  const [students, setStudents] = useState<Array<{ id: string; name: string; currentDay: number; completedDays: number[]; xp: number; streak: number; testScores: Record<number, number> }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [editDay, setEditDay] = useState("");

  const STUDENT_IDS = ["st_1", "st_2"];

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { loadStateFromFirestore } = await import("@/lib/firebase-sync");
      const results = await Promise.all(STUDENT_IDS.map(async (id) => {
        try {
          const state = await loadStateFromFirestore(id as any);
          return { id, name: state?.name ?? id, currentDay: state?.currentDay ?? 0, completedDays: state?.completedDays ?? [], xp: state?.xp ?? 0, streak: state?.streak ?? 0, testScores: state?.testScores ?? {} };
        } catch { return { id, name: id, currentDay: 0, completedDays: [] as number[], xp: 0, streak: 0, testScores: {} as Record<number, number> }; }
      }));
      setStudents(results.filter(s => s.name !== s.id || s.currentDay > 0 || s.completedDays.length > 0));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, []);

  const handleSetDay = async (studentId: string, newDay: number) => {
    try {
      const { loadStateFromFirestore, syncStateToFirestore } = await import("@/lib/firebase-sync");
      const state = await loadStateFromFirestore(studentId as any);
      if (state) {
        state.currentDay = newDay;
        await syncStateToFirestore(studentId as any, state as any);
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, currentDay: newDay } : s));
        setEditDay("");
      }
    } catch { /* ignore */ }
  };

  const handleResetStudent = async (studentId: string) => {
    if (!confirm("Reset this student's progress to Day 1? This cannot be undone.")) return;
    try {
      const { loadStateFromFirestore, syncStateToFirestore } = await import("@/lib/firebase-sync");
      const state = await loadStateFromFirestore(studentId as any);
      if (state) {
        state.currentDay = 1;
        state.completedDays = [];
        state.testScores = {};
        state.xp = 0;
        state.streak = 0;
        state.weakTopics = [];
        await syncStateToFirestore(studentId as any, state as any);
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, currentDay: 1, completedDays: [], testScores: {}, xp: 0, streak: 0 } : s));
      }
    } catch { /* ignore */ }
  };

  const sel = students.find(s => s.id === selectedStudent);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)" }}>👤 Student Progress</h2>
        <button className="btn-secondary sm" onClick={loadStudents} disabled={loading}><RefreshCw size={12} /> Refresh</button>
      </div>
      {students.length === 0 && !loading && (
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
          <Users size={24} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
          <p>No students found. Students appear here after they log in.</p>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {students.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${selectedStudent === s.id ? "var(--brand)" : "var(--border)"}`, background: selectedStudent === s.id ? "rgba(99,102,241,0.04)" : "var(--surface)", cursor: "pointer" }} onClick={() => setSelectedStudent(selectedStudent === s.id ? null : s.id)}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, var(--brand), var(--brand2))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "0.78rem" }}>{s.name?.charAt(0)?.toUpperCase() ?? "?"}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>{s.name || s.id}</p>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Day {s.currentDay} • {s.completedDays.length} completed • {s.xp} XP • 🔥{s.streak}</p>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 999, background: "rgba(99,102,241,0.1)", color: "var(--brand)", fontWeight: 600 }}>{s.id}</span>
            </div>
          </div>
        ))}
      </div>
      {sel && (
        <div style={{ marginTop: 14, padding: 16, borderRadius: 12, border: "1.5px solid var(--brand)", background: "var(--surface)" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>⚙️ Manage: {sel.name || sel.id}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div style={{ padding: 10, borderRadius: 8, background: "var(--surface2)" }}>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Current Day</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--brand)" }}>{sel.currentDay}</p>
            </div>
            <div style={{ padding: 10, borderRadius: 8, background: "var(--surface2)" }}>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Completed</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--green)" }}>{sel.completedDays.length}</p>
            </div>
            <div style={{ padding: 10, borderRadius: 8, background: "var(--surface2)" }}>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>XP</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--cyan)" }}>{sel.xp}</p>
            </div>
            <div style={{ padding: 10, borderRadius: 8, background: "var(--surface2)" }}>
              <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Streak</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--orange)" }}>🔥 {sel.streak}</p>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Test Scores:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Object.entries(sel.testScores).sort(([a], [b]) => Number(a) - Number(b)).map(([day, score]) => (
                <span key={day} style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: 6, background: score >= 80 ? "rgba(16,185,129,0.12)" : score >= 60 ? "rgba(234,179,8,0.12)" : "rgba(239,68,68,0.12)", color: score >= 80 ? "var(--green)" : score >= 60 ? "#eab308" : "var(--red)", fontWeight: 600 }}>Day {day}: {score}%</span>
              ))}
              {Object.keys(sel.testScores).length === 0 && <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>No tests taken</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input type="number" className="input-field" placeholder="Day #" value={editDay} onChange={e => setEditDay(e.target.value)} style={{ width: 70, fontSize: "0.78rem" }} min={1} max={210} />
              <button className="btn-primary sm" onClick={() => { const d = parseInt(editDay, 10); if (d > 0) handleSetDay(sel.id, d); }} disabled={!editDay}>Set Day</button>
            </div>
            <button className="btn-secondary sm" style={{ color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)" }} onClick={() => handleResetStudent(sel.id)}><RotateCcw size={12} /> Reset Progress</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI Journey Panel ──────────────────────────────────────────────────────
function StudentJourneyPanel({ learner, onAskAi }: { learner: any; onAskAi: (prompt: string) => void }) {
  const [recommendation, setRecommendation] = useState<string>("");
  const [nextSteps, setNextSteps] = useState<Array<{ day: number; title: string; reason: string; priority: string }>>([]);
  const [loading, setLoading] = useState(false);

  const generateJourney = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_journey_next",
          studentProfile: { name: learner.name, profile: learner.profile, currentDay: learner.currentDay, completedDays: learner.completedDays, testScores: learner.testScores, weakTopics: learner.weakTopics, xp: learner.xp, streak: learner.streak },
        }) });
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.recommendation ?? "");
        setNextSteps(data.nextSteps ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div style={{ padding: 16, borderRadius: 12, border: "1.5px solid var(--brand)", background: "var(--surface)", marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>🧠 AI Journey Recommendation</h3>
        <button className="btn-primary sm" onClick={generateJourney} disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate
        </button>
      </div>
      {recommendation && (
        <div style={{ padding: 12, borderRadius: 8, background: "var(--surface2)", marginBottom: 10, fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {recommendation}
        </div>
      )}
      {nextSteps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {nextSteps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: step.priority === "high" ? "rgba(239,68,68,0.12)" : step.priority === "medium" ? "rgba(234,179,8,0.12)" : "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, color: step.priority === "high" ? "var(--red)" : step.priority === "medium" ? "#eab308" : "var(--green)" }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>Day {step.day}: {step.title}</p>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{step.reason}</p>
              </div>
              <button className="btn-secondary sm" onClick={() => onAskAi(`Help me understand Day ${step.day}: ${step.title}`)} style={{ fontSize: "0.7rem" }}>Ask AI</button>
            </div>
          ))}
        </div>
      )}
      {!recommendation && !loading && (
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", padding: 12 }}>Click "Generate" to get AI-powered learning path recommendations based on the student's actual progress.</p>
      )}
    </div>
  );
}

// ── Curriculum Generator ──────────────────────────────────────────────────
function CurriculumGenerator({ onGenerate, generating }: { onGenerate: (t: string, topics: string[], d: string) => void; generating: boolean }) {
  const [title, setTitle] = useState(""); const [topics, setTopics] = useState(""); const [desc, setDesc] = useState("");
  return (
    <div>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>✨ AI Curriculum Generator</h2>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 14 }}>Type a topic and AI generates an entire curriculum with phases, days, sub-days, topics, and learning objectives.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600 }}>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Topic / Course Title *</label>
          <input className="input-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Python Programming" autoFocus />
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Topics to cover (optional)</label>
          <input className="input-field" value={topics} onChange={e => setTopics(e.target.value)} placeholder="e.g., variables, loops, functions" />
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Description (optional)</label>
          <textarea className="input-field" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Course goals and audience" rows={2} style={{ resize: "vertical" }} />
        </div>
        <button className="btn-primary" onClick={() => onGenerate(title, topics.split(",").map(t => t.trim()).filter(Boolean), desc)} disabled={!title.trim() || generating} style={{ alignSelf: "flex-start" }}>
          {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate Full Curriculum</>}
        </button>
      </div>
    </div>
  );
}

// ── Pipeline View ─────────────────────────────────────────────────────────
function PipelineView({ curriculum, onSelectDay }: { curriculum: AdminCurriculumState; onSelectDay: (d: number) => void }) {
  const managed = Object.values(curriculum.days);
  return (
    <div>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)", marginBottom: 14 }}>📋 Content Pipeline</h2>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, 1fr)`, gap: 8, overflowX: "auto" }}>
        {PIPELINE_STAGES.map(stage => {
          const days = managed.filter(d => d.pipelineStatus === stage.key);
          return (
            <div key={stage.key} style={{ minWidth: 130 }}>
              <div style={{ padding: "8px 10px", borderRadius: "8px 8px 0 0", background: `${stage.color}20`, border: `1px solid ${stage.color}40`, borderBottom: "none" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color: stage.color }}>{stage.icon} {stage.label}</p>
                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{days.length} days</p>
              </div>
              <div style={{ padding: 6, borderRadius: "0 0 8px 8px", border: `1px solid ${stage.color}30`, background: "var(--surface2)", minHeight: 80, display: "flex", flexDirection: "column", gap: 4 }}>
                {days.map(d => (
                  <button key={d.day} onClick={() => onSelectDay(d.day)} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%" }}>
                    <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text)" }}>Day {d.day}</p>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</p>
                  </button>
                ))}
                {days.length === 0 && <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center", padding: 8 }}>Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Model Test Panel ──────────────────────────────────────────────────────
function ModelTestPanel({ results, testing, onTest, modelSel, onModelSel, promptText, onPromptChange }: {
  results: AdminModelTest[]; testing: boolean;
  onTest: () => void; modelSel: ModelId; onModelSel: (m: ModelId) => void;
  promptText: string; onPromptChange: (t: string) => void;
}) {
  const modelEntries = Object.entries(MODELS) as [string, ModelId][];

  return (
    <div>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>🧪 Test AI Models</h2>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 14 }}>Test any AI model to verify it works. Tests run in the background — switch tabs freely.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600 }}>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Model</label>
          <select className="input-field" value={modelSel} onChange={e => onModelSel(e.target.value as ModelId)}>
            {modelEntries.map(([key, val]) => (
              <option key={val} value={val}>{MODEL_INFO[val]?.name ?? key} ({val})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Test Prompt</label>
          <textarea className="input-field" value={promptText} onChange={e => onPromptChange(e.target.value)} rows={2} style={{ resize: "vertical" }} />
        </div>
        <button className="btn-primary" onClick={onTest} disabled={!modelSel || testing} style={{ alignSelf: "flex-start" }}>
          {testing ? <><Loader2 size={14} className="animate-spin" /> Testing...</> : <><TestTube2 size={14} /> Run Test</>}
        </button>
      </div>
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map((r, i) => (
          <div key={i} style={{ padding: 12, borderRadius: 10, border: `1px solid ${r.success ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, background: r.success ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {r.success ? <CheckCircle2 size={14} style={{ color: "var(--green)" }} /> : <AlertCircle size={14} style={{ color: "var(--red)" }} />}
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>{r.modelId}</span>
              {r.latencyMs && <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{r.latencyMs}ms</span>}
            </div>
            {r.response && <p style={{ fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.5 }}>{r.response}</p>}
            {r.error && <p style={{ fontSize: "0.78rem", color: "var(--red)" }}>Error: {r.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Admin Panel ──────────────────────────────────────────────────────
export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [curriculum, setCurriculum] = useState<AdminCurriculumState>(loadAdminCurriculum);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"days" | "phases" | "pipeline" | "generator" | "test" | "export" | "progress">("days");
  const [generatingCurriculum, setGeneratingCurriculum] = useState(false);

  // ── Model Test state (lifted here so it survives section switches) ──
  const modelEntries = Object.entries(MODELS) as [string, ModelId][];
  const [modelTestSel, setModelTestSel] = useState<ModelId>(modelEntries[0]?.[1] ?? "");
  const [modelTestPrompt, setModelTestPrompt] = useState("Explain what a variable is in Python in 2 sentences.");
  const [modelTestResults, setModelTestResults] = useState<AdminModelTest[]>(() => {
    try { return JSON.parse(localStorage.getItem("csa_admin_model_tests") ?? "[]"); } catch { return []; }
  });
  const [modelTestRunning, setModelTestRunning] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("csa_admin_model_tests", JSON.stringify(modelTestResults.slice(0, 50))); } catch { /* quota */ }
  }, [modelTestResults]);

  const handleModelTest = useCallback(async () => {
    if (!modelTestSel || modelTestRunning) return;
    setModelTestRunning(true);
    try {
      const res = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_test_model", model: modelTestSel, message: modelTestPrompt }) });
      const data = await res.json();
      setModelTestResults(prev => [{ ...data, prompt: modelTestPrompt }, ...prev].slice(0, 50));
    } catch {
      setModelTestResults(prev => [{ modelId: modelTestSel, prompt: modelTestPrompt, success: false, error: "Network error" }, ...prev].slice(0, 50));
    }
    setModelTestRunning(false);
  }, [modelTestSel, modelTestPrompt, modelTestRunning]);

  useEffect(() => { saveAdminCurriculum(curriculum); }, [curriculum]);

  // ── Pull curriculum from Firestore on mount (cross-device sync) ──
  React.useEffect(() => {
    let cancelled = false;
    import("@/lib/firebase-sync").then(({ loadCurriculumFromFirestore }) =>
      loadCurriculumFromFirestore().then(cloud => {
        if (cancelled || !cloud) return;
        setCurriculum(prev => {
          // Merge: cloud days override local (cloud = source of truth), local-only days preserved
          const mergedDays = { ...prev.days, ...cloud.days };
          // Only use cloud phases if they have more data than local
          const mergedPhases = cloud.phases?.length > 0 ? cloud.phases : prev.phases;
          return { ...prev, days: mergedDays, phases: mergedPhases };
        });
      }).catch(() => {})
    );
    return () => { cancelled = true; };
  }, []);

  // ── Auto-sync curriculum to Firestore (debounced, so students see updates) ──
  const _cloudSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");

  useEffect(() => {
    if (_cloudSyncTimer.current) clearTimeout(_cloudSyncTimer.current);
    _cloudSyncTimer.current = setTimeout(async () => {
      setCloudSyncStatus("syncing");
      try {
        await syncCurriculumToFirestore(curriculum);
        setCloudSyncStatus("synced");
        setTimeout(() => setCloudSyncStatus("idle"), 3000);
      } catch {
        setCloudSyncStatus("error");
        setTimeout(() => setCloudSyncStatus("idle"), 5000);
      }
    }, 5000); // 5-second debounce after last edit
    return () => { if (_cloudSyncTimer.current) clearTimeout(_cloudSyncTimer.current); };
  }, [curriculum]);

  const handleSaveDay = useCallback((content: AdminDayContent) => {
    setCurriculum(prev => ({ ...prev, days: { ...prev.days, [content.day]: content } }));
    setSelectedDay(null);
  }, []);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(curriculum, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `csa-curriculum-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { try { setCurriculum(JSON.parse(ev.target?.result as string)); } catch { alert("Invalid file"); } };
    reader.readAsText(file); e.target.value = "";
  };

  const handleGenerateFullCurriculum = async (title: string, topics: string[], description: string) => {
    setGeneratingCurriculum(true);
    try {
      const res = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_generate_full_curriculum", title, topics, description }) });
      if (res.ok) {
        const data = await res.json();
        if (data.phases && Array.isArray(data.phases)) {
          const newDays: Record<number, AdminDayContent> = {};
          const newPhases: AdminPhase[] = data.phases.map((p: any, i: number) => {
            const dayIds: number[] = [];
            (p.days ?? []).forEach((d: any) => {
              dayIds.push(d.day);
              newDays[d.day] = {
                day: d.day, title: d.title, description: d.description ?? "",
                phase: p.id ?? i + 1, difficulty: d.difficulty ?? "beginner",
                estimatedMinutes: d.estimatedMinutes ?? 30, topics: d.topics ?? [],
                resources: [], subTopics: (d.subTopics ?? []).map((st: any) => ({
                  id: genId(), name: st.name, description: st.description ?? "",
                  objectives: st.objectives ?? [], resources: [], order: 0,
                })),
                subDays: [], pipelineStatus: "draft", adminNotes: [], tags: [],
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
              };
            });
            return {
              id: p.id ?? i + 1, name: p.name, icon: p.icon ?? "📚",
              description: p.description ?? "", order: i + 1,
              color: p.color ?? `hsl(${i * 40}, 60%, 55%)`, dayIds,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
          });
          setCurriculum(prev => ({
            ...prev,
            phases: [...prev.phases.filter(p => !newPhases.some(np => np.id === p.id)), ...newPhases],
            days: { ...prev.days, ...newDays },
          }));
          setActiveSection("days");
        }
      }
    } catch (e) { console.error(e); }
    setGeneratingCurriculum(false);
  };

  const managedDays = Object.keys(curriculum.days).map(Number).sort((a, b) => a - b);
  const totalResources = managedDays.reduce((sum, d) => sum + (curriculum.days[d]?.resources?.length ?? 0), 0);
  const filteredDays = managedDays.filter(d => {
    if (!searchQuery) return true;
    const c = curriculum.days[d];
    return c?.title.toLowerCase().includes(searchQuery.toLowerCase()) || c?.topics?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", background: "var(--bg)", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 240, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "18px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--brand), var(--brand2))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text)" }}>Admin</p>
              <p style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Curriculum Manager</p>
            </div>
          </div>
          {/* Cloud sync */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: cloudSyncStatus === "syncing" ? "rgba(59,130,246,0.08)" : cloudSyncStatus === "synced" ? "rgba(16,185,129,0.08)" : cloudSyncStatus === "error" ? "rgba(239,68,68,0.08)" : "var(--surface2)", border: `1px solid ${cloudSyncStatus === "syncing" ? "rgba(59,130,246,0.25)" : cloudSyncStatus === "synced" ? "rgba(16,185,129,0.25)" : cloudSyncStatus === "error" ? "rgba(239,68,68,0.25)" : "var(--border)"}` }}>
            {cloudSyncStatus === "syncing" ? <><RefreshCw size={11} style={{ color: "#3b82f6", animation: "spin 1s linear infinite" }} /><span style={{ fontSize: "0.65rem", color: "#3b82f6", fontWeight: 600 }}>Syncing…</span></>
            : cloudSyncStatus === "synced" ? <><Cloud size={11} style={{ color: "var(--green)" }} /><span style={{ fontSize: "0.65rem", color: "var(--green)", fontWeight: 600 }}>Synced</span></>
            : cloudSyncStatus === "error" ? <><CloudOff size={11} style={{ color: "var(--red)" }} /><span style={{ fontSize: "0.65rem", color: "var(--red)", fontWeight: 600 }}>Failed</span></>
            : <><Cloud size={11} style={{ color: "var(--text-muted)" }} /><span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>Auto-sync on</span></>
            }
          </div>
        </div>
        {/* Stats */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1, padding: "6px 8px", borderRadius: 8, background: "var(--surface2)", textAlign: "center" }}>
              <p style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--brand)" }}>{managedDays.length}</p>
              <p style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 600 }}>DAYS</p>
            </div>
            <div style={{ flex: 1, padding: "6px 8px", borderRadius: 8, background: "var(--surface2)", textAlign: "center" }}>
              <p style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--cyan)" }}>{totalResources}</p>
              <p style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 600 }}>LINKS</p>
            </div>
            <div style={{ flex: 1, padding: "6px 8px", borderRadius: 8, background: "var(--surface2)", textAlign: "center" }}>
              <p style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--green)" }}>{curriculum.phases.length}</p>
              <p style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 600 }}>PHASES</p>
            </div>
          </div>
        </div>
        <div style={{ padding: "10px 10px", display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {([
            { id: "days" as const, icon: <BookOpen size={15} />, label: "Days" },
            { id: "phases" as const, icon: <Layers size={15} />, label: "Phases" },
            { id: "pipeline" as const, icon: <Route size={15} />, label: "Pipeline" },
            { id: "progress" as const, icon: <Users size={15} />, label: "Students" },
            { id: "generator" as const, icon: <Sparkles size={15} />, label: "AI Generator" },
            { id: "test" as const, icon: <TestTube2 size={15} />, label: "Model Test" },
            { id: "export" as const, icon: <Download size={15} />, label: "Import/Export" },
          ]).map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
              background: activeSection === item.id ? "var(--brand-glow)" : "transparent",
              color: activeSection === item.id ? "var(--brand2)" : "var(--text-muted)", transition: "all 0.15s", fontFamily: "inherit", textAlign: "left", width: "100%",
            }}>{item.icon} {item.label}</button>
          ))}
        </div>
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} style={{
            width: "100%", padding: "9px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)",
            color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>← Back to Academy</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {activeSection === "days" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)" }}>📖 Manage Days</h2>
            </div>
            {/* Search */}
            <div style={{ marginBottom: 16, position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input type="text" className="input-field" placeholder="Search by title or topic…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 36 }} />
            </div>
            {/* Phases */}
            {curriculum.phases.sort((a, b) => a.order - b.order).map(phase => {
              const phaseDays = (phase.dayIds ?? []).filter(d => filteredDays.includes(d) || (!searchQuery && !curriculum.days[d]));
              if (phaseDays.length === 0 && searchQuery) return null;
              const isExpanded = expandedPhase === phase.id;
              const published = phaseDays.filter(d => curriculum.days[d]?.pipelineStatus === "published").length;
              return (
                <div key={phase.id} style={{ marginBottom: 10 }}>
                  <button onClick={() => setExpandedPhase(isExpanded ? null : phase.id)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                    border: `1px solid ${isExpanded ? (phase.color ?? "var(--brand)") : "var(--border)"}`,
                    background: isExpanded ? "var(--surface2)" : "var(--surface)", cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <span style={{ fontSize: "1.1rem" }}>{phase.icon}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Phase {phase.id}: {phase.name}</p>
                      <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{(phase.dayIds ?? []).length} days • {published} published</p>
                    </div>
                    <ChevronRight size={14} style={{ color: "var(--text-muted)", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "none" }} />
                  </button>
                  {isExpanded && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6, padding: "8px 4px" }}>
                      {phaseDays.map(day => {
                        const content = curriculum.days[day];
                        const isSel = selectedDay === day;
                        const has = !!content;
                        const sc = has ? pipeColor(content.pipelineStatus) : "var(--border)";
                        return (
                          <button key={day} onClick={() => setSelectedDay(isSel ? null : day)} style={{
                            padding: "8px 10px", borderRadius: 8, textAlign: "left",
                            border: `1.5px solid ${isSel ? "var(--brand)" : "var(--border)"}`,
                            background: isSel ? "rgba(99,102,241,0.06)" : "var(--surface)", cursor: "pointer", fontFamily: "inherit",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text)" }}>Day {day}</span>
                              {has ? <span style={{ fontSize: "0.55rem", padding: "1px 5px", borderRadius: 999, background: `${sc}18`, color: sc, fontWeight: 600 }}>{PIPELINE_STAGES.find(s => s.key === content.pipelineStatus)?.icon}</span> : <Plus size={10} style={{ color: "var(--text-muted)" }} />}
                            </div>
                            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{content?.title ?? getLessonByDay(day)?.title ?? "Click to add"}</p>
                            {has && (content.resources?.length ?? 0) > 0 && <p style={{ fontSize: "0.62rem", color: "var(--cyan)", marginTop: 2 }}>📎 {content.resources?.length ?? 0} links</p>}
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
        {activeSection === "phases" && <div style={{ maxWidth: 800, margin: "0 auto" }}><PhaseManager curriculum={curriculum} onPhasesChange={(phases) => setCurriculum(prev => ({ ...prev, phases }))} /></div>}
        {activeSection === "pipeline" && <div style={{ maxWidth: 1100, margin: "0 auto" }}><PipelineView curriculum={curriculum} onSelectDay={(d) => { setSelectedDay(d); setActiveSection("days"); }} /></div>}
        {activeSection === "progress" && <div style={{ maxWidth: 800, margin: "0 auto" }}><StudentProgressManager /></div>}
        {activeSection === "generator" && <div style={{ maxWidth: 600, margin: "0 auto" }}><CurriculumGenerator onGenerate={handleGenerateFullCurriculum} generating={generatingCurriculum} /></div>}
        {activeSection === "test" && <div style={{ maxWidth: 600, margin: "0 auto" }}><ModelTestPanel results={modelTestResults} testing={modelTestRunning} onTest={handleModelTest} modelSel={modelTestSel} onModelSel={setModelTestSel} promptText={modelTestPrompt} onPromptChange={setModelTestPrompt} /></div>}
        {activeSection === "export" && (
          <div style={{ maxWidth: 500, margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>📦 Import / Export</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: 16, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Export</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 10 }}>Download all days, phases, resources, and content as JSON.</p>
                <button className="btn-primary sm" onClick={handleExport}><Download size={12} /> Export ({managedDays.length} days)</button>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Import</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 10 }}>Upload a previously exported JSON file.</p>
                <label className="btn-secondary sm" style={{ cursor: "pointer" }}><Upload size={12} /> Import File<input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} /></label>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--red)", marginBottom: 6 }}>⚠️ Reset Curriculum</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 10 }}>Reset all phases to the default 21-phase structure. Day content is preserved.</p>
                <button className="btn-secondary sm" style={{ color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)" }} onClick={() => { if (confirm("Reset phases to default structure? Day content will NOT be deleted.")) { setCurriculum(prev => ({ ...prev, phases: buildDefaultCurriculum().phases })); } }}><RefreshCw size={12} /> Reset to Default Phases</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Day Editor Modal */}
      {selectedDay !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}>
          <div style={{ width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}>
            <DayContentEditor day={selectedDay} existing={curriculum.days[selectedDay]} curriculum={curriculum} onSave={handleSaveDay} onClose={() => setSelectedDay(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
