// ══════════════════════════════════════════════════════════════════════════
// Computer Skills Academy — Telegram Bot v3 (AI-Powered, KV-Cached)
// Runs on Cloudflare Workers with KV cache for instant responses
// Features: AI brain, natural language commands, dual mode (admin/student)
// ══════════════════════════════════════════════════════════════════════════

import { Bot, InlineKeyboard } from "grammy";
import { getDoc, setDoc, updateDoc } from "./firestore";

// ── Config ────────────────────────────────────────────────────────────────

const PASS_THRESHOLD = 67;
const WEB_URL = "https://pclearn.vercel.app";
const CURRICULUM_DOC = "curriculum/data";
const userDoc = (id) => `bot_users/${id}`;

// ── KV Cache Keys & TTLs ─────────────────────────────────────────────────
const KV_CURRICULUM_KEY = "curriculum:v2";
const KV_CURRICULUM_TTL = 300; // 5 minutes (seconds)
const KV_USER_TTL = 60; // 1 minute

// ── In-memory fallback cache (per-isolate) ────────────────────────────────
let _memCurriculum = null;
let _memCurriculumTime = 0;
const MEM_TTL = 60_000; // 60 seconds

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════

function deepParseJson(obj) {
  if (typeof obj === "string") {
    try { return JSON.parse(obj); } catch { return obj; }
  }
  if (Array.isArray(obj)) return obj.map(deepParseJson);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = deepParseJson(v);
    return out;
  }
  return obj;
}

function parseCurriculum(raw) {
  if (!raw) return raw;
  const out = { ...raw };
  if (out.phases) out.phases = (out.phases ?? []).map(p => deepParseJson(p));
  if (out.days) {
    const parsed = {};
    for (const [k, v] of Object.entries(out.days)) parsed[k] = deepParseJson(v);
    out.days = parsed;
  }
  return out;
}

function getSA(env) {
  if (!env.FIREBASE_SA_KEY) throw new Error("FIREBASE_SA_KEY not set");
  return JSON.parse(env.FIREBASE_SA_KEY);
}

function isAdmin(env, userId) {
  const adminIds = (env.ADMIN_TELEGRAM_IDS || "").split(",").map(s => s.trim());
  return adminIds.includes(String(userId));
}

// ══════════════════════════════════════════════════════════════════════════
// KV-POWERED CACHING LAYER
// ══════════════════════════════════════════════════════════════════════════

/**
 * Get data with KV cache → in-memory fallback → Firestore
 */
async function getCachedCurriculum(env) {
  // 1. Try in-memory cache (fastest — sub-ms)
  const now = Date.now();
  if (_memCurriculum && (now - _memCurriculumTime) < MEM_TTL) {
    return _memCurriculum;
  }

  // 2. Try KV cache (~5ms)
  if (env.CACHE) {
    try {
      const cached = await env.CACHE.get(KV_CURRICULUM_KEY, { type: "json" });
      if (cached) {
        console.log("[cache] KV hit for curriculum");
        _memCurriculum = cached;
        _memCurriculumTime = now;
        return cached;
      }
    } catch (e) {
      console.warn("[cache] KV read error:", e.message);
    }
  }

  // 3. Fall back to Firestore REST API (~300-500ms)
  console.log("[cache] Cache miss — loading curriculum from Firestore");
  const sa = getSA(env);
  const projectId = env.FIREBASE_PROJECT_ID;
  const raw = await getDoc(sa, projectId, CURRICULUM_DOC);
  const data = parseCurriculum(raw) || { phases: [], days: {} };

  // Store in both caches
  _memCurriculum = data;
  _memCurriculumTime = now;

  if (env.CACHE) {
    try {
      await env.CACHE.put(KV_CURRICULUM_KEY, JSON.stringify(data), {
        expirationTtl: KV_CURRICULUM_TTL,
      });
    } catch (e) {
      console.warn("[cache] KV write error:", e.message);
    }
  }

  return data;
}

/**
 * Invalidate curriculum cache (called after admin adds/edits content)
 */
async function invalidateCurriculumCache(env) {
  _memCurriculum = null;
  _memCurriculumTime = 0;
  if (env.CACHE) {
    try { await env.CACHE.delete(KV_CURRICULUM_KEY); } catch {}
  }
}

/**
 * Cache a user doc in KV for fast reads
 */
async function getCachedUser(env, userId) {
  const key = `user:${userId}`;

  // 1. Try KV (~5ms)
  if (env.CACHE) {
    try {
      const cached = await env.CACHE.get(key, { type: "json" });
      if (cached) {
        console.log(`[cache] KV hit for user ${userId}`);
        return cached;
      }
    } catch {}
  }

  // 2. Firestore (~300ms)
  const sa = getSA(env);
  const projectId = env.FIREBASE_PROJECT_ID;
  const user = await getDoc(sa, projectId, userDoc(userId));

  if (user && env.CACHE) {
    try {
      await env.CACHE.put(key, JSON.stringify(user), {
        expirationTtl: KV_USER_TTL,
      });
    } catch {}
  }

  return user;
}

/**
 * Write user to Firestore + invalidate KV cache
 */
async function writeUser(env, userId, data) {
  const sa = getSA(env);
  const projectId = env.FIREBASE_PROJECT_ID;
  await setDoc(sa, projectId, userDoc(userId), data);

  // Invalidate KV cache
  if (env.CACHE) {
    try { await env.CACHE.delete(`user:${userId}`); } catch {}
  }
}

/**
 * Update user fields in Firestore + invalidate KV cache
 */
async function updateUser(env, userId, fields) {
  const sa = getSA(env);
  const projectId = env.FIREBASE_PROJECT_ID;
  await updateDoc(sa, projectId, userDoc(userId), fields);

  // Invalidate KV cache
  if (env.CACHE) {
    try { await env.CACHE.delete(`user:${userId}`); } catch {}
  }
}

// ══════════════════════════════════════════════════════════════════════════
// AI BRAIN — Dual mode: Student (simple) vs Admin (full power)
// ══════════════════════════════════════════════════════════════════════════

const STUDENT_SYSTEM_PROMPT = `You are the friendly AI tutor at Computer Skills Academy (CSA).
You help students learn computers, programming, AI, and digital skills.

RULES:
- Keep answers SHORT (2-4 sentences max) unless asked for detail
- Use simple English with Indian context and examples
- Be encouraging and motivating
- Use emojis naturally 🎓📚💡
- If asked about curriculum, say "Use the buttons below to navigate!"
- Never give long lectures — keep it snappy and helpful
- If a student asks about Day X content, give a brief overview and suggest watching the videos
- For coding questions, give a small example
- End with a helpful suggestion like "Try the quiz!" or "Check Day X for more!"
- Use Markdown formatting for Telegram
- Maximum 500 tokens response length`;

const ADMIN_SYSTEM_PROMPT = `You are the powerful AI admin assistant for Computer Skills Academy (CSA).
You help the admin manage the platform, analyze data, and make decisions.

YOUR FULL POWERS:
- Analyze curriculum structure and suggest improvements
- Generate quiz questions for any topic
- Suggest new learning topics and phases
- Help write day descriptions and titles
- Review student engagement patterns
- Create broadcast messages for students
- Answer admin questions about the platform
- Help plan learning paths and progression
- Debug issues and suggest fixes
- Generate content ideas and outlines

RULES:
- Be thorough, detailed, and professional
- Use Markdown formatting
- Provide actionable suggestions
- When generating quiz questions, use this exact format:
  Q: question text
  A: option1|option2|option3|option4
  C: 0
- When suggesting curriculum changes, be specific
- You can reference any part of the system
- Use technical language when appropriate
- Maximum 1024 tokens response length`;

/**
 * Call AI with appropriate system prompt based on user role.
 * Admin gets full power, student gets limited version.
 * Includes 20s timeout and full error logging.
 */
async function callAI(env, prompt, isAdminUser = false, userContext = "") {
  const baseUrl = env.MIMO_BASE_URL || "https://opencode.ai/zen/v1";
  const model = env.MIMO_MODEL || "mimo-v2.5-free";
  const apiKey = env.MIMO_API_KEY || env.NVIDIA_API_KEY || "";

  if (!apiKey) throw new Error("No AI API key configured");

  const systemPrompt = isAdminUser ? ADMIN_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT;
  const maxTokens = isAdminUser ? 1024 : 512;
  const temperature = isAdminUser ? 0.5 : 0.7;

  const messages = [{ role: "system", content: systemPrompt }];
  if (userContext) {
    messages.push({ role: "system", content: `Context about this user:\n${userContext}` });
  }
  messages.push({ role: "user", content: prompt });

  console.log(`[ai] Calling ${baseUrl} model=${model} keyLen=${apiKey.length}`);

  // Primary: Mimo v2.5 (via OpenCode Zen)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        console.log("[ai] Mimo success, length:", content.length);
        return content;
      }
      console.warn("[ai] Mimo empty content:", JSON.stringify(data).slice(0, 200));
      return "I received an empty response. Try asking again!";
    }

    const errBody = await res.text().catch(() => "unreadable");
    console.error("[ai] Mimo failed:", res.status, errBody.slice(0, 300));
  } catch (err) {
    const reason = err.name === "AbortError" ? "timeout (20s)" : err.message;
    console.error("[ai] Mimo error:", reason);
  }

  // Fallback: NVIDIA NIM
  const nvidiaKey = env.NVIDIA_API_KEY || "";
  if (nvidiaKey && nvidiaKey !== apiKey) {
    try {
      console.log("[ai] Trying NVIDIA NIM fallback...");
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 20_000);

      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${nvidiaKey}`,
        },
        body: JSON.stringify({
          model: "nvidia/llama-3.1-nemotron-70b-instruct",
          messages: [
            { role: "system", content: systemPrompt },
            ...(userContext ? [{ role: "system", content: `Context:\n${userContext}` }] : []),
            { role: "user", content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
        signal: controller2.signal,
      });
      clearTimeout(timeout2);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          console.log("[ai] NVIDIA success, length:", content.length);
          return content;
        }
      } else {
        const errBody2 = await res.text().catch(() => "unreadable");
        console.error("[ai] NVIDIA failed:", res.status, errBody2.slice(0, 300));
      }
    } catch (err) {
      const reason = err.name === "AbortError" ? "timeout (20s)" : err.message;
      console.error("[ai] NVIDIA error:", reason);
    }
  }

  throw new Error("All AI models failed — check API keys in Worker secrets");
}

// ══════════════════════════════════════════════════════════════════════════
// NATURAL LANGUAGE INTENT PARSER
// ══════════════════════════════════════════════════════════════════════════

function parseIntent(text) {
  const t = text.toLowerCase().trim();

  // Menu / Home — also match greetings with extra words
  if (/^(menu|home|back|main|start|options)$/i.test(t) ||
      /^(hi|hello|hey|hola|yo|namaste|namaskar)(\s+.*)?$/i.test(t)) {
    return { action: "menu" };
  }

  // Day links: "day 5", "show day 5", "day5 links"
  const dayMatch = t.match(/(?:show\s+|view\s+|open\s+|go\s+to\s+|see\s+|get\s+)?day\s*(\d+)/i);
  if (dayMatch) {
    return { action: "day", params: { day: parseInt(dayMatch[1]) } };
  }

  // Quiz: "quiz", "quiz 5", "test me"
  const quizMatch = t.match(/^(?:quiz|test\s+me|take\s+quiz|start\s+quiz|qa)\s*(\d+)?$/i);
  if (quizMatch) {
    return { action: "quiz", params: { day: quizMatch[1] ? parseInt(quizMatch[1]) : null } };
  }

  // Progress
  if (/^(?:progress|stats|my\s+progress|my\s+stats|score|scores|report)$/i.test(t)) {
    return { action: "progress" };
  }

  // Learning Path
  if (/^(?:path|journey|roadmap|learning\s+path|syllabus)$/i.test(t)) {
    return { action: "path" };
  }

  // Periodic Test
  if (/^(?:periodic|cumulative|mega\s+test|review\s+test|exam)$/i.test(t)) {
    return { action: "test" };
  }

  // Help
  if (/^(?:help|commands|what\s+can\s+you\s+do|usage|menu\s+list)$/i.test(t)) {
    return { action: "help" };
  }

  // Today
  if (/^(?:today|current|my\s+day|now)$/i.test(t)) {
    return { action: "today" };
  }

  // Admin shortcuts
  if (/^(?:admin|panel|dashboard)$/i.test(t)) {
    return { action: "admin" };
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════
// KEYBOARD BUILDERS
// ══════════════════════════════════════════════════════════════════════════

function buildMenuKeyboard(day) {
  return new InlineKeyboard()
    .text("📚 Today's Links", `day_${day}`)
    .row()
    .text("🧪 Take Quiz", `quiz_${day}`)
    .row()
    .text("🤖 Ask AI", "ai_chat")
    .row()
    .text("📊 My Progress", "progress")
    .text("🗺️ Learning Path", "path");
}

function buildDayKeyboard(day) {
  return new InlineKeyboard()
    .url(`📖 Watch in Browser`, `${WEB_URL}/?day=${day}`)
    .row()
    .url(`🧪 Quiz in Browser`, `${WEB_URL}/?day=${day}&quiz=true`)
    .row()
    .text("🧪 Take Quiz here", `quiz_${day}`)
    .row()
    .text("🤖 Ask AI about this", `ask_day_${day}`)
    .row()
    .text("◀️ Back to Menu", "back_menu");
}

function buildContextKeyboard() {
  return new InlineKeyboard()
    .text("📚 Menu", "back_menu")
    .text("📊 Progress", "progress")
    .row()
    .text("🧪 Quiz", "quiz_1")
    .text("🗺️ Path", "path");
}

// ══════════════════════════════════════════════════════════════════════════
// FORMATTED DAY MESSAGE (shared between callback & intent)
// ══════════════════════════════════════════════════════════════════════════

function formatDayMessage(day, dayData, isCompleted) {
  let msg = `📅 *Day ${day}: ${dayData.title || "Untitled"}*\n`;
  if (isCompleted) msg += `✅ *Completed*\n`;
  if (dayData.description) msg += `📋 ${dayData.description}\n`;
  msg += `\n`;

  const resources = dayData.resources || [];
  resources.forEach((link, i) => {
    const icon = link.type === "youtube" ? "🎬" : "🔗";
    msg += `${icon} [${link.title || link.url}](${link.url})\n`;
  });

  if (resources.length === 0) msg += `_No links yet._\n`;

  return msg;
}

// ══════════════════════════════════════════════════════════════════════════
// BOT SETUP
// ══════════════════════════════════════════════════════════════════════════

function createBot(env) {
  const bot = new Bot(env.BOT_TOKEN);

  // ══════════════════════════════════════════════════════════════════════
  // /start — Welcome + show current day
  // ══════════════════════════════════════════════════════════════════════

  bot.command("start", async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      let user = await getCachedUser(env, userId);

      if (!user) {
        user = {
          telegramId: userId,
          name: ctx.from.first_name || "Learner",
          currentDay: 1,
          completedDays: [],
          scores: {},
          totalXp: 0,
          streak: 0,
          lastActiveDate: "",
          createdAt: new Date().toISOString(),
        };
        await writeUser(env, userId, user);
      }

      const curriculum = await getCachedCurriculum(env);
      const days = curriculum?.days ?? {};
      const totalDays = Object.keys(days).length || 0;
      const day = user.currentDay;
      const completed = user.completedDays?.length || 0;
      const pct = totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;

      const kb = buildMenuKeyboard(day);
      const adminTag = isAdmin(env, userId) ? "\n🔐 _Admin mode available_" : "";

      await ctx.reply(
        `🎓 *Computer Skills Academy*\n\n` +
        `Welcome back, *${user.name}*!\n\n` +
        `📅 You're on *Day ${day}*${totalDays > 0 ? ` of ${totalDays}` : ""}\n` +
        `✅ Completed: ${completed} days (${pct}%)\n` +
        `🔥 Streak: ${user.streak || 0} days\n` +
        `⭐ XP: ${user.totalXp || 0}${adminTag}\n\n` +
        `💡 _Tip: Just type naturally! Try "day 5", "quiz me", or ask me anything!_`,
        { parse_mode: "Markdown", reply_markup: kb }
      );
    } catch (err) {
      console.error("[start] Error:", err.message);
      await ctx.reply("❌ Something went wrong. Type /start to try again.").catch(() => {});
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  // Slash commands
  // ══════════════════════════════════════════════════════════════════════

  bot.command("day", async (ctx) => {
    const userId = String(ctx.from.id);
    const user = await getCachedUser(env, userId);
    if (!user) return ctx.reply("Send /start first! 🎓");
    await sendDayLinks(ctx, env, user.currentDay, user);
  });

  bot.command("test", async (ctx) => {
    await handlePeriodicTest(ctx, env);
  });

  bot.command("admin", async (ctx) => {
    await showAdminPanel(ctx, env);
  });

  // ══════════════════════════════════════════════════════════════════════
  // CALLBACK: Day Links — THE MISSING HANDLER (was causing slow/fail)
  // ══════════════════════════════════════════════════════════════════════

  bot.callbackQuery(/^day_(\d+)$/, async (ctx) => {
    const day = parseInt(ctx.match[1]);
    const userId = String(ctx.from.id);
    await ctx.answerCallbackQuery(); // Instant acknowledgement — no lag!

    const user = await getCachedUser(env, userId);
    if (!user) {
      return ctx.reply("Send /start first! 🎓");
    }

    await sendDayLinks(ctx, env, day, user);
  });

  // ══════════════════════════════════════════════════════════════════════
  // CALLBACK: Quiz
  // ══════════════════════════════════════════════════════════════════════

  const quizSessions = new Map();

  bot.callbackQuery(/^quiz_(\d+)$/, async (ctx) => {
    const day = parseInt(ctx.match[1]);
    const userId = String(ctx.from.id);
    await ctx.answerCallbackQuery();

    const curriculum = await getCachedCurriculum(env);
    const dayData = curriculum?.days?.[String(day)];
    const questions = dayData?.quiz;

    if (!questions || questions.length === 0) {
      return ctx.reply("🧪 No quiz available for this day yet!");
    }

    quizSessions.set(userId, {
      day, questions, currentQ: 0, correct: 0,
      total: questions.length, answers: [],
    });

    await sendQuizQuestion(ctx, userId);
  });

  // ══════════════════════════════════════════════════════════════════════
  // CALLBACK: Quiz Answers
  // ══════════════════════════════════════════════════════════════════════

  bot.callbackQuery(/^answer_(\d+)_(\d+)$/, async (ctx) => {
    const userId = ctx.match[1];
    const answerIdx = parseInt(ctx.match[2]);
    const session = quizSessions.get(userId);

    if (!session) {
      return ctx.answerCallbackQuery("Quiz expired. Type 'quiz' to start again!");
    }
    if (String(ctx.from.id) !== userId) {
      return ctx.answerCallbackQuery("This is not your quiz!");
    }

    const q = session.questions[session.currentQ];
    const correctIdx = q.correctAnswer ?? 0;
    const isCorrect = answerIdx === correctIdx;

    if (isCorrect) session.correct++;
    session.answers.push({ question: session.currentQ, answer: answerIdx, correct: isCorrect });
    session.currentQ++;

    await ctx.answerCallbackQuery(isCorrect ? "✅ Correct!" : "❌ Wrong!");

    const emoji = isCorrect ? "✅" : "❌";
    const correctText = q.options?.[correctIdx] || "Unknown";

    if (session.currentQ < session.total) {
      await ctx.reply(
        `${emoji} *${isCorrect ? "Correct!" : "Wrong!"}*\n` +
        `${!isCorrect ? `Correct answer: *${correctText}*\n` : ""}\n` +
        `_Score: ${session.correct}/${session.currentQ}_`,
        { parse_mode: "Markdown" }
      );
      setTimeout(() => sendQuizQuestion(ctx, userId), 800);
    } else {
      await showQuizResult(ctx, userId, session);
    }
  });

  async function sendQuizQuestion(ctx, userId) {
    const session = quizSessions.get(userId);
    if (!session) return;

    const q = session.questions[session.currentQ];
    const num = session.currentQ + 1;
    const total = session.total;

    const kb = new InlineKeyboard();
    (q.options || []).forEach((opt, i) => {
      kb.text(`${String.fromCharCode(65 + i)}. ${opt}`, `answer_${userId}_${i}`);
      kb.row();
    });

    await ctx.reply(
      `❓ *Question ${num}/${total}*\n\n` +
      `${q.question}\n\n` +
      `_Score so far: ${session.correct}/${num - 1}_`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  }

  async function showQuizResult(ctx, userId, session) {
    const pct = Math.round((session.correct / session.total) * 100);
    const passed = pct >= PASS_THRESHOLD;

    let msg = `📊 *Quiz Results — Day ${session.day}*\n\n`;
    msg += `Score: *${session.correct}/${session.total}* (${pct}%)\n`;
    msg += passed ? `✅ *PASSED!* 🎉\n` : `❌ *Not passed* (need ${PASS_THRESHOLD}%)\n`;

    let nextDay = session.day + 1;

    if (passed) {
      let user = await getCachedUser(env, userId);
      if (user) {
        const completed = [...new Set([...(user.completedDays || []), session.day])];
        const xpGain = pct >= 90 ? 150 : pct >= 70 ? 100 : 50;
        nextDay = session.day + 1;

        await updateUser(env, userId, {
          completedDays: completed,
          currentDay: Math.max(user.currentDay || 1, nextDay),
          totalXp: (user.totalXp || 0) + xpGain,
          [`scores.${session.day}`]: pct,
          lastActiveDate: new Date().toISOString().slice(0, 10),
        });

        msg += `\n⭐ +${xpGain} XP earned!`;

        const curriculum = await getCachedCurriculum(env);
        const nextDayData = curriculum?.days?.[String(nextDay)];
        if (nextDayData) {
          msg += `\n\n🔓 *Day ${nextDay} unlocked!* — _${nextDayData.title || "New content"}_`;
        }

        const testMsg = getPeriodicTestMessage(session.day);
        if (testMsg) msg += `\n\n${testMsg}`;
      }
    }

    const kb = new InlineKeyboard();
    if (passed) {
      const curriculum = await getCachedCurriculum(env);
      if (curriculum?.days?.[String(nextDay)]) {
        kb.url(`📚 Day ${nextDay} — Watch & Learn`, `${WEB_URL}/?day=${nextDay}`);
        kb.row();
        kb.url(`🧪 Day ${nextDay} — Quiz Only`, `${WEB_URL}/?day=${nextDay}&quiz=true`);
        kb.row();
        kb.text(`💬 Show Day ${nextDay} here`, `day_${nextDay}`);
        kb.row();
      }
    } else {
      kb.text(`🔄 Retry Quiz`, `quiz_${session.day}`);
      kb.row();
      kb.url(`🧪 Quiz in Browser`, `${WEB_URL}/?day=${session.day}&quiz=true`);
      kb.row();
      kb.text(`📚 Re-watch Videos`, `day_${session.day}`);
      kb.row();
    }
    kb.text("🏠 Menu", "back_menu");

    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: kb });
    quizSessions.delete(userId);
  }

  // ══════════════════════════════════════════════════════════════════════
  // CALLBACK: AI Chat button
  // ══════════════════════════════════════════════════════════════════════

  bot.callbackQuery("ai_chat", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `🤖 *AI Tutor*\n\n` +
      `Just type your question! I understand natural language.\n\n` +
      `Try:\n` +
      `• "What are Python variables?"\n` +
      `• "Explain Day 5 topic"\n` +
      `• "Give me a practice exercise"\n` +
      `• "Summarize what I learned today"`,
      { parse_mode: "Markdown" }
    );
  });

  bot.callbackQuery(/^ask_day_(\d+)$/, async (ctx) => {
    const day = parseInt(ctx.match[1]);
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `🤖 *AI Tutor — Day ${day}*\n\n` +
      `Ask me anything about Day ${day}'s topic!\n` +
      `I'll help you understand the videos and concepts.`,
      { parse_mode: "Markdown" }
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  // CALLBACK: Back to Menu
  // ══════════════════════════════════════════════════════════════════════

  bot.callbackQuery("back_menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from.id);

    const user = await getCachedUser(env, userId);
    if (!user) {
      return ctx.reply("Send /start to begin! 🎓");
    }

    const curriculum = await getCachedCurriculum(env);
    const totalDays = Object.keys(curriculum?.days ?? {}).length || 0;
    const day = user.currentDay;
    const completed = user.completedDays?.length || 0;
    const kb = buildMenuKeyboard(day);

    await ctx.reply(
      `🎓 *Computer Skills Academy*\n\n` +
      `Welcome, *${user.name}*!\n\n` +
      `📅 Day *${day}*${totalDays > 0 ? ` of ${totalDays}` : ""} | ✅ ${completed} done | ⭐ ${user.totalXp || 0} XP`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  // MAIN TEXT HANDLER — AI Brain with Intent Parsing
  // ══════════════════════════════════════════════════════════════════════

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const userId = String(ctx.from.id);

    if (text.startsWith("/")) return;

    // Check quiz session
    const session = quizSessions.get(userId);
    if (session) {
      return ctx.reply("Please use the buttons above to answer the quiz! 🎯");
    }

    const isUserAdmin = isAdmin(env, userId);

    // Step 1: Fast intent parsing
    const intent = parseIntent(text);
    if (intent) {
      await handleIntent(ctx, env, intent, userId);
      return;
    }

    // Step 2: No pattern match → send to AI
    await ctx.replyWithChatAction("typing");

    try {
      const user = await getCachedUser(env, userId);
      const curriculum = await getCachedCurriculum(env);

      let userContext = "";
      if (user) {
        const totalDays = Object.keys(curriculum?.days ?? {}).length || 0;
        userContext = [
          `Student: ${user.name || "Unknown"}`,
          `Current Day: ${user.currentDay}`,
          `Completed: ${(user.completedDays || []).join(", ") || "none"}`,
          `Total Days in Curriculum: ${totalDays}`,
          `XP: ${user.totalXp || 0}`,
          `Streak: ${user.streak || 0}`,
          `Role: ${isUserAdmin ? "ADMIN" : "Student"}`,
        ].join("\n");
      }

      const aiResponse = await callAI(env, text, isUserAdmin, userContext);
      const badge = isUserAdmin ? "🤖 *Admin AI*" : "🤖 *AI Tutor*";

      await ctx.reply(`${badge}\n\n${aiResponse}`, {
        parse_mode: "Markdown",
        reply_markup: buildContextKeyboard(),
      });
    } catch (err) {
      console.error("[text] AI error:", err.message);
      await ctx.reply(
        "🤖 AI is temporarily unavailable. Try again in a moment!\n\n" +
        "💡 _You can also type: menu, day 1, quiz, progress, help_",
        { parse_mode: "Markdown" }
      );
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  // INTENT HANDLER — Routes parsed intents to actions
  // ══════════════════════════════════════════════════════════════════════

  async function handleIntent(ctx, env, intent, userId) {
    try {
      switch (intent.action) {
        case "menu": {
          const user = await getCachedUser(env, userId);
          if (!user) {
            return ctx.reply("Send /start to begin! 🎓");
          }
          const curriculum = await getCachedCurriculum(env);
          const totalDays = Object.keys(curriculum?.days ?? {}).length || 0;
          const day = user.currentDay;
          const completed = user.completedDays?.length || 0;
          const kb = buildMenuKeyboard(day);
          await ctx.reply(
            `🎓 *Computer Skills Academy*\n\n` +
            `📅 Day *${day}*${totalDays > 0 ? ` of ${totalDays}` : ""} | ✅ ${completed} done | ⭐ ${user.totalXp || 0} XP`,
            { parse_mode: "Markdown", reply_markup: kb }
          );
          break;
        }

        case "day": {
          const user = await getCachedUser(env, userId);
          if (!user) return ctx.reply("Send /start first! 🎓");
          await sendDayLinks(ctx, env, intent.params.day, user);
          break;
        }

        case "today": {
          const user = await getCachedUser(env, userId);
          if (!user) return ctx.reply("Send /start first! 🎓");
          await sendDayLinks(ctx, env, user.currentDay, user);
          break;
        }

        case "quiz": {
          const user = await getCachedUser(env, userId);
          if (!user) return ctx.reply("Send /start first! 🎓");
          const dayNum = intent.params.day || user.currentDay;
          await startQuiz(ctx, env, dayNum);
          break;
        }

        case "progress": {
          await showProgress(ctx, env, userId);
          break;
        }

        case "path": {
          await showLearningPath(ctx, env, userId);
          break;
        }

        case "test": {
          await handlePeriodicTest(ctx, env);
          break;
        }

        case "help": {
          let helpMsg =
            `📚 *How to use this bot*\n\n` +
            `*Natural Language — just type:*\n` +
            `• "day 5" — View Day 5 links\n` +
            `• "quiz me" — Start today's quiz\n` +
            `• "quiz 3" — Quiz on Day 3\n` +
            `• "progress" — See your stats\n` +
            `• "path" — Learning roadmap\n` +
            `• "today" — Today's lesson\n` +
            `• "menu" — Main menu\n\n` +
            `*Slash Commands:*\n` +
            `• /start — Main menu\n` +
            `• /day — Today's links\n` +
            `• /test — Periodic test\n\n` +
            `*Ask AI:*\n` +
            `• Just type any question!\n` +
            `• "What are Python variables?"\n` +
            `• "Explain loops"\n`;

          if (isAdmin(env, userId)) {
            helpMsg +=
              `\n*🔐 Admin:*\n` +
              `• /admin — Admin panel\n` +
              `• AI can help manage curriculum, generate quizzes, etc.\n`;
          }

          helpMsg += `\n💡 _I understand natural language — just talk to me!_`;
          await ctx.reply(helpMsg, { parse_mode: "Markdown" });
          break;
        }

        case "admin": {
          await showAdminPanel(ctx, env);
          break;
        }
      }
    } catch (err) {
      console.error("[intent] Error:", intent.action, err.message);
      await ctx.reply("❌ Something went wrong. Try again!").catch(() => {});
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // DAY LINKS DISPLAY (shared by callback + intent)
  // ══════════════════════════════════════════════════════════════════════

  async function sendDayLinks(ctx, env, dayNum, user) {
    const curriculum = await getCachedCurriculum(env);
    const dayData = curriculum?.days?.[String(dayNum)];

    if (!dayData) {
      return ctx.reply(
        `📅 Day ${dayNum} — No content yet!\n\nAdmin hasn't added links for this day yet.\n\n_Type "menu" to go back._`
      );
    }

    const completed = user.completedDays || [];
    const isCompleted = completed.includes(dayNum);
    const msg = formatDayMessage(dayNum, dayData, isCompleted);
    const kb = buildDayKeyboard(dayNum);

    await ctx.reply(msg, {
      parse_mode: "Markdown",
      reply_markup: kb,
      disable_web_page_preview: true,
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // PROGRESS
  // ══════════════════════════════════════════════════════════════════════

  async function showProgress(ctx, env, userId) {
    const user = await getCachedUser(env, userId);
    if (!user) return ctx.reply("Send /start first! 🎓");

    const curriculum = await getCachedCurriculum(env);
    const totalDays = Object.keys(curriculum?.days ?? {}).length || 0;
    const completed = user.completedDays?.length || 0;
    const pct = totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;

    const barLen = 10;
    const filled = Math.round((pct / 100) * barLen);
    const bar = "█".repeat(filled) + "░".repeat(barLen - filled);

    const scores = user.scores || {};
    const scoreValues = Object.values(scores);
    const avgScore = scoreValues.length > 0
      ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
      : 0;

    let msg =
      `📊 *Your Progress*\n\n` +
      `📅 Current Day: *${user.currentDay}*/${totalDays}\n` +
      `✅ Completed: *${completed}* days\n` +
      `Progress: ${bar} *${pct}%*\n\n` +
      `⭐ XP: *${user.totalXp || 0}*\n` +
      `🔥 Streak: *${user.streak || 0}* days\n` +
      `📝 Avg Quiz Score: *${avgScore}%*\n`;

    const kb = new InlineKeyboard().text("🏠 Menu", "back_menu");
    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: kb });
  }

  // ══════════════════════════════════════════════════════════════════════
  // LEARNING PATH
  // ══════════════════════════════════════════════════════════════════════

  async function showLearningPath(ctx, env, userId) {
    const user = await getCachedUser(env, userId);
    if (!user) return ctx.reply("Send /start first! 🎓");

    const curriculum = await getCachedCurriculum(env);
    const days = curriculum?.days ?? {};
    const phases = curriculum?.phases ?? [];
    const completed = new Set(user.completedDays || []);

    let msg = `🗺️ *Your Learning Path*\n\n`;

    if (phases.length === 0) {
      const dayKeys = Object.keys(days).sort((a, b) => parseInt(a) - parseInt(b));
      dayKeys.forEach(d => {
        const dayData = days[d];
        const done = completed.has(parseInt(d));
        msg += `${done ? "✅" : "⬜"} *Day ${d}*: ${dayData?.title || "..."}\n`;
      });
      if (dayKeys.length === 0) msg += `_No curriculum content yet._\n`;
    } else {
      phases.forEach((phase) => {
        const phaseDays = phase.dayIds || phase.days || [];
        const phaseCompleted = phaseDays.filter(d => completed.has(d)).length;
        msg += `${phase.icon || "📚"} *${phase.name}*\n`;
        msg += `Progress: ${phaseCompleted}/${phaseDays.length}\n`;
        phaseDays.slice(0, 5).forEach(d => {
          const dayData = days[String(d)];
          const done = completed.has(d);
          msg += `  ${done ? "✅" : "⬜"} Day ${d}: ${dayData?.title || "..."}\n`;
        });
        if (phaseDays.length > 5) msg += `  ... and ${phaseDays.length - 5} more\n`;
        msg += `\n`;
      });
    }

    const kb = new InlineKeyboard().text("🏠 Menu", "back_menu");
    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: kb });
  }

  // ══════════════════════════════════════════════════════════════════════
  // PERIODIC TESTS
  // ══════════════════════════════════════════════════════════════════════

  function getPeriodicTestMessage(completedDay) {
    if (completedDay > 0 && completedDay % 15 === 0) {
      return `🏆 *15-Day Mega Test Available!*\nCovers Day ${completedDay - 14}-${completedDay}. Type "test" to take it.`;
    }
    if (completedDay > 0 && completedDay % 7 === 0) {
      return `🧪 *7-Day Cumulative Test Available!*\nCovers Day ${completedDay - 6}-${completedDay}. Type "test" to take it.`;
    }
    return null;
  }

  async function startQuiz(ctx, env, day) {
    const curriculum = await getCachedCurriculum(env);
    const dayData = curriculum?.days?.[String(day)];
    const questions = dayData?.quiz;

    if (!questions || questions.length === 0) {
      return ctx.reply(`🧪 No quiz available for Day ${day} yet!\n\n_Type "menu" to go back._`);
    }

    const userId = String(ctx.from.id);
    quizSessions.set(userId, {
      day, questions, currentQ: 0, correct: 0,
      total: questions.length, answers: [],
    });

    await sendQuizQuestion(ctx, userId);
  }

  async function handlePeriodicTest(ctx, env) {
    const userId = String(ctx.from.id);
    const user = await getCachedUser(env, userId);
    if (!user) return ctx.reply("Send /start first! 🎓");

    const day = user.currentDay - 1;
    let testType = null;
    let rangeStart = 0;

    if (day > 0 && day % 15 === 0) {
      testType = "15-day mega test";
      rangeStart = day - 14;
    } else if (day > 0 && day % 7 === 0) {
      testType = "7-day cumulative test";
      rangeStart = day - 6;
    }

    if (!testType) {
      return ctx.reply(
        `🧪 No periodic test available yet.\n\n` +
        `Tests unlock every 7 days (cumulative) and every 15 days (mega).\n` +
        `Current progress: Day ${day}\n\n` +
        `_Keep learning! You're doing great! 💪_`
      );
    }

    const curriculum = await getCachedCurriculum(env);
    const allQuestions = [];
    for (let d = rangeStart; d <= day; d++) {
      const dayData = curriculum?.days?.[String(d)];
      if (dayData?.quiz) allQuestions.push(...dayData.quiz.map(q => ({ ...q, sourceDay: d })));
    }

    if (allQuestions.length === 0) {
      return ctx.reply(`🧪 No quiz questions found for Days ${rangeStart}-${day}.`);
    }

    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(15, shuffled.length));

    quizSessions.set(userId, {
      day: -1, questions: selected, currentQ: 0, correct: 0,
      total: selected.length, answers: [],
    });

    await ctx.reply(`🧪 *${testType.toUpperCase()}*\n\n${selected.length} questions from Day ${rangeStart}-${day}. Let's go!`);
    await sendQuizQuestion(ctx, userId);
  }

  // ══════════════════════════════════════════════════════════════════════
  // ADMIN PANEL
  // ══════════════════════════════════════════════════════════════════════

  async function showAdminPanel(ctx, env) {
    const userId = String(ctx.from.id);
    if (!isAdmin(env, userId)) return ctx.reply("⛔ Access denied.");

    const curriculum = await getCachedCurriculum(env);
    const dayCount = Object.keys(curriculum?.days ?? {}).length;

    const kb = new InlineKeyboard()
      .text("➕ Add Day Links", "admin_add_day").row()
      .text("📝 Add Quiz Questions", "admin_add_quiz").row()
      .text("📊 View Stats", "admin_stats").row()
      .text("📢 Broadcast Message", "admin_broadcast").row()
      .text("🔄 Sync from Web", "admin_sync");

    await ctx.reply(
      `🔐 *Admin Panel*\n\n` +
      `📅 Days configured: *${dayCount}*\n\n` +
      `💡 _Type to me! I can help manage curriculum, generate quizzes, and more._\n\n` +
      `Choose an action or just ask:`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  }

  bot.callbackQuery("admin_add_day", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `➕ *Add Day Links*\n\nSend:\n\`/addlinks DAY_NUMBER\`\n\`\`\`\n` +
      `title: Python Variables\n` +
      `desc: Learn about variables\n` +
      `yt1: https://youtube.com/watch?v=XXX | Title | Channel\n` +
      `link1: https://w3schools.com/... | Article\n\`\`\``,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("addlinks", async (ctx) => {
    if (!isAdmin(env, String(ctx.from.id))) return ctx.reply("⛔ Admin only.");
    const parts = ctx.message.text.split("\n");
    const dayNum = parts[0].replace("/addlinks", "").trim();
    if (!dayNum || isNaN(parseInt(dayNum))) return ctx.reply("Usage: /addlinks DAY_NUMBER ...");

    const resources = [];
    let title = "";
    let desc = "";

    parts.slice(1).forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("title:")) title = trimmed.replace("title:", "").trim();
      else if (trimmed.startsWith("desc:")) desc = trimmed.replace("desc:", "").trim();
      else if (trimmed.startsWith("yt")) {
        const [url, vidTitle, channel] = trimmed.split("|").map(s => s?.trim());
        resources.push({ type: "youtube", url: url.replace(/^yt\d+:\s*/, "").trim(), title: vidTitle || "", channelName: channel || "" });
      } else if (trimmed.startsWith("link")) {
        const [url, linkTitle] = trimmed.split("|").map(s => s?.trim());
        resources.push({ type: "web", url: url.replace(/^link\d+:\s*/, "").trim(), title: linkTitle || "" });
      }
    });

    const curriculum = await getCachedCurriculum(env);
    const days = curriculum.days || {};
    const existing = days[dayNum] || {};

    days[dayNum] = {
      ...existing, day: parseInt(dayNum),
      title: title || existing.title || `Day ${dayNum}`,
      description: desc || existing.description || "",
      resources: resources.length > 0 ? resources : existing.resources || [],
      updatedAt: new Date().toISOString(),
    };

    const sa = getSA(env);
    await setDoc(sa, env.FIREBASE_PROJECT_ID, CURRICULUM_DOC, { ...curriculum, days });
    await invalidateCurriculumCache(env);

    await ctx.reply(
      `✅ *Day ${dayNum} updated!*\nTitle: ${title || existing.title}\nLinks: ${resources.length} added`,
      { parse_mode: "Markdown" }
    );
  });

  bot.callbackQuery("admin_add_quiz", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📝 *Add Quiz*\n\nSend:\n\`/addquiz DAY_NUMBER\`\n\`\`\`\n` +
      `Q: What is a variable?\nA: Storage|Loop|Function|Operator\nC: 0\n\`\`\``,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("addquiz", async (ctx) => {
    if (!isAdmin(env, String(ctx.from.id))) return ctx.reply("⛔ Admin only.");
    const parts = ctx.message.text.split("\n");
    const dayNum = parts[0].replace("/addquiz", "").trim();
    if (!dayNum || isNaN(parseInt(dayNum))) return ctx.reply("Usage: /addquiz DAY_NUMBER ...");

    const questions = [];
    let currentQ = null;
    for (let i = 1; i < parts.length; i++) {
      const line = parts[i].trim();
      if (line.startsWith("Q:")) {
        if (currentQ) questions.push(currentQ);
        currentQ = { question: line.replace("Q:", "").trim(), options: [], correctAnswer: 0 };
      } else if (line.startsWith("A:") && currentQ) {
        currentQ.options = line.replace("A:", "").trim().split("|").map(s => s.trim());
      } else if (line.startsWith("C:") && currentQ) {
        currentQ.correctAnswer = parseInt(line.replace("C:", "").trim());
      }
    }
    if (currentQ) questions.push(currentQ);

    const curriculum = await getCachedCurriculum(env);
    const days = curriculum.days || {};
    days[dayNum] = {
      ...(days[dayNum] || {}), day: parseInt(dayNum),
      quiz: questions, updatedAt: new Date().toISOString(),
    };

    const sa = getSA(env);
    await setDoc(sa, env.FIREBASE_PROJECT_ID, CURRICULUM_DOC, { ...curriculum, days });
    await invalidateCurriculumCache(env);

    await ctx.reply(`✅ *Day ${dayNum} quiz updated!* 📝 ${questions.length} questions`, { parse_mode: "Markdown" });
  });

  bot.callbackQuery("admin_stats", async (ctx) => {
    await ctx.answerCallbackQuery();
    const curriculum = await getCachedCurriculum(env);
    const dayCount = Object.keys(curriculum?.days ?? {}).length;
    const phaseCount = (curriculum?.phases ?? []).length;
    let totalQuizQ = 0;
    Object.values(curriculum?.days ?? {}).forEach(d => { totalQuizQ += (d.quiz || []).length; });

    await ctx.reply(
      `📊 *Platform Stats*\n\n📅 Days: *${dayCount}* | 📁 Phases: *${phaseCount}*\n📝 Quiz Questions: *${totalQuizQ}*`,
      { parse_mode: "Markdown" }
    );
  });

  bot.callbackQuery("admin_broadcast", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📢 *Broadcast*\n\nSend:\n\`/broadcast Your message here\``,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(env, String(ctx.from.id))) return ctx.reply("⛔ Admin only.");
    const message = ctx.message.text.replace("/broadcast", "").trim();
    if (!message) return ctx.reply("Usage: /broadcast Your message here");
    await ctx.reply(`📢 *Broadcast queued!*\n\nMessage: "${message}"`, { parse_mode: "Markdown" });
  });

  bot.callbackQuery("admin_sync", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `🔄 *Sync from Web*\n\nWeb and bot share the same Firestore database.\nContent is already synced! Just /start to refresh.`,
      { parse_mode: "Markdown" }
    );
  });

  return bot;
}

// ══════════════════════════════════════════════════════════════════════════
// CLOUDFLARE WORKER EXPORT
// ══════════════════════════════════════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("CSA Telegram Bot v3 is running! 🎓", { status: 200 });
    }

    try {
      const bot = createBot(env);
      await bot.init();

      bot.catch((err) => {
        console.error("[grammy] Handler error:", err.message, err.stack);
      });

      const update = await request.json();
      await bot.handleUpdate(update);
      return new Response("ok", { status: 200 });
    } catch (err) {
      console.error("[worker] Fatal error:", err.message, err.stack);
      return new Response("error", { status: 500 });
    }
  },
};
