// ============================================================
// Computer Skills Academy - Daily Tech Briefing Module
// Fetches real-time, out-of-syllabus tech news relevant to each
// day's curriculum. Sources: DuckDuckGo, SearXNG, YouTube.
// ============================================================
import type { DailyTechNewsItem, DailyTechBriefing, TechNewsCategory } from "@/types";
import { searchWeb, searchSearXNGOnly } from "@/lib/search";
import { searchYouTube } from "@/lib/youtube";
import { runCompletion } from "@/lib/ai-client";
import { MODEL_ASSIGNMENTS } from "@/constants/models";
import { getLessonByDay } from "@/lib/curriculum";

// ── Topic-to-Search Query Mapping ─────────────────────────────────────────
// Maps curriculum phase topics to search queries that surface current news

const PHASE_SEARCH_QUERIES: Record<number, string[]> = {
  1: ["latest Windows 11 features 2026", "new computer basics tutorial", "tech literacy news"],
  2: ["Microsoft Office AI features 2026", "Google Workspace updates", "productivity tools new"],
  3: ["new CPU GPU processor 2026", "NVIDIA RTX graphics card latest", "DDR5 RAM NVMe SSD news"],
  4: ["Windows Terminal PowerShell new features", "Linux distro latest release 2026", "networking technology news"],
  5: ["programming algorithms latest tools", "open source programming news 2026", "coding education tools"],
  6: ["Python 3.13 3.14 new features", "AI coding assistant latest", "Python library trending"],
  7: ["C C++ compiler update 2026", "systems programming news", "Rust language latest"],
  8: ["web development framework latest 2026", "JavaScript TypeScript new release", "HTML CSS new features"],
  9: ["database technology new 2026", "SQL NoSQL latest", "backend framework trending"],
  10: ["new AI model released 2026", "open source LLM latest", "machine learning breakthrough", "RAG AI agent news"],
  11: ["Docker Kubernetes update 2026", "cloud computing new service", "DevOps tools trending"],
  12: ["Java 24 25 new features", "Spring Boot latest release", "JVM update news"],
  13: ["React Next.js update 2026", "frontend framework latest", "web framework benchmark 2026"],
  14: ["React Native Flutter update 2026", "mobile app development new", "cross platform framework news"],
  15: ["AWS GCP Azure new service 2026", "serverless computing latest", "cloud infrastructure news"],
  16: ["cybersecurity news latest 2026", "hacking vulnerability discovered", "zero day exploit news"],
  17: ["data science tool new 2026", "Python data analysis latest", "Kaggle competition new"],
  18: ["AI research paper new 2026", "transformer model breakthrough", "open source AI model release"],
  19: ["tech startup funding 2026", "freelancing platform new", "developer career news"],
};

// ── Category Detection ────────────────────────────────────────────────────

function detectCategory(title: string, snippet: string): TechNewsCategory {
  const text = `${title} ${snippet}`.toLowerCase();
  if (/\b(llm|gpt|claude|gemini|llama|mistral|deepseek|language model)\b/.test(text)) return "llm";
  if (/\b(new ai|ai model|artificial intelligence|machine learning|deep learning|neural)\b/.test(text)) return "ai-model";
  if (/\b(open source|github|fossa|linux foundation|apache|mit license)\b/.test(text)) return "open-source";
  if (/\b(cpu|gpu|nvidia|amd|intel|rtx|rx|processor|chip|silicon)\b/.test(text)) return "hardware";
  if (/\b(software|app|release|update|version|patch)\b/.test(text)) return "software";
  if (/\b(tool|ide|editor|extension|plugin|vscode)\b/.test(text)) return "tool";
  if (/\b(website|web platform|saas|online)\b/.test(text)) return "web";
  if (/\b(salary|career|job|interview|hiring|resume)\b/.test(text)) return "career";
  return "general";
}

// ── Core Functions ────────────────────────────────────────────────────────

/** Build search queries for a given day's lesson */
function buildSearchQueries(day: number): string[] {
  const lesson = getLessonByDay(day);
  const phaseQueries = PHASE_SEARCH_QUERIES[lesson?.phase ?? 1] ?? PHASE_SEARCH_QUERIES[1];
  const topicSpecific = lesson?.topics.slice(0, 3).map((t) => `${t} latest news 2026`) ?? [];
  return [...topicSpecific, ...phaseQueries.slice(0, 2)];
}

/** Fetch raw tech news results from web search */
async function fetchRawTechResults(day: number): Promise<DailyTechNewsItem[]> {
  const queries = buildSearchQueries(day);
  const items: DailyTechNewsItem[] = [];

  // Search web for each query in parallel (limited concurrency)
  const batchSize = 3;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((q) => searchWeb(q, 4)));
    for (const queryResults of results) {
      for (const r of queryResults) {
        items.push({
          id: `tech-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: r.title,
          summary: r.description ?? r.snippet ?? "",
          url: r.url,
          source: r.source ?? "web",
          category: detectCategory(r.title, r.description ?? r.snippet ?? ""),
          publishedAt: new Date().toISOString(),
          relevanceScore: 0.5,
          tags: [],
        });
      }
    }
  }

  return items;
}

/** Fetch relevant YouTube tech videos for the day */
async function fetchTechVideos(day: number): Promise<DailyTechNewsItem[]> {
  const lesson = getLessonByDay(day);
  const query = `latest ${lesson?.topics[0] ?? "technology"} news tutorial 2026`;
  try {
    const videos = await searchYouTube(query, 3);
    return videos.map((v) => ({
      id: `yt-${v.videoId}`,
      title: v.title,
      summary: v.description ?? "",
      url: v.url ?? `https://youtube.com/watch?v=${v.videoId}`,
      source: `YouTube: ${v.channelName ?? v.channelTitle ?? "Unknown"}`,
      category: "general" as TechNewsCategory,
      publishedAt: new Date().toISOString(),
      relevanceScore: 0.4,
      tags: [],
    }));
  } catch {
    return [];
  }
}

/** AI-powered curation: pick the best, most relevant items */
async function curateWithAI(
  rawItems: DailyTechNewsItem[],
  day: number,
): Promise<DailyTechNewsItem[]> {
  const lesson = getLessonByDay(day);
  if (rawItems.length === 0) return [];
  if (rawItems.length <= 5) return rawItems;

  // Limit input to top 20 to stay within token budget
  const candidates = rawItems.slice(0, 20);

  const prompt = `You are "Computer Skills Academy", an AI curator selecting the BEST daily tech news for a student learning about: "${lesson?.title ?? "computers"}".

Current curriculum day ${day} covers: ${lesson?.topics.join(", ") ?? "general computing"}.

Below are ${candidates.length} raw news items. Select the TOP 5 most interesting, educational, and relevant items. Prioritize:
1. New AI models, LLMs, open-source releases
2. Hardware news (new GPUs, CPUs, processors)
3. Cool new tools, websites, platforms
4. Fun tech facts
5. Career-relevant industry news

RULES:
- Never pick duplicates or very similar items
- Favor recent/forward-looking content
- Include at least 1 item that is "out of syllabus but exciting"
- Return ONLY valid JSON array

CANDIDATES:
${candidates.map((c, i) => `${i + 1}. [${c.category}] ${c.title}\n   ${c.summary.slice(0, 150)}\n   URL: ${c.url}`).join("\n\n")}

Return ONLY a JSON array (no markdown, no explanation):
[
  { "index": 1, "category": "...", "relevance": 0.9 },
  { "index": 3, "category": "...", "relevance": 0.85 },
  { "index": 5, "category": "...", "relevance": 0.8 },
  { "index": 8, "category": "...", "relevance": 0.75 },
  { "index": 10, "category": "...", "relevance": 0.7 }
]`;

  try {
    const raw = await runCompletion({
      model: MODEL_ASSIGNMENTS.quiz,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      maxTokens: 800,
      jsonMode: true,
    });

    const selections = JSON.parse(raw) as Array<{ index: number; category: string; relevance: number }>;
    return selections
      .filter((s) => s.index >= 1 && s.index <= candidates.length)
      .map((s) => {
        const item = candidates[s.index - 1];
        return {
          ...item,
          category: (s.category as TechNewsCategory) ?? item.category,
          relevanceScore: Math.min(1, Math.max(0, s.relevance)),
        };
      });
  } catch (err) {
    console.error("[DailyTech] AI curation failed, returning top 5 raw:", err);
    return candidates.slice(0, 5);
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Fetch today's tech briefing for a specific curriculum day.
 * Returns curated, real-time tech news that complements the day's lesson.
 */
export async function getDailyTechBriefing(day: number): Promise<DailyTechBriefing> {
  const lesson = getLessonByDay(day);

  // Fetch web results and videos in parallel
  const [rawWeb, rawVideos] = await Promise.all([
    fetchRawTechResults(day),
    fetchTechVideos(day),
  ]);

  const allRaw = [...rawWeb, ...rawVideos];

  // AI-curated selection
  const curated = await curateWithAI(allRaw, day);

  // Pick featured item (highest relevance)
  const featured = curated.reduce(
    (best, item) => (item.relevanceScore > (best?.relevanceScore ?? 0) ? item : best),
    curated[0] as DailyTechNewsItem | undefined,
  );

  return {
    date: new Date().toISOString().split("T")[0],
    items: curated,
    featuredItem: featured,
    relatedLessonDay: day,
  };
}

/**
 * Quick search for a specific tech category (no AI curation — fast).
 * Useful for the "Tech Corner" sidebar widget.
 */
export async function quickTechSearch(
  category: string,
  maxResults = 3,
): Promise<DailyTechNewsItem[]> {
  const queries: Record<string, string> = {
    "ai-model": "new AI model released 2026 latest",
    llm: "large language model open source latest 2026",
    "open-source": "open source software trending 2026",
    hardware: "new GPU CPU processor release 2026",
    tool: "new developer tool software 2026",
    career: "tech career developer news 2026",
  };

  const query = queries[category] ?? `technology ${category} news 2026`;
  const results = await searchSearXNGOnly(query, maxResults);

  return results.map((r) => ({
    id: `quick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: r.title,
    summary: r.description ?? r.snippet ?? "",
    url: r.url,
    source: r.source ?? "web",
    category: (category as TechNewsCategory) ?? "general",
    publishedAt: new Date().toISOString(),
    relevanceScore: 0.5,
    tags: [],
  }));
}
