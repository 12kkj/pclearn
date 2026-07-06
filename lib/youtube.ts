// ============================================================
// YouTube Library - Search + Transcript + Summarization
// ============================================================
import type { YouTubeResult } from "@/types";
import { runCompletion } from "@/lib/ai-client";
import { MODEL_ASSIGNMENTS } from "@/constants/models";

const YT_API_KEY = process.env.YOUTUBE_API_KEY ?? "";

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchQueries(topic: string, language: "en" | "hi") {
  const base = topic.trim();
  if (!base) return [];

  const normalized = normalizeSearchText(base);
  const queries = new Set<string>();

  const topicVariants = [
    base,
    `${base} explained simply`,
    `${base} beginner tutorial`,
    `${base} for beginners`,
    `${base} with examples`,
    `${base} in simple words`,
    `${base} step by step`,
    `${base} basics`,
    `${base} full course`,
    `${base} 10 minutes`,
  ];

  topicVariants.forEach((query) => queries.add(query));

  if (normalized.includes("hardware") || normalized.includes("software") || normalized.includes("computer")) {
    queries.add(`${base} hardware software explained simply beginner`);
    queries.add(`${base} hardware vs software explained simply beginner`);
    queries.add(`${base} computer basics beginner`);
    queries.add(`${base} basics for absolute beginners`);
  }

  if (normalized.includes("hardware") && normalized.includes("software")) {
    queries.add(`${base} difference hardware software beginner`);
  }

  const finalQueries = [...queries];
  if (language === "hi") {
    return finalQueries.flatMap((query) => [
      `${query} hindi hinglish`,
      `${query} हिंदी`,
      `${query} tutorial hindi`,
      `${query} आसान explanation`,
    ]).filter(Boolean).slice(0, 10);
  }

  return finalQueries.slice(0, 8);
}

function scoreSearchResult(result: YouTubeResult, topic: string): number {
  const text = normalizeSearchText(`${result.title} ${result.description}`);
  const normalizedTopic = normalizeSearchText(topic);
  let score = 0;

  if (text.includes(normalizedTopic)) score += 5;
  for (const token of normalizedTopic.split(" ").filter(Boolean).slice(0, 6)) {
    if (text.includes(token)) score += 1;
  }

  if ((normalizedTopic.includes("hardware") || normalizedTopic.includes("software")) && text.includes("hardware")) score += 2;
  if ((normalizedTopic.includes("hardware") || normalizedTopic.includes("software")) && text.includes("software")) score += 2;
  if (text.includes("hardware") && text.includes("software")) score += 3;
  if (text.includes("beginner")) score += 1;
  if (text.includes("explained") || text.includes("simple") || text.includes("simply")) score += 1;
  if (text.includes("tutorial")) score += 1;
  if (text.includes("step by step") || text.includes("basics") || text.includes("full course") || text.includes("10 minutes")) score += 1;
  if (text.includes("difference") || text.includes("vs")) score += 1;
  if (text.includes("hindi") || text.includes("hinglish") || text.includes("हिंदी")) score += 0.5;

  return score;
}

async function fetchYouTubeResultsForQuery(query: string, maxResults: number, language: "en" | "hi") {
  if (YT_API_KEY) {
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encoded}&maxResults=${Math.max(3, maxResults)}&type=video&relevanceLanguage=${language === "hi" ? "hi" : "en"}&key=${YT_API_KEY}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        return (data.items ?? []).map((item: any) => ({
          title: item.snippet?.title ?? "Untitled",
          url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
          videoId: item.id?.videoId ?? "",
          description: item.snippet?.description ?? "",
          channelName: item.snippet?.channelTitle ?? "",
          thumbnail:
            item.snippet?.thumbnails?.high?.url ??
            item.snippet?.thumbnails?.default?.url ??
            `https://img.youtube.com/vi/${item.id?.videoId}/hqdefault.jpg`,
        }));
      }
    } catch (err) {
      console.error("[YouTube API] Search failed:", err);
    }
  }

  try {
    const yts = (await import("yt-search")).default;
    const results = await yts(query);
    return (results.videos ?? []).slice(0, Math.max(3, maxResults)).map((v: any) => ({
      title: v.title ?? "Untitled",
      url: v.url ?? `https://www.youtube.com/watch?v=${v.videoId}`,
      videoId: v.videoId ?? "",
      description: v.description ?? "",
      channelName: v.author?.name ?? "",
      thumbnail:
        v.thumbnail ??
        `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.timestamp ?? "",
    }));
  } catch (err) {
    console.error("[yt-search] Fallback failed:", err);
    return [];
  }
}

/** Search YouTube using the Data API v3 (with yt-search fallback) */
export async function searchYouTube(
  query: string,
  maxResults = 3,
): Promise<YouTubeResult[]> {
  const queries = buildSearchQueries(query, "en");
  const seen = new Set<string>();
  const scored: Array<YouTubeResult & { score: number }> = [];

  for (const candidateQuery of queries) {
    const items = await fetchYouTubeResultsForQuery(candidateQuery, Math.max(2, Math.ceil(maxResults / Math.max(1, queries.length))), "en");
    for (const item of items) {
      const key = item.videoId || item.url || item.title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      scored.push({ ...item, score: scoreSearchResult(item, query) });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ score, ...item }) => item);
}

/** Search YouTube specifically for Hindi/Hinglish videos */
export async function searchHindiYouTube(topic: string): Promise<YouTubeResult[]> {
  const queries = buildSearchQueries(topic, "hi");
  const seen = new Set<string>();
  const scored: Array<YouTubeResult & { score: number }> = [];

  for (const candidateQuery of queries) {
    const items = await fetchYouTubeResultsForQuery(candidateQuery, Math.max(2, Math.ceil(3 / Math.max(1, queries.length))), "hi");
    for (const item of items) {
      const key = item.videoId || item.url || item.title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      scored.push({ ...item, score: scoreSearchResult(item, topic) });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score, ...item }) => item);
}

const CLOUDFLARE_TRANSCRIPT_API =
  "https://flat-bird-6bd4.koush3069.workers.dev/api/transcript";

/**
 * Fetch YouTube transcript via Cloudflare Worker proxy.
 * Tries English first, then Hindi, then lets the API auto-select.
 */
export async function fetchTranscriptMultiLang(
  videoId: string,
): Promise<string | null> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const langs = ["en", "hi", ""];

  for (const lang of langs) {
    try {
      const params = new URLSearchParams({ url: videoUrl });
      if (lang) params.set("lang", lang);
      const res = await fetch(`${CLOUDFLARE_TRANSCRIPT_API}?${params.toString()}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const segments: any[] = data.segments ?? [];
      if (segments.length > 0) {
        return segments.map((s: any) => s.text).join(" ");
      }
    } catch {
      // try next lang
    }
  }

  return null;
}

/** Fetch and summarize a YouTube video transcript */
export async function summarizeYouTubeVideo(
  videoId: string,
  videoTitle: string,
): Promise<string> {
  const transcript = await fetchTranscriptMultiLang(videoId);

  if (!transcript || transcript.trim().length < 20) {
    // No captions exist anywhere for this video — be honest about it,
    // but still give the student something useful: a topic overview
    // based on the video title, clearly labeled as NOT a transcript summary.
    try {
      const overview = await runCompletion({
        model: MODEL_ASSIGNMENTS.summarize,
        messages: [
          {
            role: "system",
            content:
              "You are a computer science tutor for Indian students. You could NOT access the video transcript (no captions exist). Based ONLY on the video title, write a short general overview (under 150 words, Indian English, bullet points) of what this topic is likely about, so the student has something useful to read. Be clear this is a general topic overview, not a summary of the actual video content.",
          },
          { role: "user", content: `Video Title: "${videoTitle}"` },
        ],
        temperature: 0.5,
        maxTokens: 350,
      });
      return `⚠️ **No captions found for this video** — the summary below is a general topic overview (based on the title only), not the actual video content.\n\n${overview}\n\n**Please watch the video directly** for the real explanation — the visuals will help a lot!`;
    } catch {
      return "⚠️ **Transcript not available for this video.**\n\nThis can happen when:\n- The video has no captions (manual or auto-generated)\n- The video is too new and captions haven't been processed yet\n- The video is region-restricted\n\n**Please watch the video directly** — the visual explanations will help you understand the topic!";
    }
  }

  // Limit transcript to ~3000 words to stay within token budget
  const truncated = transcript.split(" ").slice(0, 3000).join(" ");

  try {
    const summary = await runCompletion({
      model: MODEL_ASSIGNMENTS.summarize,
      messages: [
        {
          role: "system",
          content:
            "You are an expert educational content summarizer for Indian students learning computer science. Summarize the video transcript in clear, friendly Indian English covering: key concepts, important points, and actionable takeaways. Use bullet points. Keep it under 300 words. If the transcript is in Hindi/Hinglish, translate key points to Indian English while preserving technical terms.",
        },
        {
          role: "user",
          content: `Video Title: "${videoTitle}"\n\nTranscript:\n${truncated}`,
        },
      ],
      temperature: 0.5,
      maxTokens: 600,
    });

    return summary;
  } catch (err: any) {
    console.error("[YouTube Summary] AI failed:", err?.message);
    // Return a truncated raw transcript as fallback
    const fallback = transcript.split(" ").slice(0, 200).join(" ");
    return `📝 **Raw Transcript (first 200 words):**\n\n${fallback}...\n\n*AI summary unavailable, but here's the transcript excerpt.*`;
  }
}
