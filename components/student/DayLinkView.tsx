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

// ─── Transcript Cache ─────────────────────────────────────────────────────────
const TRANSCRIPT_KEY = "csa_transcripts";
function getTranscriptCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(TRANSCRIPT_KEY) || "{}"); } catch { return {}; }
}
function saveTranscriptCache(cache: Record<string, string>) {
  try { localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(cache)); } catch {}
}
async function fetchTranscript(videoId: string): Promise<string> {
  const cached = getTranscriptCache()[videoId];
  if (cached) return cached;
  try {
    const tryUrl = (kind?: string) =>
      `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}${kind ? `&kind=${kind}` : ""}&fmt=json3`;
    let res = await fetch(tryUrl());
    if (!res.ok) res = await fetch(tryUrl("asr"));
    if (!res.ok) return "";
    const data = await res.json();
    const text = (data.events || [])
      .filter((e: any) => e.segs)
      .map((e: any) => e.segs.map((s: any) => s.utf8).join(""))
      .join(" ").replace(/\s+/g, " ").trim();
    if (text) { const c = getTranscriptCache(); c[videoId] = text; saveTranscriptCache(c); }
    return text;
  } catch { return ""; }
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
  const [bottomTab, setBottomTab] = useState<"transcript" | "ai" | "quiz" | "none">("none");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      else { setActiveVideo(-1); setBottomTab("quiz"); onLoadQuiz(); }
    }
  }, [videoCloseTrigger]); // eslint-disable-line

  // Load transcript
  useEffect(() => {
    if (activeVideo >= 0 && videoLinks[activeVideo]) {
      const vid = getVideoId(videoLinks[activeVideo].url);
      if (vid) {
        setLoadingTranscript(true);
        fetchTranscript(vid).then(t => { setCurrentTranscript(t); setLoadingTranscript(false); });
      }
    } else { setCurrentTranscript(""); }
  }, [activeVideo]); // eslint-disable-line

  const playVideo = useCallback((idx: number) => {
    if (idx === activeVideo) return;
    if (activeVideo >= 0) setWatchedVideos(prev => new Set([...prev, activeVideo]));
    setActiveVideo(idx);
    setBottomTab("none");
  }, [activeVideo]);

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

      {/* ── Day Header ──────────────────────────────────────────────────── */}
      <div className="dlv-header">
        <div className="dlv-header-badge">{day}</div>
        <div className="dlv-header-text">
          <h2 className="dlv-header-title">{dayData?.title || `Day ${day}`}</h2>
          {dayData?.description && (
            <p className="dlv-header-desc">{dayData.description}</p>
          )}
        </div>
        <div className="dlv-header-meta">
          <span className="dlv-header-pill">
            🎬 {videoLinks.length} video{videoLinks.length !== 1 ? "s" : ""}
          </span>
          <span className="dlv-header-pill">
            ✅ {watchedVideos.size} watched
          </span>
        </div>
      </div>

      {/* ── Main Body ───────────────────────────────────────────────────── */}
      <div className="dlv-body">

        {/* ── Left: Player Area ─────────────────────────────────────────── */}
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
                  {/* Navigation */}
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

                  {/* Separator */}
                  <div className="dlv-divider" />

                  {/* Tab Toggles */}
                  <div className="dlv-tab-btns">
                    {[
                      { id: "transcript" as const, label: "Transcript", emoji: "📄", activeColor: "#06b6d4" },
                      { id: "ai" as const, label: "Ask AI", emoji: "🤖", activeColor: "var(--brand)" },
                      { id: "quiz" as const, label: "Quiz", emoji: "🧪", activeColor: "#8b5cf6" },
                    ].map(t => (
                      <button key={t.id}
                        onClick={() => {
                          const next = bottomTab === t.id ? "none" : t.id;
                          setBottomTab(next);
                          if (next === "quiz" && !quiz && !quizLoading) onLoadQuiz();
                        }}
                        className={`dlv-tab-btn ${bottomTab === t.id ? "active" : ""}`}
                        style={bottomTab === t.id ? { "--tab-color": t.activeColor } as React.CSSProperties : {}}>
                        <span>{t.emoji}</span> <span className="dlv-tab-label">{t.label}</span>
                        {bottomTab === t.id && <ChevronUp size={13} />}
                        {bottomTab !== t.id && <ChevronDown size={13} className="dlv-tab-chevron" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Bottom Panel ── */}
              {bottomTab !== "none" && (
                <div className="dlv-bottom-panel">
                  <div className="dlv-bottom-scroll">

                    {/* Transcript */}
                    {bottomTab === "transcript" && (
                      <div className="dlv-panel-content">
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
                              Try <strong>Ask AI</strong> to get a summary instead.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI — Inline ChatPanel */}
                    {bottomTab === "ai" && (
                      <div className="dlv-ai-inline">
                        {onSendChat ? (
                          <ChatPanel
                            compact
                            chatHistory={chatHistory}
                            learner={learner}
                            onSendMessage={onSendChat}
                            onClearHistory={onClearHistory || (() => {})}
                            onModelChange={onModelChange || (() => {})}
                            isLoading={chatLoading}
                          />
                        ) : (
                          <div className="dlv-panel-content">
                            <div className="dlv-panel-header">
                              <Brain size={18} style={{ color: "var(--brand)" }} />
                              <span className="dlv-panel-title">AI Tutor</span>
                              <span className="dlv-panel-subtitle">Ask about Day {day}</span>
                            </div>
                            <div className="dlv-ai-grid">
                              {[
                                { emoji: "💡", label: "Explain this simply", prompt: `Explain the video "${currentVideo?.title || `Day ${day}`}" in simple terms with examples` },
                                { emoji: "📝", label: "Key points & notes", prompt: `Give me key points and notes from "${currentVideo?.title || `Day ${day}`}"` },
                                { emoji: "❓", label: "Practice questions", prompt: `Create 5 practice questions about "${currentVideo?.title || `Day ${day}`}"` },
                                { emoji: "🔗", label: "Real-life examples", prompt: `Give real-life examples for "${currentVideo?.title || `Day ${day}`}"` },
                                { emoji: "🚀", label: "What to learn next", prompt: `After watching "${currentVideo?.title || `Day ${day}`}", what should I learn next?` },
                                { emoji: "🎯", label: "Quick summary", prompt: `Give a 3-sentence summary of "${currentVideo?.title || `Day ${day}`}"` },
                              ].map((item, i) => (
                                <button key={i} onClick={() => onAskAi(item.prompt)} className="dlv-ai-btn">
                                  <span className="dlv-ai-emoji">{item.emoji}</span>
                                  <span className="dlv-ai-label">{item.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quiz */}
                    {bottomTab === "quiz" && (
                      <div className="dlv-panel-content">
                        <QuizView quiz={quiz} answers={answers} evalResult={evalResult}
                          onAnswer={onAnswer} onSubmit={onSubmitQuiz} onNextLesson={onNextLesson}
                          isSubmitting={isSubmitting} day={day} onLoadQuiz={onLoadQuiz} quizLoading={quizLoading} />
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

        {/* ── Right: Playlist Sidebar ─────────────────────────────────── */}
        {hasVideos && (
          <div className="dlv-playlist">
            {/* Header */}
            <div className="dlv-playlist-header">
              <div className="dlv-playlist-header-left">
                <List size={16} className="dlv-playlist-icon" />
                <span className="dlv-playlist-title">Playlist</span>
              </div>
              <div className="dlv-playlist-header-right">
                <span className="dlv-playlist-count">{watchedVideos.size}/{videoLinks.length}</span>
                {/* Progress bar */}
                <div className="dlv-playlist-progress-track">
                  <div className="dlv-playlist-progress-fill"
                    style={{ width: `${videoLinks.length ? (watchedVideos.size / videoLinks.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="dlv-playlist-body">
              {/* Watched section */}
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

              {/* Up Next section */}
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
                        <div className={`dlv-playlist-thumb-overlay ${isPlaying ? "playing" : "default"}`}>
                          {isPlaying
                            ? <Pause size={14} fill="#fff" color="#fff" />
                            : <Play size={14} fill="#fff" color="#fff" style={{ marginLeft: 1 }} />}
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
      </div>
    </div>
  );
}
