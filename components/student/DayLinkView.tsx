"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Play, Pause, SkipForward, SkipBack, ExternalLink, Globe,
  Sparkles, CheckCircle2, Target, ArrowRight, Loader2, RotateCcw,
  MessageSquare, List, X, Clock, FileText, Brain, ListChecks, BookOpen,
  ChevronDown, ChevronUp, Maximize2,
} from "lucide-react";
import type { AdminDayContent, AdminResourceLink } from "@/types";
import type { LearnerState, QuizQuestion, ChatMessage } from "@/types";
import ChatPanel from "@/components/chat/ChatPanel";

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuizData { title: string; questions: QuizQuestion[]; }
interface EvalFeedback {
  questionId: string; isCorrect: boolean;
  correctAnswer: string; studentAnswer: string; explanation: string;
}
interface EvalResult {
  passed: boolean; overallScore: number; totalQuestions?: number; correctCount?: number;
  feedback: EvalFeedback[]; weakTopicsAdded: string[]; mentorMessage: string;
}

interface Props {
  day: number;
  dayData: AdminDayContent | null;
  learner: LearnerState;
  isStreaming: boolean;
  lessonContent: string;
  quiz: QuizData | null;
  quizLoading: boolean;
  answers: Record<string, string>;
  evalResult: EvalResult | null;
  isSubmitting: boolean;
  onAnswer: (qId: string, val: string) => void;
  onSubmitQuiz: () => void;
  onNextLesson: () => void;
  onLoadQuiz: () => void;
  onStartDay: (day: number) => void;
  onAskAi: (prompt: string) => void;
  onWatchVideo: (videoId: string, title: string, channel: string) => void;
  onVideoClose?: () => void;
  videoCloseTrigger?: number;
  quizOnly?: boolean;
  /* Inline chat props for AI tab */
  chatHistory?: ChatMessage[];
  onSendChat?: (msg: string, modelId: string) => Promise<void>;
  chatLoading?: boolean;
  onClearHistory?: () => void;
  onModelChange?: (modelId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getVideoId(url: string): string {
  try { return new URL(url).searchParams.get("v") ?? ""; } catch { return ""; }
}
function getThumbnail(url: string): string {
  const id = getVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}
function getThumbnailHq(url: string): string {
  const id = getVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : "";
}

// ─── Transcript (via Cloudflare Worker proxy) ───────────────────────────────
const CF_TRANSCRIPT_API = "https://flat-bird-6bd4.koush3069.workers.dev/api/transcript";
const TRANSCRIPT_KEY = "csa_transcripts_v2";
interface TranscriptCache { text: string; segments?: Array<{ text: string; start: number; duration: number; formattedStart: string }> }
function getTranscriptCache(): Record<string, TranscriptCache> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(TRANSCRIPT_KEY) || "{}"); } catch { return {}; }
}
function saveTranscriptCache(cache: Record<string, TranscriptCache>) {
  try { localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(cache)); } catch {}
}
async function fetchTranscript(videoId: string): Promise<TranscriptCache> {
  const cached = getTranscriptCache()[videoId];
  if (cached && cached.text) return cached;

  // Try Cloudflare Worker first
  const langs = ["en", "hi", ""];
  for (const lang of langs) {
    try {
      const params = new URLSearchParams({ url: `https://www.youtube.com/watch?v=${videoId}` });
      if (lang) params.set("lang", lang);
      const res = await fetch(`${CF_TRANSCRIPT_API}?${params.toString()}`, {
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const segments: any[] = data.segments ?? [];
      if (segments.length > 0) {
        const text = segments.map((s: any) => s.text).join(" ").replace(/\s+/g, " ").trim();
        const result: TranscriptCache = { text, segments };
        if (text) { const c = getTranscriptCache(); c[videoId] = result; saveTranscriptCache(c); }
        return result;
      }
    } catch { /* try next lang */ }
  }

  // Fallback: YouTube direct timedtext API (may fail due to CORS in browser)
  try {
    const tryUrl = (kind?: string) =>
      `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}${kind ? `&kind=${kind}` : ""}&fmt=json3`;
    let res = await fetch(tryUrl());
    if (!res.ok) res = await fetch(tryUrl("asr"));
    if (res.ok) {
      const data = await res.json();
      const text = (data.events || [])
        .filter((e: any) => e.segs)
        .map((e: any) => e.segs.map((s: any) => s.utf8).join(""))
        .join(" ").replace(/\s+/g, " ").trim();
      if (text) {
        const result: TranscriptCache = { text };
        const c = getTranscriptCache(); c[videoId] = result; saveTranscriptCache(c);
        return result;
      }
    }
  } catch { /* CORS blocked in browser, ok */ }

  return { text: "" };
}

// ══════════════════════════════════════════════════════════════════════════════
// QUIZ VIEW
// ══════════════════════════════════════════════════════════════════════════════
function QuizView({
  quiz, answers, evalResult, onAnswer, onSubmit, onNextLesson,
  isSubmitting, day, onLoadQuiz, quizLoading,
}: {
  quiz: QuizData | null; answers: Record<string, string>; evalResult: EvalResult | null;
  onAnswer: (qId: string, val: string) => void; onSubmit: () => void;
  onNextLesson: () => void; isSubmitting: boolean; day: number;
  onLoadQuiz: () => void; quizLoading: boolean;
}) {
  if (quizLoading) {
    return (
      <div className="dlv-quiz-loading">
        <Loader2 size={28} className="spinner" style={{ color: "var(--brand)" }} />
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 10 }}>Loading quiz…</p>
      </div>
    );
  }
  if (!quiz) {
    return (
      <div className="dlv-quiz-empty">
        <div className="dlv-quiz-empty-icon">🧪</div>
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Ready for the Quiz?</p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
          Score 67% or more to unlock Day {day + 1}
        </p>
        <button onClick={onLoadQuiz} className="dlv-quiz-start-btn">
          <Target size={16} /> Start Quiz
        </button>
      </div>
    );
  }
  const allAnswered = quiz.questions.every(q => answers[q.id]?.trim());
  return (
    <div className="dlv-quiz-content">
      {evalResult && (
        <div className={`dlv-result-banner ${evalResult.passed ? "passed" : "failed"}`}>
          <span className="dlv-result-emoji">{evalResult.passed ? "🎉" : "💪"}</span>
          <div>
            <div className="dlv-result-score">
              {evalResult.passed ? "PASSED" : "TRY AGAIN"} — {evalResult.correctCount}/{evalResult.totalQuestions}
            </div>
            {evalResult.mentorMessage && (
              <div className="dlv-result-msg">{evalResult.mentorMessage}</div>
            )}
          </div>
        </div>
      )}
      <div className="dlv-questions-list">
        {quiz.questions.map((q, idx) => {
          const feedback = evalResult?.feedback.find(f => f.questionId === q.id);
          const isCorrect = feedback?.isCorrect;
          const isMCQ = q.type === "mcq" || q.type === "tf";
          return (
            <div key={q.id} className={`dlv-question-card ${feedback ? (isCorrect ? "correct" : "wrong") : ""}`}>
              <p className="dlv-question-text">
                <span className="dlv-question-num">Q{idx + 1}.</span> {q.question}
              </p>
              {isMCQ && q.options.length > 0 ? (
                <div className="dlv-options-list">
                  {q.options.map(opt => {
                    const isSelected = answers[q.id] === opt;
                    let state = "";
                    if (feedback) {
                      if (opt === feedback.correctAnswer) state = "correct";
                      else if (isSelected && !isCorrect) state = "wrong";
                    } else if (isSelected) state = "selected";
                    return (
                      <button key={opt} onClick={() => !evalResult && onAnswer(q.id, opt)} disabled={!!evalResult}
                        className={`dlv-option-btn ${state}`}>
                        <span className="dlv-option-indicator">
                          {feedback && opt === feedback.correctAnswer && "✓"}
                          {feedback && isSelected && !isCorrect && opt !== feedback.correctAnswer && "✗"}
                          {!feedback && isSelected && "●"}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea placeholder="Type your answer…" value={answers[q.id] ?? ""}
                  onChange={e => !evalResult && onAnswer(q.id, e.target.value)} disabled={!!evalResult} rows={3}
                  className="dlv-answer-textarea" />
              )}
              {feedback && (
                <div className={`dlv-feedback-box ${isCorrect ? "correct" : "wrong"}`}>
                  {isCorrect ? "✅ " : `❌ ${feedback.correctAnswer}. `}{feedback.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="dlv-quiz-actions">
        {!evalResult ? (
          <button onClick={onSubmit} disabled={!allAnswered || isSubmitting} className="dlv-submit-btn">
            {isSubmitting ? <><Loader2 size={16} className="spinner" /> Evaluating…</> : <><Target size={16} /> Submit Quiz</>}
          </button>
        ) : evalResult.passed ? (
          <button onClick={onNextLesson} className="dlv-next-btn">
            <ArrowRight size={16} /> Unlock Day {day + 1}
          </button>
        ) : (
          <button onClick={onSubmit} className="dlv-retry-btn"><RotateCcw size={16} /> Try Again</button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DAY LINK VIEW
// ══════════════════════════════════════════════════════════════════════════════
export default function DayLinkView({
  day, dayData, learner,
  quiz, quizLoading, answers, evalResult, isSubmitting,
  onAnswer, onSubmitQuiz, onNextLesson, onLoadQuiz,
  onStartDay, onAskAi, onWatchVideo, onVideoClose,
  videoCloseTrigger = 0,
  quizOnly = false,
  chatHistory = [],
  onSendChat,
  chatLoading = false,
  onClearHistory,
  onModelChange,
}: Props) {
  const [activeVideo, setActiveVideo] = useState<number>(-1);
  const [watchedVideos, setWatchedVideos] = useState<Set<number>>(new Set());
  const [rightTab, setRightTab] = useState<"playlist" | "ai" | "quiz">("playlist");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [videoTranscriptFull, setVideoTranscriptFull] = useState("");
  const [videoTranscriptSegments, setVideoTranscriptSegments] = useState<Array<{ text: string; start: number; duration: number; formattedStart: string }>>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const playerRef = useRef<any>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragRef.current = { startX: clientX, startW: sidebarWidth };
    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const cx = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const delta = dragRef.current.startX - cx;
      const newW = Math.max(260, Math.min(600, dragRef.current.startW + delta));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }, [sidebarWidth]);

  const links = dayData?.resources ?? [];
  const videoLinks = links.filter(l => l.type === "youtube");
  const hasVideos = videoLinks.length > 0;
  const currentVideo = activeVideo >= 0 ? videoLinks[activeVideo] : null;
  const currentVideoId = currentVideo ? getVideoId(currentVideo.url) : "";

  // Auto-load quiz in quiz-only mode
  useEffect(() => { if (quizOnly && !quiz && !quizLoading) onLoadQuiz(); }, [quizOnly]); // eslint-disable-line

  // Auto-play first video when day loads
  useEffect(() => {
    if (hasVideos && activeVideo === -1 && !quizOnly) {
      setActiveVideo(0);
    }
  }, [hasVideos, quizOnly]); // eslint-disable-line

  // Advance on external close
  useEffect(() => {
    if (videoCloseTrigger === 0) return;
    if (activeVideo >= 0) {
      setWatchedVideos(prev => new Set([...prev, activeVideo]));
      if (activeVideo < videoLinks.length - 1) setActiveVideo(activeVideo + 1);
      else { setActiveVideo(-1); setRightTab("quiz"); onLoadQuiz(); }
    }
  }, [videoCloseTrigger]); // eslint-disable-line

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).YT && (window as any).YT.Player) return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }, []);

  // Track video playback time via YouTube IFrame API
  useEffect(() => {
    if (!currentVideoId || activeVideo < 0) {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      setCurrentVideoTime(0);
      setVideoDuration(0);
      return;
    }
    // Wait for iframe to load, then poll time
    const timer = setTimeout(() => {
      const iframe = document.querySelector(".dlv-iframe") as HTMLIFrameElement;
      if (!iframe) return;
      // Use postMessage API to get time
      const pollTime = () => {
        try {
          iframe.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: currentVideoId }), "*");
        } catch { /* cross-origin ok */ }
      };
      pollTime();
      timeIntervalRef.current = setInterval(pollTime, 3000);
    }, 2000);
    return () => {
      clearTimeout(timer);
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    };
  }, [currentVideoId, activeVideo]);

  // Listen for YouTube player state messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data.info && typeof data.info.currentTime === "number") {
          setCurrentVideoTime(data.info.currentTime);
        }
        if (data.info && typeof data.info.duration === "number") {
          setVideoDuration(data.info.duration);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Load transcript via Cloudflare Worker + pre-fetch next video
  useEffect(() => {
    if (activeVideo >= 0 && videoLinks[activeVideo]) {
      const vid = getVideoId(videoLinks[activeVideo].url);
      if (vid) {
        setLoadingTranscript(true);
        fetchTranscript(vid).then(result => {
          setCurrentTranscript(result.text);
          setVideoTranscriptFull(result.text);
          setVideoTranscriptSegments(result.segments || []);
          setLoadingTranscript(false);
        });
      }
      // Pre-fetch next video transcript in background
      const nextIdx = activeVideo + 1;
      if (nextIdx < videoLinks.length) {
        const nextVid = getVideoId(videoLinks[nextIdx].url);
        if (nextVid) {
          const cached = getTranscriptCache()[nextVid];
          if (!cached || !cached.text) {
            fetchTranscript(nextVid); // fire-and-forget, populates cache
          }
        }
      }
    } else {
      setCurrentTranscript("");
      setVideoTranscriptFull("");
      setVideoTranscriptSegments([]);
    }
  }, [activeVideo]); // eslint-disable-line

  // ── Smart segment extraction ──
  const extractRelevantSegments = useCallback((msg: string): string => {
    if (!videoTranscriptSegments.length) return videoTranscriptFull.slice(0, 4000);

    // Parse time references from the message (e.g., "2:30", "1:15:00", "at 0:45")
    const timeRegex = /(?:(\d{1,3}):)?(\d{1,2}):(\d{2})/g;
    let targetTime = -1;
    let match;
    while ((match = timeRegex.exec(msg)) !== null) {
      const hours = match[1] ? parseInt(match[1]) : 0;
      const mins = parseInt(match[2]);
      const secs = parseInt(match[3]);
      targetTime = hours * 3600 + mins * 60 + secs;
      break;
    }

    // If no time mentioned in message, use current playback time
    if (targetTime < 0) {
      targetTime = currentVideoTime;
    }

    // Find the closest segment to targetTime
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < videoTranscriptSegments.length; i++) {
      const diff = Math.abs(videoTranscriptSegments[i].start - targetTime);
      if (diff < minDiff) { minDiff = diff; closestIdx = i; }
    }

    // Get 2 before and 2 after
    const startIdx = Math.max(0, closestIdx - 2);
    const endIdx = Math.min(videoTranscriptSegments.length - 1, closestIdx + 2);
    const relevant = videoTranscriptSegments.slice(startIdx, endIdx + 1);

    const timeLabel = targetTime > 0
      ? `${Math.floor(targetTime / 60)}:${String(Math.floor(targetTime % 60)).padStart(2, "0")}`
      : "current position";

    return `Video "${currentVideo?.title || "current video"}"\n` +
      `Current playback: ${timeLabel} / ${videoDuration > 0 ? `${Math.floor(videoDuration / 60)}:${String(Math.floor(videoDuration % 60)).padStart(2, "0")}` : "unknown"}\n\n` +
      `Relevant transcript segments (±2 around ${timeLabel}):\n` +
      relevant.map(s => `[${s.formattedStart}] ${s.text}`).join("\n") +
      `\n\nFull transcript preview (first 2000 chars):\n${videoTranscriptFull.slice(0, 2000)}`;
  }, [videoTranscriptSegments, videoTranscriptFull, currentVideoTime, videoDuration, currentVideo]);

  const playVideo = useCallback((idx: number) => {
    if (idx === activeVideo) return;
    if (activeVideo >= 0) setWatchedVideos(prev => new Set([...prev, activeVideo]));
    setActiveVideo(idx);
    setTranscriptOpen(false);
    setChatKey(k => k + 1);
    if (onClearHistory) onClearHistory();
  }, [activeVideo, onClearHistory]);

  const startPlaylist = useCallback(() => { setWatchedVideos(new Set()); playVideo(0); }, [playVideo]);
  const skipVideo = useCallback(() => { if (activeVideo < videoLinks.length - 1) playVideo(activeVideo + 1); }, [activeVideo, videoLinks.length, playVideo]);
  const prevVideo = useCallback(() => { if (activeVideo > 0) playVideo(activeVideo - 1); }, [activeVideo, playVideo]);

  // ─── Empty ──
  if (!day) {
    return (
      <div className="dlv-empty-state">
        <div className="dlv-empty-icon">📚</div>
        <h3 className="dlv-empty-title">Select a day to begin</h3>
        <p className="dlv-empty-desc">Pick a day from the sidebar to start learning.</p>
      </div>
    );
  }

  // ─── Quiz-only ──
  if (quizOnly) {
    return (
      <div className="dlv-quiz-only-shell">
        <div className="dlv-quiz-only-inner">
          <div className="dlv-quiz-only-header">
            <h2 className="dlv-quiz-only-title">Day {day} Quiz</h2>
            <p className="dlv-quiz-only-sub">{dayData?.title || ""} · Score 67%+ to unlock next day</p>
          </div>
          <QuizView quiz={quiz} answers={answers} evalResult={evalResult}
            onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
            isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading} />
          {evalResult?.passed && (
            <div className="dlv-tg-link-wrap">
              <a href={`https://t.me/csalearningbot?start=day${day + 1}`} target="_blank" rel="noopener noreferrer"
                className="dlv-tg-link">
                💬 Continue in Telegram — Day {day + 1}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN VIEW — YouTube-style layout
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="dlv-root">

      {/* ── Main Body ───────────────────────────────────────────────────── */}
      <div className="dlv-body">

        {/* ── Left: Player + Scrollable Content ──────────────────────────── */}
        <div className="dlv-player-area">

          {activeVideo >= 0 && currentVideo ? (
            <>
              {/* ── Video Player ── */}
              <div className="dlv-video-wrap">
                <div className="dlv-video-ratio">
                  <iframe
                    src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1`}
                    title={currentVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="dlv-iframe"
                  />
                </div>
              </div>

              {/* ── Video Info Bar ── */}
              <div className="dlv-info-bar">
                <div className="dlv-info-top">
                  <div className="dlv-info-title-row">
                    <p className="dlv-video-title">{currentVideo.title}</p>
                    {currentVideo.channelName && (
                      <span className="dlv-channel-name">{currentVideo.channelName}</span>
                    )}
                  </div>
                  <div className="dlv-info-counter">
                    {activeVideo + 1} / {videoLinks.length}
                  </div>
                </div>

                {/* ── Controls Row ── */}
                <div className="dlv-controls-row">
                  <div className="dlv-nav-btns">
                    {activeVideo > 0 && (
                      <button onClick={prevVideo} className="dlv-nav-btn">
                        <SkipBack size={15} /> <span>Prev</span>
                      </button>
                    )}
                    {activeVideo < videoLinks.length - 1 && (
                      <button onClick={skipVideo} className="dlv-nav-btn next">
                        <span>Next</span> <SkipForward size={15} />
                      </button>
                    )}
                    <a href={`https://pclearn.vercel.app/?day=${day}`} target="_blank" rel="noopener noreferrer"
                      className="dlv-fullscreen-btn">
                      <Maximize2 size={14} /> <span>Full Page</span>
                    </a>
                  </div>

                  <div className="dlv-divider" />

                  {/* Transcript toggle — inline below video */}
                  <button
                    onClick={() => setTranscriptOpen(o => !o)}
                    className={`dlv-tab-btn ${transcriptOpen ? "active" : ""}`}
                    style={transcriptOpen ? { "--tab-color": "#06b6d4" } as React.CSSProperties : {}}>
                    <span>📄</span>
                    <span className="dlv-tab-label">Transcript</span>
                    {transcriptOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} className="dlv-tab-chevron" />}
                  </button>
                </div>
              </div>

              {/* ── Transcript (expandable, scrollable below video) ── */}
              {transcriptOpen && (
                <div className="dlv-transcript-expand">
                  <div className="dlv-transcript-inner">
                    <div className="dlv-panel-header">
                      <FileText size={18} style={{ color: "#06b6d4" }} />
                      <span className="dlv-panel-title">Transcript — Video {activeVideo + 1}</span>
                    </div>
                    {loadingTranscript ? (
                      <div className="dlv-panel-loading">
                        <Loader2 size={18} className="spinner" style={{ color: "var(--brand)" }} />
                        <span>Loading transcript…</span>
                      </div>
                    ) : currentTranscript ? (
                      <p className="dlv-transcript-text">{currentTranscript}</p>
                    ) : (
                      <div className="dlv-panel-empty">
                        <FileText size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                        <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text2)", marginBottom: 4 }}>
                          No transcript available
                        </p>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                          This video doesn't have captions enabled.
                          Try <strong>Ask AI</strong> in the sidebar to get a summary.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── No video playing ── */
            <div className="dlv-no-video">
              {hasVideos ? (
                <>
                  <div className="dlv-no-video-thumb">
                    {getThumbnailHq(videoLinks[0].url) ? (
                      <img src={getThumbnailHq(videoLinks[0].url)}
                        onError={e => { (e.target as HTMLImageElement).src = getThumbnail(videoLinks[0].url); }}
                        alt="" className="dlv-no-video-img" />
                    ) : <Play size={40} style={{ color: "var(--text-faint)" }} />}
                    <div className="dlv-no-video-overlay" />
                    <div className="dlv-no-video-badge">
                      {videoLinks.length} video{videoLinks.length > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="dlv-no-video-info">
                    <h3 className="dlv-no-video-title">{dayData?.title || `Day ${day}`}</h3>
                    <p className="dlv-no-video-desc">
                      {dayData?.description || `Watch all ${videoLinks.length} videos to complete Day ${day}`}
                    </p>
                    <button onClick={startPlaylist} className="dlv-play-all-btn">
                      <Play size={20} fill="#fff" /> Play All {videoLinks.length} Videos
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "3rem", marginBottom: 14 }}>📚</div>
                  <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>No videos yet</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Ask your teacher to add resources</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Resize Handle ── */}
        {hasVideos && (
          <div className="dlv-resize-handle" onMouseDown={onDragStart} onTouchStart={onDragStart}>
            <div className="dlv-resize-grip" />
          </div>
        )}

        {/* ── Right: Sidebar (Playlist / AI / Quiz) ─────────────────────── */}
        {hasVideos && (
          <div className="dlv-sidebar" style={{ width: sidebarWidth }}>
            {/* Sidebar Tab Bar */}
            <div className="dlv-sidebar-tabs">
              <button
                onClick={() => setRightTab("playlist")}
                className={`dlv-sidebar-tab ${rightTab === "playlist" ? "active" : ""}`}>
                <List size={14} /> <span>Playlist</span>
              </button>
              <button
                onClick={() => setRightTab("ai")}
                className={`dlv-sidebar-tab ${rightTab === "ai" ? "active" : ""}`}>
                <Brain size={14} /> <span>AI</span>
              </button>
              <button
                onClick={() => {
                  setRightTab("quiz");
                  if (!quiz && !quizLoading) onLoadQuiz();
                }}
                className={`dlv-sidebar-tab ${rightTab === "quiz" ? "active" : ""}`}>
                <Target size={14} /> <span>Quiz</span>
              </button>
            </div>

            {/* ── Playlist Panel ── */}
            {rightTab === "playlist" && (
              <div className="dlv-playlist">
                {/* Progress */}
                <div className="dlv-playlist-progress">
                  <span className="dlv-playlist-count">{watchedVideos.size}/{videoLinks.length} watched</span>
                  <div className="dlv-playlist-progress-track">
                    <div className="dlv-playlist-progress-fill"
                      style={{ width: `${videoLinks.length ? (watchedVideos.size / videoLinks.length) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Items */}
                <div className="dlv-playlist-body">
                  {watchedVideos.size > 0 && (
                    <div>
                      <div className="dlv-playlist-section-label watched">
                        <CheckCircle2 size={12} /> Watched ({watchedVideos.size})
                      </div>
                      {videoLinks.map((link, idx) => {
                        if (!watchedVideos.has(idx)) return null;
                        const thumb = getThumbnail(link.url);
                        return (
                          <div key={link.id} onClick={() => playVideo(idx)} className="dlv-playlist-item watched">
                            <div className="dlv-playlist-thumb">
                              {thumb && <img src={thumb} alt="" className="dlv-playlist-thumb-img" />}
                              <div className="dlv-playlist-thumb-overlay watched">
                                <CheckCircle2 size={16} color="#fff" />
                              </div>
                            </div>
                            <div className="dlv-playlist-item-info">
                              <p className="dlv-playlist-item-title watched">{link.title}</p>
                              {link.channelName && (
                                <p className="dlv-playlist-item-channel">{link.channelName}</p>
                              )}
                            </div>
                            <span className="dlv-playlist-item-num watched">{idx + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Up Next */}
                  <div>
                    {watchedVideos.size > 0 && videoLinks.some((_, i) => !watchedVideos.has(i)) && (
                      <div className="dlv-playlist-section-label upcoming">
                        <Clock size={12} /> Up Next
                      </div>
                    )}
                    {videoLinks.map((link, idx) => {
                      if (watchedVideos.has(idx)) return null;
                      const thumb = getThumbnail(link.url);
                      const isPlaying = activeVideo === idx;
                      return (
                        <div key={link.id} onClick={() => playVideo(idx)}
                          className={`dlv-playlist-item ${isPlaying ? "playing" : ""}`}>
                          <div className="dlv-playlist-thumb">
                            {thumb && <img src={thumb} alt="" className="dlv-playlist-thumb-img" />}
                            <div className={`dlv-playlist-thumb-overlay ${isPlaying ? "playing" : ""}`}>
                              {isPlaying
                                ? <Pause size={16} fill="#fff" color="#fff" />
                                : <Play size={16} fill="#fff" color="#fff" style={{ marginLeft: 1 }} />}
                            </div>
                          </div>
                          <div className="dlv-playlist-item-info">
                            <p className={`dlv-playlist-item-title ${isPlaying ? "playing" : ""}`}>{link.title}</p>
                            {link.channelName && (
                              <p className="dlv-playlist-item-channel">{link.channelName}</p>
                            )}
                          </div>
                          <span className={`dlv-playlist-item-num ${isPlaying ? "playing" : ""}`}>{idx + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── AI Chat Panel (fills sidebar) ── */}
            {rightTab === "ai" && (
              <div className="dlv-sidebar-panel">
                {onSendChat ? (
                  <ChatPanel
                    key={chatKey}
                    chatHistory={chatHistory}
                    learner={learner}
                    onSendMessage={async (msg, modelId) => {
                      const transcriptContext = extractRelevantSegments(msg);
                      const contextMsg = transcriptContext
                        ? `[VIDEO CONTEXT]\n${transcriptContext}\n\n[STUDENT QUESTION]\n${msg}`
                        : msg;
                      await onSendChat(contextMsg, modelId);
                    }}
                    onClearHistory={onClearHistory || (() => {})}
                    onModelChange={onModelChange || (() => {})}
                    isLoading={chatLoading}
                  />
                ) : (
                  <div className="dlv-sidebar-empty">
                    <Brain size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text2)", marginBottom: 4 }}>AI Tutor</p>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 10 }}>
                      {currentVideo ? (
                        <>Watching: <strong>{currentVideo.title}</strong>{currentVideoTime > 0 ? ` at ${Math.floor(currentVideoTime / 60)}:${String(Math.floor(currentVideoTime % 60)).padStart(2, "0")}` : ""}</>
                      ) : (
                        <>Ask about Day {day}</>
                      )}
                    </p>
                    <div className="dlv-ai-quick-grid">
                      {(() => {
                        const timeLabel = currentVideoTime > 0 ? ` at ${Math.floor(currentVideoTime / 60)}:${String(Math.floor(currentVideoTime % 60)).padStart(2, "0")}` : "";
                        const vidTitle = currentVideo?.title || `Day ${day}`;
                        const segContext = videoTranscriptSegments.length > 0
                          ? (() => {
                              let closest = 0, minD = Infinity;
                              for (let i = 0; i < videoTranscriptSegments.length; i++) {
                                const d = Math.abs(videoTranscriptSegments[i].start - currentVideoTime);
                                if (d < minD) { minD = d; closest = i; }
                              }
                              const s = Math.max(0, closest - 1);
                              const e = Math.min(videoTranscriptSegments.length - 1, closest + 1);
                              return videoTranscriptSegments.slice(s, e + 1).map(x => `[${x.formattedStart}] ${x.text}`).join(" ");
                            })()
                          : "";
                        return [
                          { emoji: "💡", label: "Explain simply", prompt: `Explain what the video "${vidTitle}" is teaching${timeLabel} in simple terms${segContext ? `\n\nContext: ${segContext}` : ""}` },
                          { emoji: "📝", label: "Key points", prompt: `What are the key points from "${vidTitle}"${timeLabel}?${segContext ? `\n\nContext: ${segContext}` : ""}` },
                          { emoji: "❓", label: "Quiz me", prompt: `Create 3 practice questions about "${vidTitle}"${timeLabel}${segContext ? `\n\nBased on: ${segContext}` : ""}` },
                          { emoji: "🎯", label: "Summary", prompt: `Give a 2-sentence summary of what's being discussed in "${vidTitle}"${timeLabel}${segContext ? `\n\nContext: ${segContext}` : ""}` },
                        ];
                      })().map((item, i) => (
                        <button key={i} onClick={() => onAskAi(item.prompt)} className="dlv-ai-quick-btn">
                          <span className="dlv-ai-quick-emoji">{item.emoji}</span>
                          <span className="dlv-ai-quick-label">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Quiz Panel (fills sidebar) ── */}
            {rightTab === "quiz" && (
              <div className="dlv-sidebar-panel">
                <QuizView quiz={quiz} answers={answers} evalResult={evalResult}
                  onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
                  isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
