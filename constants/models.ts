// ============================================================
// Computer Skills Academy - AI Model Registry
// ============================================================

export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const MIMO_BASE_URL = "https://opencode.ai/zen/v1";

/** All available AI models */
export const MODELS = {
  QWEN_3_5_122B: "qwen/qwen3.5-122b-a10b",
  NEMOTRON_ULTRA: "nvidia/nemotron-3-ultra-550b-a55b",
  NEMOTRON_SUPER: "nvidia/nemotron-3-super-120b-a12b",
  GPT_OSS_120B: "openai/gpt-oss-120b",
  MINIMAX_M3: "minimaxai/minimax-m3",
  STEP_3_7_FLASH: "stepfun-ai/step-3.7-flash",
  MIMO_V25: "mimo-v2.5-free",
} as const;

/** Which provider each model uses */
export type Provider = "nvidia" | "mimo";
export const MODEL_PROVIDER: Record<ModelId, Provider> = {
  ["qwen/qwen3.5-122b-a10b"]: "nvidia",
  ["nvidia/nemotron-3-ultra-550b-a55b"]: "nvidia",
  ["nvidia/nemotron-3-super-120b-a12b"]: "nvidia",
  ["openai/gpt-oss-120b"]: "nvidia",
  ["minimaxai/minimax-m3"]: "nvidia",
  ["stepfun-ai/step-3.7-flash"]: "nvidia",
  ["mimo-v2.5-free"]: "mimo",
};

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

/** Model info shown in chat model picker */
export const MODEL_INFO: Record<
  ModelId,
  {
    name: string;
    description: string;
    contextWindow: string;
    knowledgeCutoff: string;
    strengths: string[];
    speed: "fast" | "medium" | "slow";
    badge?: string;
  }
> = {
  [MODELS.QWEN_3_5_122B]: {
    name: "Qwen 3.5 122B",
    description: "122B MoE (10B active) · 16K context · Thinking + reasoning",
    contextWindow: "16K tokens",
    knowledgeCutoff: "Unknown",
    strengths: ["lesson generation", "thinking", "coding", "reasoning"],
    speed: "fast",
    badge: "Recommended",
  },
  [MODELS.NEMOTRON_ULTRA]: {
    name: "Nemotron Ultra 550B",
    description: "550B hybrid Mamba-Transformer · Frontier reasoning",
    contextWindow: "1M tokens",
    knowledgeCutoff: "Feb 2025",
    strengths: ["deep reasoning", "evaluation", "agentic", "planning"],
    speed: "slow",
    badge: "Most Powerful",
  },
  [MODELS.NEMOTRON_SUPER]: {
    name: "Nemotron Super 120B",
    description: "120B hybrid MoE · 1M context · Coding & reasoning",
    contextWindow: "1M tokens",
    knowledgeCutoff: "Jun 2024",
    strengths: ["coding", "reasoning", "long context", "chat"],
    speed: "medium",
  },
  [MODELS.GPT_OSS_120B]: {
    name: "GPT-OSS 120B",
    description: "120B MoE reasoning LLM · Chat & instruction following",
    contextWindow: "128K tokens",
    knowledgeCutoff: "Unknown",
    strengths: ["chat", "instruction following", "mentoring"],
    speed: "medium",
    badge: "Default Chat",
  },
  [MODELS.MINIMAX_M3]: {
    name: "MiniMax M3",
    description: "Multimodal MoE · Reasoning + coding + tool-calling",
    contextWindow: "128K tokens",
    knowledgeCutoff: "Jan 2026",
    strengths: ["quiz generation", "reasoning", "coding", "multimodal"],
    speed: "medium",
    badge: "Latest Cutoff",
  },
  [MODELS.STEP_3_7_FLASH]: {
    name: "Step 3.7 Flash",
    description: "Sparse MoE multimodal · Agents + coding + vision",
    contextWindow: "256K tokens",
    knowledgeCutoff: "Sep 2021",
    strengths: ["summarization", "multimodal", "coding", "vision"],
    speed: "fast",
  },
  [MODELS.MIMO_V25]: {
    name: "Mimo v2.5",
    description: "Deep reasoning · Coding & debugging · Tool calling",
    contextWindow: "32K tokens",
    knowledgeCutoff: "Early 2025",
    strengths: ["coding", "debugging", "reasoning", "tool calling", "production code"],
    speed: "fast",
    badge: "Fast & Smart",
  },
};

/** Task → Model routing */
export const MODEL_ASSIGNMENTS = {
  lesson: MODELS.MIMO_V25,
  quiz: MODELS.MIMO_V25,
  evaluate: MODELS.NEMOTRON_ULTRA,
  chat: MODELS.GPT_OSS_120B,
  summarize: MODELS.MIMO_V25
} as const satisfies Record<string, ModelId>;

/** Per-model generation parameters — matched to official NVIDIA NIM samples */
export const MODEL_PARAMS: Record<
  ModelId,
  {
    temperature: number;
    top_p: number;
    max_tokens: number;
    extra?: Record<string, unknown>;
  }
> = {
  // 122B MoE (10B active) · thinking enabled via chat_template_kwargs
  [MODELS.QWEN_3_5_122B]: {
    temperature: 0.6,
    top_p: 0.95,
    max_tokens: 16384,
    extra: { chat_template_kwargs: { enable_thinking: true } },
  },
  // 550B hybrid Mamba-Transformer · 1M context · reasoning_budget + thinking
  [MODELS.NEMOTRON_ULTRA]: {
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    extra: {
      reasoning_budget: 16384,
      chat_template_kwargs: { enable_thinking: true },
    },
  },
  // 120B hybrid MoE · 1M context · reasoning_budget + thinking
  [MODELS.NEMOTRON_SUPER]: {
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    extra: {
      reasoning_budget: 16384,
      chat_template_kwargs: { enable_thinking: true },
    },
  },
  // 120B MoE reasoning LLM · reasoning_content built-in (no toggle needed)
  [MODELS.GPT_OSS_120B]: {
    temperature: 1,
    top_p: 1.0,
    max_tokens: 4096,
    // No thinking toggle — model reasons by default, extract reasoning_content
  },
  // Multimodal MoE · thinking_mode DISABLED per official sample
  [MODELS.MINIMAX_M3]: {
    temperature: 1,
    top_p: 0.95,
    max_tokens: 8192,
    extra: { chat_template_kwargs: { thinking_mode: "disabled" } },
  },
  // Sparse MoE multimodal · no thinking params per official sample
  [MODELS.STEP_3_7_FLASH]: {
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
  },
  // Diffusion-based 26B LLM · parallel token generation + thinking
  // Mimo v2.5 · fast reasoning + tool calling · OpenCode Zen provider
  [MODELS.MIMO_V25]: {
    temperature: 0.2,
    top_p: 0.95,
    max_tokens: 16384,
  },
};

/** All models available for user chat selection */
export const CHAT_SELECTABLE_MODELS: ModelId[] = [
  MODELS.GPT_OSS_120B,
  MODELS.QWEN_3_5_122B,
  MODELS.NEMOTRON_ULTRA,
  MODELS.NEMOTRON_SUPER,
  MODELS.MINIMAX_M3,
  MODELS.STEP_3_7_FLASH,
  MODELS.MIMO_V25,
];
