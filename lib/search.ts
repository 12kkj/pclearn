// ============================================================
// Search Library - DuckDuckGo + Wikipedia API
// ============================================================
import type { WebResult } from "@/types";
import * as cheerio from "cheerio";

function scoreWebResult(item: WebResult, query: string): number {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  let score = 0;

  if (text.includes("tutorial") || text.includes("beginner") || text.includes("guide") || text.includes("basics") || text.includes("explained")) score += 2;
  if (text.includes("computer") || text.includes("hardware") || text.includes("software") || text.includes("device") || text.includes("mobile")) score += 2;
  if (text.includes("simple") || text.includes("easy") || text.includes("for beginners") || text.includes("learning")) score += 1;
  if (text.includes("blog") || text.includes("article") || text.includes("post")) score += 1;
  if (normalizedQuery.includes("hardware") && text.includes("hardware")) score += 2;
  if (normalizedQuery.includes("software") && text.includes("software")) score += 2;
  if (normalizedQuery.includes("device") && (text.includes("device") || text.includes("devices"))) score += 2;
  if (text.includes("wikipedia")) score -= 3;
  if (text.includes("wiki")) score -= 3;
  if (text.includes("python") || text.includes("chess")) score -= 4;

  return score;
}

function filterUsefulWebResults(items: WebResult[], query: string): WebResult[] {
  return items
    .filter((item) => {
      const url = item.url?.toLowerCase() ?? "";
      if (url.includes("wikipedia.org") || url.includes("wiki")) return false;
      const score = scoreWebResult(item, query);
      return score >= 2 || item.url?.includes("youtube.com") || item.url?.includes("youtu.be");
    })
    .sort((a, b) => scoreWebResult(b, query) - scoreWebResult(a, query));
}

function normalizeDuckDuckGoUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const uddg = url.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function extractDuckDuckGoResults(html: string, maxResults = 5): WebResult[] {
  const $ = cheerio.load(html);
  const selectors = [".result__body", ".result", "li.result", ".web-result"];

  for (const selector of selectors) {
    const elements = $(selector);
    if (!elements.length) continue;

    const items: WebResult[] = [];
    for (const el of elements.toArray().slice(0, maxResults)) {
      const titleEl = $(el).find(".result__a, h2 a, .result__title, .result-title, a").first();
      const title = titleEl.text().trim();
      const href = titleEl.attr("href") ?? "";
      const description = $(el).find(".result__snippet, .result__content, .snippet, .result-snippet").first().text().trim();

      if (title && href) {
        items.push({
          title: title || "Untitled",
          url: normalizeDuckDuckGoUrl(href),
          description,
          source: "duckduckgo" as const,
        });
      }
    }

    if (items.length > 0) return items;
  }

  return [];
}

/** Search DuckDuckGo with a resilient HTML fallback */
async function searchDuckDuckGo(query: string, maxResults = 5): Promise<WebResult[]> {
  const encoded = encodeURIComponent(query);
  const endpoints = [
    `https://html.duckduckgo.com/html/?q=${encoded}`,
    `https://duckduckgo.com/html/?q=${encoded}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const html = await res.text();
      const items = extractDuckDuckGoResults(html, maxResults);
      if (items.length > 0) {
        return filterUsefulWebResults(items, query);
      }
    } catch (err) {
      console.warn(`[DuckDuckGo] fallback failed for ${url}:`, err);
    }
  }

  return [];
}

/** Search Wikipedia REST API (MediaWiki REST v1 search endpoint) */
async function searchWikipedia(query: string, maxResults = 3): Promise<WebResult[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encoded}&limit=${maxResults}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ComputerSkillsAcademy/2.0 (educational tutoring app)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return filterUsefulWebResults((data.pages ?? []).slice(0, maxResults).map((p: any) => ({
      title: p.title ?? "Untitled",
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key ?? p.title ?? "")}`,
      description: (p.excerpt ?? p.description ?? "").replace(/<[^>]+>/g, ""),
      source: "wikipedia" as const,
    })), query);
  } catch (err) {
    console.error("[Wikipedia] Search failed:", err);
    return [];
  }
}

/** Search via self-hosted SearXNG instance (privacy-respecting meta-search) */
async function searchSearXNG(query: string, maxResults = 5): Promise<WebResult[]> {
  try {
    // Try multiple public SearXNG instances
    const instances = [
      "https://search.inetol.net/search",
      "https://search.bus-hit.me/search",
      "https://search.sapti.me/search",
    ];

    for (const base of instances) {
      try {
        const url = `${base}?q=${encodeURIComponent(query)}&format=json&categories=general&language=en`;
        const res = await fetch(url, {
          headers: { "User-Agent": "ComputerSkillsAcademy/2.0" },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const results = filterUsefulWebResults((data.results ?? []).slice(0, maxResults).map((r: Record<string, unknown>) => ({
          title: (r.title as string) ?? "Untitled",
          url: (r.url as string) ?? "",
          description: (r.content as string) ?? "",
          source: "searxng" as const,
        })), query);
        if (results.length > 0) return results;
      } catch {
        continue; // try next instance
      }
    }
    return [];
  } catch (err) {
    console.error("[SearXNG] Search failed:", err);
    return [];
  }
}

/**
 * Perform a combined web search using DuckDuckGo + Wikipedia + SearXNG.
 * Returns deduplicated results sorted by source priority.
 */
export async function searchWeb(query: string, maxTotal = 8): Promise<WebResult[]> {
  const [ddgResult, wikiResult, searxngResult] = await Promise.allSettled([
    searchDuckDuckGo(query, Math.ceil(maxTotal * 0.4)),
    searchWikipedia(query, Math.ceil(maxTotal * 0.25)),
    searchSearXNG(query, Math.ceil(maxTotal * 0.35)),
  ]);

  const ddg = ddgResult.status === "fulfilled" ? ddgResult.value : [];
  const wiki = wikiResult.status === "fulfilled" ? wikiResult.value : [];
  const searxng = searxngResult.status === "fulfilled" ? searxngResult.value : [];

  // Deduplicate by URL — DDG first (highest priority), then Wikipedia, then SearXNG
  const seen = new Set<string>();
  const combined: WebResult[] = [];
  for (const item of [...ddg, ...wiki, ...searxng]) {
    if (item.url && !seen.has(item.url)) {
      seen.add(item.url);
      combined.push(item);
    }
  }
  return combined.slice(0, maxTotal);
}

/** SearXNG-only search — useful for tech news where DDG may be slow */
export async function searchSearXNGOnly(query: string, maxResults = 5): Promise<WebResult[]> {
  return searchSearXNG(query, maxResults);
}
