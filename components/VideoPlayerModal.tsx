"use client";

import * as React from "react";
import {
  X, Play, Pause, MessageSquare, AlignLeft, Search,
  CornerDownRight, Loader2, Sparkles, ExternalLink, ChevronRight,
  AlertCircle, Gauge, BookOpen, Maximize2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Segment {
  text: string;
  start: number;
  duration: number;
  formattedStart: string;
}

interface Checkpoint {
  time: number;
  formattedStart: string;
  question: string;
  triggered: boolean;
}

interface AiMsg {
  role: "user" | "assistant";
  content: string;
}

export interface VideoPlayerTarget {
  videoId: string;
  videoTitle: string;
  channelName?: string;
}

// ─── YouTube IFrame API loader (singleton, safe for concurrent calls) ───────
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
    _ytReadyCbs: Array<() => void>;
  }
}

function loadYTApi(): Promise<void> {
  return new Promise(resolve => {
    if (typeof window === "undefined") return;
    if (window.YT?.Player) { resolve(); return; }
    if (!window._ytReadyCbs) window._ytReadyCbs = [];
    window._ytReadyCbs.push(resolve);
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        window._ytReadyCbs?.forEach(cb => cb());
        window._ytReadyCbs = [];
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function VideoPlayerModal({ videoId, videoTitle, channelName, onClose, initialTab = "tx" }: VideoPlayerTarget & { onClose: () => void; initialTab?: "tx" | "ai" }) {
  const playerDivRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<any>(null);
  const transcriptRef = React.useRef<HTMLDivElement>(null);
  const aiEndRef = React.useRef<HTMLDivElement>(null);

  const [playerReady, setPlayerReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [speed, setSpeed] = React.useState(1);

  // Transcript
  const [segments, setSegments] = React.useState<Segment[]>([]);
  const [txLoading, setTxLoading] = React.useState(true);
  const [txError, setTxError] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const activeIdxRef = React.useRef(-1);

  // Checkpoints
  const [checkpoints, setCheckpoints] = React.useState<Checkpoint[]>([]);
  const [activeCheckpoint, setActiveCheckpoint] = React.useState<Checkpoint | null>(null);

  // Jump-to-topic
  const [jumpQuery, setJumpQuery] = React.useState("");
  const [jumpLoading, setJumpLoading] = React.useState(false);
  const [jumpResult, setJumpResult] = React.useState<{ time: number; formattedStart: string; context: string } | null>(null);

  // Ask AI
  const [tab, setTab] = React.useState<"tx" | "ai">(initialTab);
  const [aiMsgs, setAiMsgs] = React.useState<AiMsg[]>([]);
  const [aiInput, setAiInput] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);

  // ── Fetch transcript on mount ──
  React.useEffect(() => {
    setTxLoading(true);
    setTxError(false);
    fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_transcript", videoId }),
    })
      .then(r => r.json())
      .then(d => {
        const segs: Segment[] = d.segments ?? [];
        setSegments(segs);
        if (segs.length >= 5) getCheckpoints(segs);
      })
      .catch(() => setTxError(true))
      .finally(() => setTxLoading(false));
  }, [videoId]);

  // ── Init YouTube player ──
  React.useEffect(() => {
    let dead = false;
    loadYTApi().then(() => {
      if (dead || !playerDivRef.current) return;
      playerRef.current = new window.YT.Player(playerDivRef.current, {
        videoId,
        playerVars: { autoplay: 1, modestbranding: 1, rel: 0, iv_load_policy: 3 },
        events: {
          onReady: () => { if (!dead) { setPlayerReady(true); setDuration(playerRef.current?.getDuration?.() || 0); } },
          onStateChange: (e: any) => {
            if (dead) return;
            const playing = e.data === window.YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            if (playing) setDuration(playerRef.current?.getDuration?.() || 0);
          },
        },
      });
    });
    return () => {
      dead = true;
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [videoId]);

  // ── Poll current time + checkpoint detection ──
  React.useEffect(() => {
    if (!playerReady) return;
    const iv = setInterval(() => {
      const t = playerRef.current?.getCurrentTime?.() ?? 0;
      setCurrentTime(t);
      // Checkpoint check (mutable ref to avoid stale closure)
      setCheckpoints(prev => {
        const hit = prev.find(c => !c.triggered && Math.abs(t - c.time) <= 1.5);
        if (hit) {
          playerRef.current?.pauseVideo?.();
          setActiveCheckpoint({ ...hit, triggered: true });
          return prev.map(c => c.time === hit.time ? { ...c, triggered: true } : c);
        }
        return prev;
      });
    }, 800);
    return () => clearInterval(iv);
  }, [playerReady]);

  // ── Auto-scroll transcript to active segment ──
  React.useEffect(() => {
    if (!segments.length) return;
    let idx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (currentTime >= segments[i].start) idx = i;
      else break;
    }
    if (idx !== activeIdxRef.current && idx >= 0) {
      activeIdxRef.current = idx;
      setActiveIdx(idx);
      const el = transcriptRef.current?.querySelector(`[data-seg="${idx}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentTime, segments]);

  // ── Auto-scroll AI chat ──
  React.useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMsgs]);

  // ── Handlers ──
  const seekTo = (t: number) => { playerRef.current?.seekTo?.(t, true); playerRef.current?.playVideo?.(); };
  const togglePlay = () => isPlaying ? playerRef.current?.pauseVideo?.() : playerRef.current?.playVideo?.();
  const changeSpeed = (r: number) => { setSpeed(r); playerRef.current?.setPlaybackRate?.(r); };

  const getCheckpoints = async (segs: Segment[]) => {
    try {
      const r = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "video_checkpoints", videoTitle, segments: segs.slice(0, 80) }),
      });
      const d = await r.json();
      if (d.checkpoints?.length) setCheckpoints(d.checkpoints.map((c: any) => ({ ...c, triggered: false })));
    } catch { /* non-fatal */ }
  };

  const doJump = async () => {
    if (!jumpQuery.trim() || !segments.length) return;
    setJumpLoading(true); setJumpResult(null);
    try {
      const r = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "video_jump_to", query: jumpQuery, segments }),
      });
      const d = await r.json();
      if (d.time !== undefined) { setJumpResult(d); seekTo(d.time); }
    } catch { /* non-fatal */ }
    finally { setJumpLoading(false); }
  };

  const sendAi = async (preset?: string) => {
    const q = (preset ?? aiInput).trim();
    if (!q || aiLoading) return;
    setAiInput("");
    setAiMsgs(p => [...p, { role: "user", content: q }]);
    setAiLoading(true);
    try {
      const txCtx = segments.length
        ? segments.map(s => `[${s.formattedStart}] ${s.text}`).join("\n").slice(0, 8000)
        : "Transcript not available";
      const r = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "video_ask_ai", question: q, videoTitle,
          transcript: txCtx, currentTime: Math.floor(currentTime),
          chatHistory: aiMsgs,
        }),
      });
      const d = await r.json();
      setAiMsgs(p => [...p, { role: "assistant", content: d.reply ?? "Kuch problem aa gayi, try again!" }]);
    } catch {
      setAiMsgs(p => [...p, { role: "assistant", content: "Network error. Please try again." }]);
    } finally { setAiLoading(false); }
  };

  const filtered = search.trim()
    ? segments.filter(s => s.text.toLowerCase().includes(search.toLowerCase()))
    : segments;

  const SUGGESTED = [
    `Abhi ${fmt(currentTime)} pe kya explain ho raha tha?`,
    "Iska ek simple real-life example do",
    "Yeh concept interview mein kaise poochha jaata hai?",
    "Main isko practice kaise karun?",
  ];

  const QUICK_ACTIONS = [
    { label: "📝 Summarize", question: "Is video ka poora summary do — main points cover karo." },
    { label: "🔑 Key Points", question: "Is video ke sabse important key points bullet list mein do." },
    { label: "💡 Explain Simply", question: `Abhi ${fmt(currentTime)} tak jo explain hua hai, use ekdum simple bhasha mein samjhao.` },
    { label: "🧪 Give Example", question: "Is topic ka ek practical real-life example do." },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.96)", backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 14px", borderBottom: "1px solid var(--border)",
        background: "var(--surface)", flexShrink: 0, minHeight: 50,
      }}>
        <BookOpen size={15} style={{ color: "var(--brand)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {videoTitle}
          </p>
          {channelName && <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{channelName}</p>}
        </div>
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 0, padding: "0px 0px",
            background: "#161728", color: "#161728", borderRadius: 0, fontSize: "0.1rem",
            fontWeight: 0, textDecoration: "none", flexShrink: 0, 
          }}>
          <ExternalLink size={11} /> YouTube
        </a>
        <button className="btn-icon" onClick={onClose} title="Close"><X size={15} /></button>
      </div>

      {/* ── Body ── */}
      <div className="vp-layout">
        {/* ── Left: Player + Controls ── */}
        <div className="vp-left">
          {/* Player */}
          <div style={{ position: "relative", background: "#000", flexShrink: 0 }} className="vp-player-box">
            <div ref={playerDivRef} style={{ width: "100%", height: "100%" }} />
            {!playerReady && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center",
                justifyContent: "center", flexDirection: "column", gap: 10, background: "#000",
              }}>
                <Loader2 size={28} className="animate-spin" style={{ color: "var(--brand)" }} />
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading player…</p>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div style={{ padding: "10px 14px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            {/* Progress row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <button onClick={togglePlay} style={{
                width: 32, height: 32, borderRadius: "50%", border: "none",
                background: "var(--brand)", color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {isPlaying
                  ? <Pause size={13} fill="#fff" />
                  : <Play size={13} fill="#fff" style={{ marginLeft: 2 }} />}
              </button>
              {/* Scrubber */}
              <div
                style={{ flex: 1, height: 5, background: "var(--surface3)", borderRadius: 99, cursor: "pointer", position: "relative" }}
                onClick={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  seekTo(((e.clientX - r.left) / r.width) * duration);
                }}
              >
                <div style={{
                  position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 99,
                  background: "linear-gradient(90deg, var(--brand), var(--brand2))",
                  width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
                  transition: "width 0.5s linear",
                }} />
                {/* Checkpoint dots on scrubber */}
                {checkpoints.map((cp, i) => (
                  <div key={i} onClick={e => { e.stopPropagation(); seekTo(cp.time); }} style={{
                    position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
                    left: `${duration > 0 ? (cp.time / duration) * 100 : 0}%`,
                    width: 8, height: 8, borderRadius: "50%",
                    background: cp.triggered ? "var(--green)" : "var(--amber)",
                    border: "1.5px solid var(--surface2)", cursor: "pointer", zIndex: 2,
                  }} title={cp.question} />
                ))}
              </div>
              <span style={{ fontSize: "0.69rem", color: "var(--text-muted)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            </div>
            {/* Speed row */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <Gauge size={12} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginRight: 2 }}>Speed:</span>
              {SPEEDS.map(r => (
                <button key={r} onClick={() => changeSpeed(r)} style={{
                  padding: "2px 7px", borderRadius: 5, border: "1px solid",
                  fontSize: "0.69rem", fontWeight: 700, cursor: "pointer",
                  background: speed === r ? "var(--brand)" : "var(--surface3)",
                  color: speed === r ? "#fff" : "var(--text-muted)",
                  borderColor: speed === r ? "var(--brand)" : "var(--border)",
                }}>
                  {r}x
                </button>
              ))}
            </div>
          </div>

          {/* ── Checkpoint popup ── */}
          {activeCheckpoint && (
            <div style={{
              margin: "10px 12px", padding: 12, borderRadius: 10,
              background: "rgba(99,102,241,0.12)", border: "1px solid var(--brand)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", background: "var(--brand)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Sparkles size={13} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--brand2)", marginBottom: 4 }}>🤔 AI Check-in</p>
                  <p style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.55 }}>{activeCheckpoint.question}</p>
                  <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                    <button onClick={() => { playerRef.current?.playVideo?.(); setActiveCheckpoint(null); }}
                      className="btn-primary sm" style={{ fontSize: "0.72rem", padding: "5px 12px" }}>
                      ✅ Samajh Gaya!
                    </button>
                    <button onClick={() => {
                      setTab("ai");
                      setAiInput(activeCheckpoint.question);
                      setActiveCheckpoint(null);
                    }} className="btn-secondary sm" style={{ fontSize: "0.72rem", padding: "5px 12px" }}>
                      <MessageSquare size={11} /> Ask AI
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Upcoming checkpoint chips ── */}
          {checkpoints.filter(c => !c.triggered && c.time > currentTime).length > 0 && !activeCheckpoint && (
            <div style={{ padding: "6px 14px", flexShrink: 0 }}>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                🎯 Upcoming AI Check-ins
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {checkpoints.filter(c => !c.triggered && c.time > currentTime).map((cp, i) => (
                  <button key={i} onClick={() => seekTo(cp.time)} title={cp.question} style={{
                    padding: "2px 9px", borderRadius: 99, border: "1px solid var(--border)",
                    background: "var(--surface3)", color: "var(--text-muted)",
                    fontSize: "0.68rem", cursor: "pointer", fontFamily: "monospace",
                  }}>
                    {cp.formattedStart}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Transcript / Ask AI ── */}
        <div className="vp-right">
          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "var(--surface)" }}>
            {[
              { id: "tx", icon: <AlignLeft size={12} />, label: "Transcript" },
              { id: "ai", icon: <MessageSquare size={12} />, label: "Ask AI" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "9px 8px", fontSize: "0.76rem", fontWeight: 700, border: "none", cursor: "pointer",
                borderBottom: "2px solid transparent",
                background: tab === t.id ? "var(--surface2)" : "transparent",
                color: tab === t.id ? "var(--brand2)" : "var(--text-muted)",
                borderBottomColor: tab === t.id ? "var(--brand)" : "transparent",
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── Transcript tab ── */}
          {tab === "tx" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Search + Jump */}
              <div style={{ padding: "9px 10px", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                {/* Search */}
                <div style={{ position: "relative" }}>
                  <Search size={11} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search in transcript…"
                    style={{
                      width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                      background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 7,
                      color: "var(--text)", fontSize: "0.76rem", outline: "none", fontFamily: "inherit",
                    }}
                  />
                </div>
                {/* Jump to topic */}
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <CornerDownRight size={11} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--cyan)" }} />
                    <input value={jumpQuery} onChange={e => setJumpQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && doJump()}
                      placeholder="Jump to topic… e.g. recursion"
                      style={{
                        width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                        background: "var(--surface2)", border: "1px solid rgba(34,211,238,0.25)", borderRadius: 7,
                        color: "var(--text)", fontSize: "0.76rem", outline: "none", fontFamily: "inherit",
                      }}
                    />
                  </div>
                  <button onClick={doJump} disabled={jumpLoading || !jumpQuery.trim() || !segments.length}
                    style={{
                      padding: "6px 11px", borderRadius: 7, border: "1px solid rgba(34,211,238,0.35)",
                      background: "rgba(34,211,238,0.1)", color: "var(--cyan)",
                      cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0,
                    }}>
                    {jumpLoading ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                  </button>
                </div>
                {jumpResult && (
                  <div style={{ padding: "5px 9px", borderRadius: 6, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", fontSize: "0.72rem", color: "var(--cyan)" }}>
                    ↳ <strong>{jumpResult.formattedStart}</strong> — {jumpResult.context?.slice(0, 90)}
                  </div>
                )}
              </div>

              {/* Segments */}
              <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
                {txLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 0" }}>
                    <Loader2 size={22} className="animate-spin" style={{ color: "var(--brand)" }} />
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Fetching transcript…</p>
                  </div>
                ) : txError || segments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-muted)" }}>
                    <AlertCircle size={20} style={{ color: "var(--amber)", marginBottom: 8 }} />
                    <p style={{ fontSize: "0.78rem" }}>
                      {txError ? "Transcript unavailable for this video." : "No captions found for this video."}
                    </p>
                  </div>
                ) : (
                  filtered.map((seg, i) => {
                    const realIdx = segments.indexOf(seg);
                    const isActive = realIdx === activeIdx;
                    return (
                      <div key={i} data-seg={realIdx} onClick={() => seekTo(seg.start)} style={{
                        display: "flex", gap: 7, padding: "4px 7px", borderRadius: 7, cursor: "pointer",
                        marginBottom: 1,
                        background: isActive ? "rgba(99,102,241,0.14)" : "transparent",
                        border: isActive ? "1px solid rgba(99,102,241,0.28)" : "1px solid transparent",
                        transition: "background 0.15s, border-color 0.15s",
                      }}>
                        <span style={{
                          fontSize: "0.65rem", fontFamily: "monospace", fontWeight: 700, flexShrink: 0,
                          color: isActive ? "var(--brand2)" : "var(--red)",
                          padding: "1px 4px", background: "rgba(0,0,0,0.3)", borderRadius: 3,
                          alignSelf: "flex-start", marginTop: 2,
                        }}>
                          {seg.formattedStart}
                        </span>
                        <p style={{
                          fontSize: "0.78rem", lineHeight: 1.55, margin: 0,
                          color: isActive ? "var(--text)" : "var(--text2)",
                          fontWeight: isActive ? 600 : 400,
                        }}>
                          {search.trim()
                            ? seg.text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")).map((p, pi) =>
                              p.toLowerCase() === search.toLowerCase()
                                ? <mark key={pi} style={{ background: "rgba(245,158,11,0.3)", color: "var(--amber)", borderRadius: 2, padding: "0 1px" }}>{p}</mark>
                                : p
                            )
                            : seg.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── Ask AI tab ── */}
          {tab === "ai" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Context banner */}
              <div style={{ padding: "6px 12px", background: "var(--brand-glow)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <p style={{ fontSize: "0.69rem", color: "var(--brand2)" }}>
                  <Sparkles size={10} style={{ display: "inline", marginRight: 3 }} />
                  AI has full transcript + current time ({fmt(currentTime)})
                  {segments.length === 0 && " · No transcript available"}
                </p>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
                {aiMsgs.length === 0 ? (
                  <div style={{ padding: "20px 8px" }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12, textAlign: "center" }}>
                      🤖 Video ke baare mein kuch bhi pooch!
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {SUGGESTED.map((q, i) => (
                        <button key={i} onClick={() => setAiInput(q)} style={{
                          padding: "7px 11px", textAlign: "left", borderRadius: 8,
                          background: "var(--surface2)", border: "1px solid var(--border)",
                          color: "var(--text-muted)", fontSize: "0.76rem", cursor: "pointer",
                          fontFamily: "inherit",
                        }}>
                          💬 {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  aiMsgs.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "90%", padding: "8px 11px", borderRadius: 10,
                        background: m.role === "user" ? "var(--brand)" : "var(--surface2)",
                        color: m.role === "user" ? "#fff" : "var(--text)",
                        border: m.role === "assistant" ? "1px solid var(--border)" : "none",
                        fontSize: "0.8rem", lineHeight: 1.6, whiteSpace: "pre-wrap",
                      }}>
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
                {aiLoading && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "2px 4px" }}>
                    <Loader2 size={13} className="animate-spin" style={{ color: "var(--brand)" }} />
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Thinking…</p>
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>

              {/* Quick action chips */}
              <div style={{
                padding: "8px 10px 0", flexShrink: 0, display: "flex",
                gap: 6, flexWrap: "wrap", borderTop: "1px solid var(--border)",
              }}>
                {QUICK_ACTIONS.map((a, i) => (
                  <button key={i} onClick={() => sendAi(a.question)} disabled={aiLoading} style={{
                    padding: "5px 10px", borderRadius: 99, border: "1px solid var(--brand)",
                    background: "var(--brand-glow)", color: "var(--brand2)",
                    fontSize: "0.7rem", fontWeight: 600, cursor: aiLoading ? "not-allowed" : "pointer",
                    opacity: aiLoading ? 0.6 : 1, whiteSpace: "nowrap",
                  }}>
                    {a.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: "9px 10px", flexShrink: 0, display: "flex", gap: 7 }}>
                <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAi()}
                  placeholder="Kuch bhi pooch… (Enter)"
                  style={{
                    flex: 1, padding: "8px 12px", background: "var(--surface2)",
                    border: "1.5px solid var(--border)", borderRadius: 8,
                    color: "var(--text)", fontSize: "0.8rem", outline: "none", fontFamily: "inherit",
                  }}
                />
                <button onClick={() => sendAi()} disabled={aiLoading || !aiInput.trim()} style={{
                  padding: "8px 13px", borderRadius: 8, border: "none",
                  background: aiLoading || !aiInput.trim() ? "var(--surface3)" : "var(--brand)",
                  color: "#fff", cursor: aiLoading || !aiInput.trim() ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center",
                }}>
                  {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
