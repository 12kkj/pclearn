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
    <div className="vp-modal">
      {/* ── Header ── */}
      <div className="vp-header">
        <BookOpen size={16} style={{ color: "var(--brand)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {videoTitle}
          </p>
          {channelName && <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 1 }}>{channelName}</p>}
        </div>
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer"
          className="vp-btn-ghost" style={{ gap: 4, padding: "5px 10px", fontSize: "0.8rem" }}>
          <ExternalLink size={13} /> YouTube
        </a>
        <button className="vp-btn-icon" onClick={onClose} title="Close"><X size={18} /></button>
      </div>

      {/* ── Body: side-by-side layout ── */}
      <div className="vp-body">
        {/* ── Left: Player + Controls ── */}
        <div className="vp-left">
          {/* Player */}
          <div className="vp-player-box">
            <div ref={playerDivRef} style={{ width: "100%", height: "100%" }} />
            {!playerReady && (
              <div className="vp-player-loading">
                <Loader2 size={32} className="animate-spin" style={{ color: "var(--brand)" }} />
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Loading player…</p>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="vp-controls">
            {/* Progress row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <button onClick={togglePlay} className="vp-play-btn">
                {isPlaying
                  ? <Pause size={14} fill="#fff" />
                  : <Play size={14} fill="#fff" style={{ marginLeft: 2 }} />}
              </button>
              {/* Scrubber */}
              <div className="vp-scrubber"
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
                {checkpoints.map((cp, i) => (
                  <div key={i} onClick={e => { e.stopPropagation(); seekTo(cp.time); }}
                    className="vp-checkpoint-dot"
                    style={{ left: `${duration > 0 ? (cp.time / duration) * 100 : 0}%` }}
                    title={cp.question}
                  />
                ))}
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            </div>
            {/* Speed + Fullscreen row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Gauge size={14} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: 2 }}>Speed:</span>
              {SPEEDS.map(r => (
                <button key={r} onClick={() => changeSpeed(r)} className="vp-speed-btn" data-active={speed === r}>
                  {r}x
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={() => {
                const iframe = playerRef.current?.getIframe?.();
                if (iframe) {
                  if (document.fullscreenElement) document.exitFullscreen();
                  else iframe.requestFullscreen?.();
                }
              }} className="vp-btn-ghost" style={{ padding: "4px 8px", fontSize: "0.8rem" }} title="Fullscreen">
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          {/* ── Checkpoint popup ── */}
          {activeCheckpoint && (
            <div className="vp-checkpoint-popup">
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div className="vp-checkpoint-icon">
                  <Sparkles size={14} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand2)", marginBottom: 4 }}>🤔 AI Check-in</p>
                  <p style={{ fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.6 }}>{activeCheckpoint.question}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button onClick={() => { playerRef.current?.playVideo?.(); setActiveCheckpoint(null); }}
                      className="btn-primary sm" style={{ fontSize: "0.85rem", padding: "7px 16px" }}>
                      ✅ Samajh Gaya!
                    </button>
                    <button onClick={() => { setTab("ai"); setAiInput(activeCheckpoint.question); setActiveCheckpoint(null); }}
                      className="btn-secondary sm" style={{ fontSize: "0.85rem", padding: "7px 16px" }}>
                      <MessageSquare size={13} /> Ask AI
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Upcoming checkpoint chips ── */}
          {checkpoints.filter(c => !c.triggered && c.time > currentTime).length > 0 && !activeCheckpoint && (
            <div style={{ padding: "8px 16px", flexShrink: 0 }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                🎯 Upcoming AI Check-ins
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {checkpoints.filter(c => !c.triggered && c.time > currentTime).map((cp, i) => (
                  <button key={i} onClick={() => seekTo(cp.time)} title={cp.question} className="vp-chip">
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
          <div className="vp-tabs">
            {[
              { id: "tx", icon: <AlignLeft size={15} />, label: "Transcript" },
              { id: "ai", icon: <MessageSquare size={15} />, label: "Ask AI" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="vp-tab" data-active={tab === t.id}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── Transcript tab ── */}
          {tab === "tx" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Search + Jump */}
              <div className="vp-search-bar">
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search in transcript…"
                    className="vp-input" style={{ paddingLeft: 32 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <CornerDownRight size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--cyan)" }} />
                    <input value={jumpQuery} onChange={e => setJumpQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && doJump()}
                      placeholder="Jump to topic… e.g. recursion"
                      className="vp-input" style={{ paddingLeft: 32, borderColor: "rgba(34,211,238,0.25)" }}
                    />
                  </div>
                  <button onClick={doJump} disabled={jumpLoading || !jumpQuery.trim() || !segments.length}
                    className="vp-btn-ghost" style={{ padding: "6px 12px", color: "var(--cyan)", borderColor: "rgba(34,211,238,0.35)", background: "rgba(34,211,238,0.1)" }}>
                    {jumpLoading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                  </button>
                </div>
                {jumpResult && (
                  <div style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", fontSize: "0.8rem", color: "var(--cyan)" }}>
                    ↳ <strong>{jumpResult.formattedStart}</strong> — {jumpResult.context?.slice(0, 100)}
                  </div>
                )}
              </div>

              {/* Segments */}
              <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
                {txLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 0" }}>
                    <Loader2 size={26} className="animate-spin" style={{ color: "var(--brand)" }} />
                    <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Fetching transcript…</p>
                  </div>
                ) : txError || segments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 16px" }}>
                    <AlertCircle size={28} style={{ color: "var(--amber)", marginBottom: 12 }} />
                    <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: 6 }}>
                      {txError ? "Transcript unavailable" : "No captions found"}
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", opacity: 0.7 }}>
                      This video may not have subtitles. Try the Ask AI tab instead.
                    </p>
                  </div>
                ) : (
                  filtered.map((seg, i) => {
                    const realIdx = segments.indexOf(seg);
                    const isActive = realIdx === activeIdx;
                    return (
                      <div key={i} data-seg={realIdx} onClick={() => seekTo(seg.start)} className="vp-segment" data-active={isActive}>
                        <span className="vp-seg-time" data-active={isActive}>
                          {seg.formattedStart}
                        </span>
                        <p className="vp-seg-text" data-active={isActive}>
                          {search.trim()
                            ? seg.text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")).map((p, pi) =>
                              p.toLowerCase() === search.toLowerCase()
                                ? <mark key={pi} style={{ background: "rgba(245,158,11,0.3)", color: "var(--amber)", borderRadius: 2, padding: "0 2px" }}>{p}</mark>
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
              <div style={{ padding: "8px 14px", background: "var(--brand-glow)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <p style={{ fontSize: "0.8rem", color: "var(--brand2)" }}>
                  <Sparkles size={11} style={{ display: "inline", marginRight: 4 }} />
                  AI has full transcript + current time ({fmt(currentTime)})
                  {segments.length === 0 && " · No transcript available"}
                </p>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {aiMsgs.length === 0 ? (
                  <div style={{ padding: "24px 8px" }}>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 14, textAlign: "center" }}>
                      🤖 Video ke baare mein kuch bhi pooch!
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {SUGGESTED.map((q, i) => (
                        <button key={i} onClick={() => setAiInput(q)} className="vp-suggested-btn">
                          💬 {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  aiMsgs.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div className="vp-chat-bubble" data-role={m.role}>
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
                {aiLoading && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 6px" }}>
                    <Loader2 size={15} className="animate-spin" style={{ color: "var(--brand)" }} />
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Thinking…</p>
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>

              {/* Quick action chips */}
              <div className="vp-quick-actions">
                {QUICK_ACTIONS.map((a, i) => (
                  <button key={i} onClick={() => sendAi(a.question)} disabled={aiLoading} className="vp-chip-brand">
                    {a.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: "10px 14px", flexShrink: 0, display: "flex", gap: 8 }}>
                <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAi()}
                  placeholder="Kuch bhi pooch… (Enter)"
                  className="vp-input" style={{ flex: 1 }}
                />
                <button onClick={() => sendAi()} disabled={aiLoading || !aiInput.trim()}
                  className="vp-send-btn" data-disabled={aiLoading || !aiInput.trim()}>
                  {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
