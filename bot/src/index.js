// ══════════════════════════════════════════════════════════════════════════
// Computer Skills Academy — Telegram Bot v2 (AI-Powered)
// Runs on Cloudflare Workers (free tier: 100K req/day)
// Features: AI brain, natural language commands, dual mode (admin/student)
// ══════════════════════════════════════════════════════════════════════════

import { Bot, InlineKeyboard } from "grammy";
import { getDoc, setDoc, updateDoc } from "./firestore";

// ── Config ────────────────────────────────────────────────────────────────

const PASS_THRESHOLD = 70;

// ── Helper: get Firebase SA from env ──────────────────────────────────────

function getSA(env) {
  if (!env.FIREBASE_SA_KEY) throw new Error("FIREBASE_SA_KEY not set");
  return JSON.parse(env.FIREBASE_SA_KEY);
}

// ── Firestore paths ───────────────────────────────────────────────────────

const CURRICULUM_DOC = "curriculum/data";
const userDoc = (id) => `bot_users/${id}`;

// ── Admin check ───────────────────────────────────────────────────────────

function isAdmin(env, userId) {
  const adminIds = (env.ADMIN_TELEGRAM_IDS || "").split(",").map(s => s.trim());
  return adminIds.includes(userId);
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
 */
async function callAI(env, prompt, isAdminUser = false, userContext = "") {
  const baseUrl = env.MIMO_BASE_URL || "https://opencode.ai/zen/v1";
  const model = env.MIMO_MODEL || "mimo-v2.5-free";
  const apiKey = env.MIMO_API_KEY || env.NVIDIA_API_KEY || "";

  if (!apiKey) throw new Error("No AI API key configured");

  const systemPrompt = isAdminUser ? ADMIN_SYSTEM_PROMPT : STUDENT_SYSTEM_PROMPT;
  const maxTokens = isAdminUser ? 1024 : 512;
  const temperature = isAdminUser ? 0.5 : 0.7;

  const messages = [
    { role: "system", content: systemPrompt },
  ];

  if (userContext) {
    messages.push({ role: "system", content: `Context about this user:\n${userContext}` });
  }

  messages.push({ role: "user", content: prompt });

  // Primary: Mimo v2.5 (via OpenCode Zen)
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "No response from AI.";
    }
    console.warn("[ai] Mimo failed:", res.status);
  } catch (err) {
    console.warn("[ai] Mimo error:", err.message);
  }

  // Fallback: NVIDIA NIM
  const nvidiaKey = env.NVIDIA_API_KEY || "";
  if (nvidiaKey && nvidiaKey !== apiKey) {
    try {
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
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "No response from AI.";
      }
    } catch {
      // fall through
    }
  }

  throw new Error("All AI models failed — check API keys in Worker secrets");
}

// ══════════════════════════════════════════════════════════════════════════
// NATURAL LANGUAGE INTENT PARSER
// ══════════════════════════════════════════════════════════════════════════

/**
 * Parse user text to detect intent. Returns { action, params } or null.
 * Fast regex-based — avoids AI call for common commands.
 */
function parseIntent(text) {
  const t = text.toLowerCase().trim();

  // ── Menu / Home ──────────────────────────────────────────────────────
  if (/^(menu|home|back|main|start|hi|hello|hey|options)$/i.test(t)) {
    return { action: "menu" };
  }

  // ── Day links: "day 5", "day5", "show day 5", "day 5 links", etc.
  const dayMatch = t.match(/(?:show\s+|view\s+|open\s+|go\s+to\s+|see\s+|get\s+)?day\s*(\d+)/i);
  if (dayMatch) {
    return { action: "day", params: { day: parseInt(dayMatch[1]) } };
  }

  // ── Quiz: "quiz", "quiz 5", "quiz on day 5", "test me"
  const quizMatch = t.match(/^(?:quiz|test\s+me|take\s+quiz|start\s+quiz|qa)\s*(\d+)?$/i);
  if (quizMatch) {
    return { action: "quiz", params: { day: quizMatch[1] ? parseInt(quizMatch[1]) : null } };
  }

  // ── Progress: "progress", "stats", "my progress"
  if (/^(?:progress|stats|my\s+progress|my\s+stats|score|scores|report)$/i.test(t)) {
    return { action: "progress" };
  }

  // ── Learning Path: "path", "journey", "roadmap"
  if (/^(?:path|journey|roadmap|learning\s+path|syllabus)$/i.test(t)) {
    return { action: "path" };
  }

  // ── Periodic Test: "test", "exam", "periodic test"
  if (/^(?:periodic|cumulative|mega\s+test|review\s+test|exam)$/i.test(t)) {
    return { action: "test" };
  }

  // ── Help
  if (/^(?:help|commands|what\s+can\s+you\s+do|usage|menu\s+list)$/i.test(t)) {
    return { action: "help" };
  }

  // ── My Day: "today", "current day", "my day"
  if (/^(?:today|current|my\s+day|now)$/i.test(t)) {
    return { action: "today" };
  }

  // ── Admin shortcuts
  if (/^(?:admin|panel|dashboard)$/i.test(t)) {
    return { action: "admin" };
  }

  // ── No pattern match → will be sent to AI
  return null;
}

// ══════════════════════════════════════════════════════════════════════════
// BOT SETUP
// ══════════════════════════════════════════════════════════════════════════

function createBot(env) {
  const bot = new Bot(env.BOT_TOKEN);

  // ════════════════════════════════════════════════════════════════════════
  // /start — Welcome + show current day
  // ════════════════════════════════════════════════════════════════════════

  bot.command("start", async (ctx) => {
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    // Load or create user state
    let user = await getDoc(sa, projectId, userDoc(userId));
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
      await setDoc(sa, projectId, userDoc(userId), user);
    }

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
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
  });

  // ══════════════════════════════════════════════════════════════════════
  // Slash commands (keep for compatibility)
  // ══════════════════════════════════════════════════════════════════════

  bot.command("day", async (ctx) => {
    await showDayLinks(ctx, env);
  });

  bot.command("test", async (ctx) => {
    await handlePeriodicTest(ctx, env);
  });

  bot.command("admin", async (ctx) => {
    await showAdminPanel(ctx, env);
  });

  // ══════════════════════════════════════════════════════════════════════
  // MAIN TEXT HANDLER — AI Brain with Intent Parsing
  // ══════════════════════════════════════════════════════════════════════

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const userId = String(ctx.from.id);

    // Skip slash commands (handled by grammy's command system)
    if (text.startsWith("/")) return;

    // Check if user is in a quiz session
    const session = quizSessions.get(userId);
    if (session) {
      await ctx.reply("Please use the buttons above to answer the quiz! 🎯");
      return;
    }

    const isUserAdmin = isAdmin(env, userId);

    // ── Step 1: Try fast intent parsing ─────────────────────────────────
    const intent = parseIntent(text);

    if (intent) {
      await handleIntent(ctx, env, intent, userId);
      return;
    }

    // ── Step 2: No pattern match → send to AI ──────────────────────────
    await ctx.replyWithChatAction("typing");

    try {
      const sa = getSA(env);
      const projectId = env.FIREBASE_PROJECT_ID;
      const user = await getDoc(sa, projectId, userDoc(userId));
      const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);

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
          `Quiz Scores: ${JSON.stringify(user.scores || {})}`,
          `Role: ${isUserAdmin ? "ADMIN" : "Student"}`,
        ].join("\n");
      }

      const aiResponse = await callAI(env, text, isUserAdmin, userContext);

      const badge = isUserAdmin ? "🤖 *Admin AI*" : "🤖 *AI Tutor*";
      await ctx.reply(`${badge}\n\n${aiResponse}`, {
        parse_mode: "Markdown",
        reply_markup: buildContextKeyboard(),
      });
    } catch {
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
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    switch (intent.action) {
      case "menu": {
        const user = await getDoc(sa, projectId, userDoc(userId));
        if (!user) {
          await ctx.reply("Send /start to begin! 🎓");
          return;
        }
        const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
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
        await showDayLinks(ctx, env, intent.params.day);
        break;
      }

      case "today": {
        const user = await getDoc(sa, projectId, userDoc(userId));
        if (!user) {
          await ctx.reply("Send /start first! 🎓");
          return;
        }
        await showDayLinks(ctx, env, user.currentDay);
        break;
      }

      case "quiz": {
        const user = await getDoc(sa, projectId, userDoc(userId));
        if (!user) {
          await ctx.reply("Send /start first! 🎓");
          return;
        }
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
        const isUserAdmin = isAdmin(env, userId);
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
          `• "Explain loops"\n` +
          `• "Give me a practice exercise"\n`;

        if (isUserAdmin) {
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
  }

  // ══════════════════════════════════════════════════════════════════════
  // DAY LINKS DISPLAY
  // ══════════════════════════════════════════════════════════════════════

  async function showDayLinks(ctx, env, dayNum) {
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    let user = await getDoc(sa, projectId, userDoc(userId));
    if (!user) {
      await ctx.reply("Please /start first! 🎓");
      return;
    }

    const day = dayNum || user.currentDay;
    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const dayData = curriculum?.days?.[String(day)];

    if (!dayData) {
      await ctx.reply(
        `📅 Day ${day} — No content yet!\n\n` +
        `Admin hasn't added links for this day yet.\n\n` +
        `_Type "menu" to go back._`
      );
      return;
    }

    let msg = `📅 *Day ${day}: ${dayData.title || "Untitled"}*\n`;
    msg += `📋 ${dayData.description || ""}\n\n`;

    const ytLinks = (dayData.resources || []).filter(r => r.type === "youtube");
    if (ytLinks.length > 0) {
      msg += `🎬 *Watch Videos:*\n`;
      ytLinks.forEach((link, i) => {
        msg += `${i + 1}. [${link.title || "Video"}](${link.url})`;
        if (link.channelName) msg += ` — _${link.channelName}_`;
        msg += `\n`;
      });
      msg += `\n`;
    }

    const webLinks = (dayData.resources || []).filter(r => r.type !== "youtube");
    if (webLinks.length > 0) {
      msg += `🔗 *Read More:*\n`;
      webLinks.forEach((link, i) => {
        msg += `${i + 1}. [${link.title || "Article"}](${link.url})\n`;
      });
      msg += `\n`;
    }

    const shareText = encodeURIComponent(
      `📚 Day ${day}: ${dayData.title || "Check this out!"}\n\n` +
      `Watch: ${ytLinks[0]?.url || webLinks[0]?.url || ""}\n\n— Computer Skills Academy`
    );
    const shareUrl = `https://api.whatsapp.com/send?text=${shareText}`;

    const kb = new InlineKeyboard()
      .text("🧪 Take Quiz", `quiz_${day}`)
      .row()
      .url("📤 Share to WhatsApp", shareUrl)
      .row()
      .text("🤖 Ask AI about this", `ask_day_${day}`)
      .row()
      .text("◀️ Back to Menu", "back_menu");

    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: kb, disable_web_page_preview: false });
  }

  // ══════════════════════════════════════════════════════════════════════
  // QUIZ SYSTEM
  // ══════════════════════════════════════════════════════════════════════

  const quizSessions = new Map();

  async function startQuiz(ctx, env, day) {
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const dayData = curriculum?.days?.[String(day)];
    const questions = dayData?.quiz;

    if (!questions || questions.length === 0) {
      await ctx.reply(
        `🧪 No quiz available for Day ${day} yet!\n\n` +
        `_Type "menu" to go back._`
      );
      return;
    }

    quizSessions.set(userId, {
      day,
      questions,
      currentQ: 0,
      correct: 0,
      total: questions.length,
      answers: [],
    });

    await sendQuizQuestion(ctx, userId);
  }

  // Callback query quizzes
  bot.callbackQuery(/^quiz_(\d+)$/, async (ctx) => {
    const day = parseInt(ctx.match[1]);
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const dayData = curriculum?.days?.[String(day)];
    const questions = dayData?.quiz;

    if (!questions || questions.length === 0) {
      await ctx.answerCallbackQuery("No quiz available for this day yet!");
      return;
    }

    quizSessions.set(userId, {
      day,
      questions,
      currentQ: 0,
      correct: 0,
      total: questions.length,
      answers: [],
    });

    await sendQuizQuestion(ctx, userId);
    await ctx.answerCallbackQuery();
  });

  async function sendQuizQuestion(ctx, userId) {
    const session = quizSessions.get(userId);
    if (!session) return;

    const q = session.questions[session.currentQ];
    const num = session.currentQ + 1;
    const total = session.total;

    const kb = new InlineKeyboard();
    const options = q.options || [];
    options.forEach((opt, i) => {
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

  bot.callbackQuery(/^answer_(\d+)_(\d+)$/, async (ctx) => {
    const userId = ctx.match[1];
    const answerIdx = parseInt(ctx.match[2]);
    const session = quizSessions.get(userId);

    if (!session) {
      await ctx.answerCallbackQuery("Quiz expired. Type 'quiz' to start again!");
      return;
    }

    if (String(ctx.from.id) !== userId) {
      await ctx.answerCallbackQuery("This is not your quiz!");
      return;
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

  async function showQuizResult(ctx, userId, session) {
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;
    const pct = Math.round((session.correct / session.total) * 100);
    const passed = pct >= PASS_THRESHOLD;

    let msg = `📊 *Quiz Results — Day ${session.day}*\n\n`;
    msg += `Score: *${session.correct}/${session.total}* (${pct}%)\n`;
    msg += passed ? `✅ *PASSED!* 🎉\n` : `❌ *Not passed* (need ${PASS_THRESHOLD}%)\n`;

    if (passed) {
      let user = await getDoc(sa, projectId, userDoc(userId));
      if (user) {
        const completed = [...new Set([...(user.completedDays || []), session.day])];
        const xpGain = pct >= 90 ? 150 : pct >= 70 ? 100 : 50;
        const nextDay = session.day + 1;

        await updateDoc(sa, projectId, userDoc(userId), {
          completedDays: completed,
          currentDay: Math.max(user.currentDay || 1, nextDay),
          totalXp: (user.totalXp || 0) + xpGain,
          [`scores.${session.day}`]: pct,
          lastActiveDate: new Date().toISOString().slice(0, 10),
        });

        msg += `\n⭐ +${xpGain} XP earned!`;

        const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
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
      const nextDay = session.day + 1;
      const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
      if (curriculum?.days?.[String(nextDay)]) {
        kb.text(`📚 Go to Day ${nextDay}`, `day_${nextDay}`);
      }
    } else {
      kb.text(`🔄 Retry Quiz`, `quiz_${session.day}`);
      kb.text(`📚 Re-watch Videos`, `day_${session.day}`);
    }
    kb.row();
    kb.text("🏠 Menu", "back_menu");

    await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: kb });
    quizSessions.delete(userId);
  }

  // ══════════════════════════════════════════════════════════════════════
  // PERIODIC TESTS
  // ══════════════════════════════════════════════════════════════════════

  function getPeriodicTestMessage(completedDay) {
    if (completedDay > 0 && completedDay % 15 === 0) {
      const rangeStart = completedDay - 14;
      return `🏆 *15-Day Mega Test Available!*\nCovers Day ${rangeStart}-${completedDay}. Type "test" to take it.`;
    }
    if (completedDay > 0 && completedDay % 7 === 0) {
      const rangeStart = completedDay - 6;
      return `🧪 *7-Day Cumulative Test Available!*\nCovers Day ${rangeStart}-${completedDay}. Type "test" to take it.`;
    }
    return null;
  }

  async function handlePeriodicTest(ctx, env) {
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const user = await getDoc(sa, projectId, userDoc(userId));
    if (!user) {
      await ctx.reply("Send /start first! 🎓");
      return;
    }

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
      await ctx.reply(
        `🧪 No periodic test available yet.\n\n` +
        `Tests unlock every 7 days (cumulative) and every 15 days (mega).\n` +
        `Current progress: Day ${day}\n\n` +
        `_Keep learning! You're doing great! 💪_`
      );
      return;
    }

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const allQuestions = [];
    for (let d = rangeStart; d <= day; d++) {
      const dayQ = curriculum?.days?.[String(d)]?.quiz;
      if (dayQ) dayQ.forEach(q => allQuestions.push({ ...q, fromDay: d }));
    }

    if (allQuestions.length === 0) {
      await ctx.reply(`No quiz questions available for Days ${rangeStart}-${day}.`);
      return;
    }

    const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 15);

    quizSessions.set(userId, {
      day: -1,
      questions: shuffled,
      currentQ: 0,
      correct: 0,
      total: shuffled.length,
      answers: [],
      testType,
      rangeStart,
      rangeEnd: day,
    });

    const kb = new InlineKeyboard().text("Start Test ▶️", `answer_${userId}_0`);
    await ctx.reply(
      `🧪 *${testType}*\n\n` +
      `📚 Covers: Day ${rangeStart} — Day ${day}\n` +
      `❓ ${shuffled.length} questions\n` +
      `✅ Pass: ${PASS_THRESHOLD}%\n\n` +
      `Ready? 💪`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // PROGRESS
  // ══════════════════════════════════════════════════════════════════════

  async function showProgress(ctx, env, userId) {
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const user = await getDoc(sa, projectId, userDoc(userId));
    if (!user) {
      await ctx.reply("Send /start first! 🎓");
      return;
    }

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
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
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const user = await getDoc(sa, projectId, userDoc(userId));
    if (!user) {
      await ctx.reply("Send /start first! 🎓");
      return;
    }

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
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

      if (dayKeys.length === 0) {
        msg += `_No curriculum content yet. Admin will add content soon!_\n`;
      }
    } else {
      phases.forEach((phase) => {
        const phaseDays = phase.dayIds || phase.days || [];
        const phaseCompleted = phaseDays.filter(d => completed.has(d)).length;
        const phaseTotal = phaseDays.length;

        msg += `${phase.icon || "📚"} *${phase.name}*\n`;
        msg += `Progress: ${phaseCompleted}/${phaseTotal}\n`;

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
  // AI CHAT BUTTONS
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
  // ADMIN PANEL (Full Power AI Mode)
  // ══════════════════════════════════════════════════════════════════════

  async function showAdminPanel(ctx, env) {
    const userId = String(ctx.from.id);

    if (!isAdmin(env, userId)) {
      await ctx.reply("⛔ Access denied.");
      return;
    }

    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;
    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const dayCount = Object.keys(curriculum?.days ?? {}).length;

    const kb = new InlineKeyboard()
      .text("➕ Add Day Links", "admin_add_day")
      .row()
      .text("📝 Add Quiz Questions", "admin_add_quiz")
      .row()
      .text("📊 View Stats", "admin_stats")
      .row()
      .text("📢 Broadcast Message", "admin_broadcast")
      .row()
      .text("🔄 Sync from Web", "admin_sync");

    await ctx.reply(
      `🔐 *Admin Panel*\n\n` +
      `📅 Days configured: *${dayCount}*\n` +
      `👥 Telegram users: (see Firebase)\n\n` +
      `💡 _Tip: Just type to me! I can help manage curriculum, generate quizzes, analyze data, and more._\n\n` +
      `Choose an action or just ask me anything:`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  }

  // Admin: Add day links
  bot.callbackQuery("admin_add_day", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `➕ *Add Day Links*\n\n` +
      `Send in this format:\n\n` +
      `\`/addlinks DAY_NUMBER\`\n` +
      `\`\`\`\n` +
      `title: Python Variables\n` +
      `desc: Learn about variables in Python\n` +
      `yt1: https://youtube.com/watch?v=XXX | Title | Channel\n` +
      `yt2: https://youtube.com/watch?v=YYY | Title | Channel\n` +
      `link1: https://w3schools.com/... | Article Title\n` +
      `\`\`\``,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("addlinks", async (ctx) => {
    if (!isAdmin(env, String(ctx.from.id))) {
      await ctx.reply("⛔ Admin only.");
      return;
    }

    const parts = ctx.message.text.split("\n");
    const dayNum = parts[0].replace("/addlinks", "").trim();

    if (!dayNum || isNaN(parseInt(dayNum))) {
      await ctx.reply("Usage: /addlinks DAY_NUMBER followed by content on new lines.");
      return;
    }

    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const lines = parts.slice(1);
    const resources = [];
    let title = "";
    let desc = "";

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("title:")) title = trimmed.replace("title:", "").trim();
      else if (trimmed.startsWith("desc:")) desc = trimmed.replace("desc:", "").trim();
      else if (trimmed.startsWith("yt")) {
        const [url, vidTitle, channel] = trimmed.split("|").map(s => s?.trim());
        const cleanUrl = url.replace(/^yt\d+:\s*/, "").trim();
        resources.push({ type: "youtube", url: cleanUrl, title: vidTitle || "", channelName: channel || "" });
      } else if (trimmed.startsWith("link")) {
        const [url, linkTitle] = trimmed.split("|").map(s => s?.trim());
        const cleanUrl = url.replace(/^link\d+:\s*/, "").trim();
        resources.push({ type: "web", url: cleanUrl, title: linkTitle || "" });
      }
    });

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC) || { phases: [], days: {} };
    const days = curriculum.days || {};
    const existing = days[dayNum] || {};

    days[dayNum] = {
      ...existing,
      day: parseInt(dayNum),
      title: title || existing.title || `Day ${dayNum}`,
      description: desc || existing.description || "",
      resources: resources.length > 0 ? resources : existing.resources || [],
      updatedAt: new Date().toISOString(),
    };

    await setDoc(sa, projectId, CURRICULUM_DOC, { ...curriculum, days });

    await ctx.reply(
      `✅ *Day ${dayNum} updated!*\n\n` +
      `Title: ${title || existing.title}\n` +
      `Links: ${resources.length} added\n` +
      `YouTube: ${resources.filter(r => r.type === "youtube").length}\n` +
      `Web: ${resources.filter(r => r.type !== "youtube").length}`,
      { parse_mode: "Markdown" }
    );
  });

  // Admin: Add quiz
  bot.callbackQuery("admin_add_quiz", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📝 *Add Quiz Questions*\n\n` +
      `Send in this format:\n\n` +
      `\`/addquiz DAY_NUMBER\`\n` +
      `\`\`\`\n` +
      `Q: What is a variable?\n` +
      `A: A named storage|A type of loop|A function|An operator\n` +
      `C: 0\n` +
      `\`\`\``,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("addquiz", async (ctx) => {
    if (!isAdmin(env, String(ctx.from.id))) {
      await ctx.reply("⛔ Admin only.");
      return;
    }

    const parts = ctx.message.text.split("\n");
    const dayNum = parts[0].replace("/addquiz", "").trim();

    if (!dayNum || isNaN(parseInt(dayNum))) {
      await ctx.reply("Usage: /addquiz DAY_NUMBER followed by questions.");
      return;
    }

    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

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

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC) || { phases: [], days: {} };
    const days = curriculum.days || {};
    const existing = days[dayNum] || {};

    days[dayNum] = {
      ...existing,
      day: parseInt(dayNum),
      quiz: questions,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(sa, projectId, CURRICULUM_DOC, { ...curriculum, days });

    await ctx.reply(
      `✅ *Day ${dayNum} quiz updated!*\n\n` +
      `📝 ${questions.length} questions added`,
      { parse_mode: "Markdown" }
    );
  });

  // Admin: Stats
  bot.callbackQuery("admin_stats", async (ctx) => {
    await ctx.answerCallbackQuery();
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;
    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const dayCount = Object.keys(curriculum?.days ?? {}).length;
    const phaseCount = (curriculum?.phases ?? []).length;

    let totalQuizQ = 0;
    Object.values(curriculum?.days ?? {}).forEach(d => {
      totalQuizQ += (d.quiz || []).length;
    });

    await ctx.reply(
      `📊 *Platform Stats*\n\n` +
      `📅 Total Days: *${dayCount}*\n` +
      `📁 Phases: *${phaseCount}*\n` +
      `📝 Total Quiz Questions: *${totalQuizQ}*\n\n` +
      `_For detailed user analytics, check the web admin panel._`,
      { parse_mode: "Markdown" }
    );
  });

  // Admin: Broadcast
  bot.callbackQuery("admin_broadcast", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📢 *Broadcast Message*\n\n` +
      `Send in this format:\n\n` +
      `\`/broadcast Your message here\`\n\n` +
      `This will be sent to all bot users.`,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(env, String(ctx.from.id))) {
      await ctx.reply("⛔ Admin only.");
      return;
    }

    const message = ctx.message.text.replace("/broadcast", "").trim();
    if (!message) {
      await ctx.reply("Usage: /broadcast Your message here");
      return;
    }

    await ctx.reply(
      `📢 *Broadcast queued!*\n\n` +
      `Message: "${message}"\n\n` +
      `_Note: Broadcast delivery requires iterating bot_users collection. ` +
      `Use the web admin panel for mass messaging._`,
      { parse_mode: "Markdown" }
    );
  });

  // Admin: Sync
  bot.callbackQuery("admin_sync", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `🔄 *Sync from Web*\n\n` +
      `The web admin panel and this bot share the same Firestore database.\n\n` +
      `If you edited curriculum on the web admin panel, it's already available here!\n\n` +
      `Just /start to see the latest content.`,
      { parse_mode: "Markdown" }
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  // BACK TO MENU (callback button)
  // ══════════════════════════════════════════════════════════════════════

  bot.callbackQuery("back_menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const user = await getDoc(sa, projectId, userDoc(userId));
    if (!user) {
      await ctx.reply("Send /start to begin! 🎓");
      return;
    }

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
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

  return bot;
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

function buildContextKeyboard() {
  return new InlineKeyboard()
    .text("📚 Menu", "back_menu")
    .text("📊 Progress", "progress")
    .row()
    .text("🧪 Quiz", "quiz_1")
    .text("🗺️ Path", "path");
}

// ══════════════════════════════════════════════════════════════════════════
// CLOUDFLARE WORKER EXPORT
// ══════════════════════════════════════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("CSA Telegram Bot v2 is running! 🎓", { status: 200 });
    }

    try {
      const bot = createBot(env);
      const update = await request.json();
      await bot.handleUpdate(update);
      return new Response("ok", { status: 200 });
    } catch (err) {
      console.error("Bot error:", err);
      return new Response("ok", { status: 200 });
    }
  },
};
