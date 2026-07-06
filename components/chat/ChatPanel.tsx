"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Bot, User, Trash2, ChevronDown, Zap, Brain, Cpu, Copy, Check,
  ArrowDown, Sparkles, MessageSquare, X, ChevronUp, Volume2,
} from "lucide-react";
import MarkdownViewer from "@/components/ui/MarkdownViewer";
import { CHAT_SELECTABLE_MODELS, MODEL_INFO, MODELS } from "@/constants/models";
import type { ModelId } from "@/constants/models";
import type { ChatMessage, LearnerState } from "@/types";

interface Props {
  chatHistory: ChatMessage[];
  learner: LearnerState;
  onSendMessage: (msg: string, modelId: string) => Promise<void>;
  onClearHistory: () => void;
  onModelChange: (modelId: string) => void;
  isLoading: boolean;
  /** Renders a compact header (e.g., inside the Ask AI drawer). */
  compact?: boolean;
  /** Called when the compact panel requests to close. */
  onClose?: () => void;
}

const SPEED_ICON = {
  fast: <Zap size={10} className="text-yellow-400" />,
  medium: <Cpu size={10} className="text-blue-400" />,
  slow: <Brain size={10} className="text-purple-400" />,
};

const SUGGESTIONS = [
  "What are binary numbers? Give a simple example",
  "What's the difference between RAM and ROM?",
  "What's the difference between Python and C++?",
  "Explain Machine Learning in simple terms",
  "What is a pointer in C?",
  "What's the difference between Git and GitHub?",
];

export default function ChatPanel({
  chatHistory,
  learner,
  onSendMessage,
  onClearHistory,
  onModelChange,
  isLoading,
  compact = false,
  onClose,
}: Props) {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<ModelId>(
    (learner.preferredChatModel as ModelId) ?? MODELS.GPT_OSS_120B,
  );
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const lastHistoryLen = useRef(chatHistory.length);

  // Auto-scroll to bottom on new messages, but show a scroll button if user scrolled up
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    const isNewMessage = chatHistory.length > lastHistoryLen.current;
    lastHistoryLen.current = chatHistory.length;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNewMessage && nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [chatHistory, isLoading]);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      setShowScrollButton(!nearBottom && el.scrollHeight > el.clientHeight + 100);
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [chatHistory.length]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setModelPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-resize textarea to a single-line-height feel, expanding up to a limit
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 44), 160)}px`;
  };

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || isLoading) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
    await onSendMessage(msg, selectedModel);
  }, [input, isLoading, onSendMessage, selectedModel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModelSelect = (modelId: ModelId) => {
    setSelectedModel(modelId);
    onModelChange(modelId);
    setModelPickerOpen(false);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1500);
  };

  const handleSuggestion = (s: string) => {
    setInput(s);
    textareaRef.current?.focus();
  };

  const scrollToBottom = () => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  };

  const currentModelInfo = MODEL_INFO[selectedModel];
  const hasMessages = chatHistory.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--bg)]">
      {/* Header */}
      <div
        className="flex-shrink-0 border-b"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {compact && onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
              style={{ background: "var(--surface2)", color: "var(--text-muted)" }}
              title="Close"
            >
              <X size={15} />
            </button>
          )}

          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm" style={{ color: "var(--text)" }}>
              AI Mentor
            </div>
            <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              Ask anything about computers, code & AI
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model picker */}
            <div ref={pickerRef} className="relative">
              <button
                onClick={() => setModelPickerOpen((o) => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface2)",
                  color: "var(--text)",
                }}
                title="Choose AI model"
              >
                {SPEED_ICON[currentModelInfo.speed]}
                <span className="max-w-[90px] truncate">{currentModelInfo.name}</span>
                <ChevronDown
                  size={12}
                  style={{ color: "var(--text-muted)", transform: modelPickerOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                />
              </button>

              {modelPickerOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-80 rounded-xl shadow-2xl z-50 overflow-hidden border"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div
                    className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wider"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                  >
                    Choose AI Model
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {CHAT_SELECTABLE_MODELS.map((modelId) => {
                      const info = MODEL_INFO[modelId];
                      const isSelected = modelId === selectedModel;
                      return (
                        <button
                          key={modelId}
                          onClick={() => handleModelSelect(modelId)}
                          className="w-full text-left px-3 py-2.5 transition-all border-b last:border-b-0"
                          style={{
                            background: isSelected ? "rgba(99,102,241,0.1)" : "transparent",
                            borderColor: "var(--border)",
                          }}
                          onMouseOver={(e) => {
                            if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface2)";
                          }}
                          onMouseOut={(e) => {
                            if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {SPEED_ICON[info.speed]}
                                <span className="text-xs font-semibold" style={{ color: isSelected ? "#6366f1" : "var(--text)" }}>
                                  {info.name}
                                </span>
                                {info.badge && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: isSelected ? "rgba(99,102,241,0.2)" : "var(--surface2)", color: isSelected ? "#6366f1" : "var(--text-muted)" }}>
                                    {info.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                {info.description}
                              </div>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                                  📏 {info.contextWindow}
                                </span>
                                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                                  📅 Cutoff: {info.knowledgeCutoff}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                  <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Clear history */}
            <div className="relative">
              <button
                title="Clear chat"
                onClick={() => hasMessages && setShowClearConfirm(true)}
                className="flex items-center justify-center w-7 h-7 rounded-lg border transition-all"
                style={{
                  borderColor: "var(--border)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  opacity: hasMessages ? 1 : 0.4,
                  cursor: hasMessages ? "pointer" : "not-allowed",
                }}
                onMouseOver={(e) => {
                  if (hasMessages) {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--surface2)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                  }
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                }}
              >
                <Trash2 size={13} />
              </button>

              {showClearConfirm && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-2xl z-50 p-3"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>Clear this chat?</p>
                  <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onClearHistory(); setShowClearConfirm(false); }}
                      className="flex-1 text-[10px] font-semibold px-2 py-1.5 rounded-lg border text-red-400"
                      style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)" }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 text-[10px] font-semibold px-2 py-1.5 rounded-lg border"
                      style={{ borderColor: "var(--border)", background: "var(--surface2)", color: "var(--text)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="relative flex-1 overflow-y-auto p-4 chat-scroll-container">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-full py-8 gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-1 shadow-lg" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              🎓
            </div>
            <div className="text-center max-w-md">
              <div className="font-bold text-base mb-1.5" style={{ color: "var(--text)" }}>
                Namaste! Main hoon aapka AI Mentor 🙏
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Koi bhi sawaal poochho — computers, programming, AI, ya career ke baare mein.
                <br />
                Main Hinglish mein samjhaunga, simple aur clear!
              </div>
              <div className="mt-2 text-[10px] px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                <Sparkles size={10} /> Using: {currentModelInfo.name}
              </div>
            </div>

            <div className="w-full max-w-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-center mb-3" style={{ color: "var(--text-muted)" }}>
                Try asking
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="chat-suggestion-chip"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {chatHistory.map((msg, idx) => {
          const isUser = msg.role === "user";
          const msgModelInfo = msg.model ? MODEL_INFO[msg.model as ModelId] : null;
          const isCopied = copiedIdx === idx;
          return (
            <div key={idx} className={`chat-message-row ${isUser ? "user" : "ai"}`}>
              <div className="chat-avatar">
                {isUser ? <User size={12} color="#fff" /> : <Bot size={12} color="#6366f1" />}
              </div>

              <div className="chat-message-stack">
                <div className={isUser ? "chat-bubble-user" : "chat-bubble-ai"}>
                  {isUser ? (
                    msg.content
                  ) : (
                    <MarkdownViewer text={msg.content} />
                  )}
                </div>

                <div className="chat-message-footer">
                  <span className="chat-message-time">
                    {new Date(msg.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {!isUser && msgModelInfo && (
                    <span className="chat-message-badge">{msgModelInfo.name}</span>
                  )}
                  {!isUser && (
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      title="Copy response"
                      className="chat-message-copy"
                    >
                      {isCopied ? <Check size={10} /> : <Copy size={10} />}
                      {isCopied ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="chat-message-row ai">
            <div className="chat-avatar">
              <Bot size={12} color="#6366f1" />
            </div>
            <div className="chat-message-stack">
              <div className="chat-bubble-ai flex items-center gap-3 px-4 py-3.5">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
                <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>
                  {currentModelInfo.name} is thinking…
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="chat-scroll-down"
          title="Scroll to latest"
        >
          <ArrowDown size={14} />
        </button>
      )}

      {/* Input area */}
      <div
        className="flex-shrink-0 border-t"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="px-4 py-3">
          <div className="chat-input-composer">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Apna sawaal yahaan likhein…"
              rows={1}
              className="chat-input-textarea"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="chat-input-send"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="chat-input-footer">
            <span>Enter to send · Shift+Enter for new line</span>
            <span className="flex items-center gap-1">
              {SPEED_ICON[currentModelInfo.speed]}
              {currentModelInfo.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
