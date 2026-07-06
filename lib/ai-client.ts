// ============================================================
// Computer Skills Academy - NVIDIA NIM AI Client
// ============================================================
import OpenAI from "openai";
import { NVIDIA_BASE_URL, MIMO_BASE_URL, MODEL_PARAMS, MODEL_PROVIDER } from "@/constants/models";
import type { ModelId, Provider } from "@/constants/models";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const MIMO_API_KEY = process.env.MIMO_API_KEY;

/** Lazily-initialized clients per provider */
const _clients: Partial<Record<Provider, OpenAI>> = {};

function getClient(provider: Provider = "nvidia"): OpenAI {
  if (!_clients[provider]) {
    if (provider === "mimo") {
      if (!MIMO_API_KEY) {
        throw new Error(
          "[ai-client] MIMO_API_KEY is not set. " +
          "Add it to .env.local or your environment variables."
        );
      }
      _clients.mimo = new OpenAI({ apiKey: MIMO_API_KEY, baseURL: MIMO_BASE_URL });
    } else {
      if (!NVIDIA_API_KEY) {
        throw new Error(
          "[ai-client] NVIDIA_API_KEY is not set. " +
          "Add it to .env.local or your environment variables."
        );
      }
      _clients.nvidia = new OpenAI({ apiKey: NVIDIA_API_KEY, baseURL: NVIDIA_BASE_URL });
    }
  }
  return _clients[provider]!;
}

export type Message = { role: "system" | "user" | "assistant"; content: string };

export interface CompletionOptions {
  model: ModelId;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface StreamOptions {
  model: ModelId;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

// ─── Retry configuration ──────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/** Check if an error is transient (rate limit, timeout, network) and worth retrying */
function isRetryable(err: any): boolean {
  const status = err?.status ?? err?.statusCode ?? err?.response?.status;
  if (status === 429 || status === 502 || status === 503 || status === 504) return true;
  if (err?.code === "ECONNRESET" || err?.code === "ETIMEDOUT" || err?.code === "ECONNREFUSED") return true;
  if (err?.message?.includes("timeout") || err?.message?.includes("network")) return true;
  return false;
}

/**
 * Non-streaming completion — returns the full response text.
 * Retries up to MAX_RETRIES times on transient errors.
 */
export async function runCompletion(opts: CompletionOptions): Promise<string> {
  const { model, messages, jsonMode = false, maxTokens, temperature } = opts;
  const params = MODEL_PARAMS[model];
  const provider = MODEL_PROVIDER[model] ?? "nvidia";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = getClient(provider);
      const res = await client.chat.completions.create(
        {
          model,
          messages,
          temperature: temperature ?? params.temperature,
          top_p: params.top_p,
          max_tokens: maxTokens ?? params.max_tokens,
          stream: false,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          ...(params.extra ?? {}),
        } as Parameters<typeof client.chat.completions.create>[0],
        { timeout: 90_000 },
      );
      // Log reasoning content server-side only — never expose to users
      const completion = "choices" in res ? res : null;
      const message = completion?.choices?.[0]?.message as Record<string, unknown> | undefined;
      const reasoning = (message?.reasoning_content ?? message?.reasoning) as string | undefined;
      if (reasoning) console.log("[ai-client] reasoning:", reasoning.slice(0, 500));
      return (message?.content as string | undefined) ?? "";
    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        console.warn(`[ai-client] attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS * (attempt + 1)}ms...`);
        await delay(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error("runCompletion: unknown error after retries");
}

/**
 * Streaming completion — returns a ReadableStream<Uint8Array> for Next.js response piping.
 * Includes both reasoning/thinking tokens and visible content from the model.
 * Retries up to MAX_RETRIES times on transient errors.
 */
export function runStreamingCompletion(opts: StreamOptions): ReadableStream<Uint8Array> {
  const { model, messages, maxTokens, temperature } = opts;
  const params = MODEL_PARAMS[model];
  const provider = MODEL_PROVIDER[model] ?? "nvidia";
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const client = getClient(provider);
          const stream = await client.chat.completions.create(
            {
              model,
              messages,
              temperature: temperature ?? params.temperature,
              top_p: params.top_p,
              max_tokens: maxTokens ?? params.max_tokens,
              stream: true,
              ...(params.extra ?? {}),
            } as Parameters<typeof client.chat.completions.create>[0],
          );

          const streamIterator = stream as unknown as AsyncIterable<{
            choices?: Array<{
              delta?: Record<string, unknown>;
            }>;
          }>;

          for await (const chunk of streamIterator) {
            const delta = chunk.choices?.[0]?.delta as Record<string, unknown> | undefined;
            if (!delta) continue;
            // Log reasoning tokens server-side only — never send to client
            const reasoning = (delta.reasoning_content ?? delta.reasoning) as string | undefined;
            if (reasoning) process.stdout.write("[think]");
            // Only send visible content to the user
            const content = delta.content as string | undefined;
            if (content) controller.enqueue(encoder.encode(content));
          }
          controller.close();
          return; // success — exit the retry loop
        } catch (err: any) {
          lastError = err;
          if (attempt < MAX_RETRIES && isRetryable(err)) {
            console.warn(`[ai-client] stream attempt ${attempt + 1} failed, retrying...`);
            await delay(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }
          console.error("[runStreamingCompletion] error:", err);
        }
      }
      // All retries exhausted or non-retryable error
      if (lastError) controller.error(lastError);
      else controller.close();
    },
  });
}
