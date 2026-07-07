// ══════════════════════════════════════════════════════════════════════════
// Computer Skills Academy — Telegram Bot
// Runs on Cloudflare Workers (free tier: 100K req/day)
// Features: Day links, Quiz, AI Chat, Admin mode, WhatsApp share
// ══════════════════════════════════════════════════════════════════════════

import { Bot, InlineKeyboard } from "grammy";
import { getDoc, setDoc, updateDoc } from "./firestore";

// ── Config ────────────────────────────────────────────────────────────────

const PASS_THRESHOLD = 70; // % needed to pass quiz

// ── Helper: get Firebase SA from env ──────────────────────────────────────

function getSA(env) {
  if (!env.FIREBASE_SA_KEY) throw new Error("FIREBASE_SA_KEY not set");
  return JSON.parse(env.FIREBASE_SA_KEY);
}

// ── Firestore paths ───────────────────────────────────────────────────────

const CURRICULUM_DOC = "curriculum/data";
const userDoc = (id) => `bot_users/${id}`;

// ── Bot Setup ─────────────────────────────────────────────────────────────

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

    // Load curriculum to get day info
    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const days = curriculum?.days ?? {};
    const totalDays = Object.keys(days).length || 100;

    const day = user.currentDay;
    const completed = user.completedDays?.length || 0;
    const pct = Math.round((completed / totalDays) * 100);

    const kb = new InlineKeyboard()
      .text("📚 Today's Links", `day_${day}`)
      .row()
      .text("🧪 Take Quiz", `quiz_${day}`)
      .row()
      .text("🤖 Ask AI", "ai_chat")
      .row()
      .text("📊 My Progress", "progress")
      .text("🗺️ Learning Path", "path");

    await ctx.reply(
      `🎓 *Computer Skills Academy*\n\n` +
      `Welcome back, *${user.name}*!\n\n` +
      `📅 You're on *Day ${day}* of ${totalDays}\n` +
      `✅ Completed: ${completed} days (${pct}%)\n` +
      `🔥 Streak: ${user.streak || 0} days\n` +
      `⭐ XP: ${user.totalXp || 0}\n\n` +
      `What would you like to do?`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // ════════════════════════════════════════════════════════════════════════
  // /day — Show current day's links
  // ════════════════════════════════════════════════════════════════════════

  bot.command("day", async (ctx) => {
    await showDayLinks(ctx, env);
  });

  async function showDayLinks(ctx, env, dayNum) {
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    let user = await getDoc(sa, projectId, userDoc(userId));
    if (!user) {
      await ctx.reply("Please /start first!");
      return;
    }

    const day = dayNum || user.currentDay;
    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const dayData = curriculum?.days?.[String(day)];

    if (!dayData) {
      await ctx.reply(`📅 Day ${day} — No content yet!\n\nAdmin hasn't added links for this day.`);
      return;
    }

    // Build message
    let msg = `📅 *Day ${day}: ${dayData.title || "Untitled"}*\n`;
    msg += `📋 ${dayData.description || ""}\n\n`;

    // YouTube links
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

    // Web/blog links
    const webLinks = (dayData.resources || []).filter(r => r.type !== "youtube");
    if (webLinks.length > 0) {
      msg += `🔗 *Read More:*\n`;
      webLinks.forEach((link, i) => {
        msg += `${i + 1}. [${link.title || "Article"}](${link.url})\n`;
      });
      msg += `\n`;
    }

    // Share link
    const shareText = encodeURIComponent(`📚 Day ${day}: ${dayData.title || "Check this out!"}\n\nWatch: ${ytLinks[0]?.url || webLinks[0]?.url || ""}\n\n— Computer Skills Academy`);
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

  // ════════════════════════════════════════════════════════════════════════
  // Quiz System — inline quiz with pass/fail
  // ════════════════════════════════════════════════════════════════════════

  // Store quiz state in memory (per user)
  const quizSessions = new Map();

  bot.callbackQuery(/^quiz_(\d+)$/, async (ctx) => {
    const day = parseInt(ctx.match[1]);
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    // Load quiz questions
    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const dayData = curriculum?.days?.[String(day)];
    const questions = dayData?.quiz;

    if (!questions || questions.length === 0) {
      await ctx.answerCallbackQuery("No quiz available for this day yet!");
      return;
    }

    // Start quiz session
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

    // Build keyboard with options
    const kb = new InlineKeyboard();
    const options = q.options || [];
    options.forEach((opt, i) => {
      kb.text(`${String.fromCharCode(65 + i)}. ${opt}`, `answer_${userId}_${i}`);
      kb.row();
    });

    await ctx.editMessageText(
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
      await ctx.answerCallbackQuery("Quiz expired. Start again with /start");
      return;
    }

    // Only the quiz taker can answer
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

    // Show result for 1.5s then next question
    const emoji = isCorrect ? "✅" : "❌";
    const correctText = q.options?.[correctIdx] || "Unknown";

    if (session.currentQ < session.total) {
      await ctx.editMessageText(
        `${emoji} *${isCorrect ? "Correct!" : "Wrong!"}*\n` +
        `${!isCorrect ? `Correct answer: *${correctText}*\n\n` : "\n"}` +
        `Loading next question...`,
        { parse_mode: "Markdown" }
      );
      setTimeout(() => sendQuizQuestion(ctx, userId), 1500);
    } else {
      // Quiz complete — show results
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
      // Update user: mark day complete, unlock next day
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

        // Check if next day has content
        const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
        const nextDayData = curriculum?.days?.[String(nextDay)];
        if (nextDayData) {
          msg += `\n\n🔓 *Day ${nextDay} unlocked!*`;
        }

        // Periodic test check
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
    kb.text("🏠 Back to Menu", "back_menu");

    await ctx.editMessageText(msg, { parse_mode: "Markdown", reply_markup: kb });
    quizSessions.delete(userId);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Periodic Tests (7-day and 15-day cumulative)
  // ════════════════════════════════════════════════════════════════════════

  function getPeriodicTestMessage(completedDay) {
    if (completedDay > 0 && completedDay % 7 === 0) {
      const rangeEnd = completedDay;
      const rangeStart = completedDay - 6;
      return `🧪 *7-Day Cumulative Test Available!*\nCovers Day ${rangeStart}-${rangeEnd}. Use /test to take it.`;
    }
    if (completedDay > 0 && completedDay % 15 === 0) {
      const rangeEnd = completedDay;
      const rangeStart = completedDay - 14;
      return `🏆 *15-Day Mega Test Available!*\nCovers Day ${rangeStart}-${rangeEnd}. Use /test to take it.`;
    }
    return null;
  }

  bot.command("test", async (ctx) => {
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const user = await getDoc(sa, projectId, userDoc(userId));
    if (!user) {
      await ctx.reply("Please /start first!");
      return;
    }

    const day = user.currentDay - 1; // last completed day
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
        `Current progress: Day ${day}`
      );
      return;
    }

    // Gather questions from all days in range
    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const allQuestions = [];
    for (let d = rangeStart; d <= day; d++) {
      const dayQ = curriculum?.days?.[String(d)]?.quiz;
      if (dayQ) {
        dayQ.forEach(q => allQuestions.push({ ...q, fromDay: d }));
      }
    }

    if (allQuestions.length === 0) {
      await ctx.reply(`No quiz questions available for Days ${rangeStart}-${day}.`);
      return;
    }

    // Take a random sample (max 15 questions)
    const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 15);

    quizSessions.set(userId, {
      day: -1, // special: periodic test
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
      `Ready?`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // ════════════════════════════════════════════════════════════════════════
  // Progress
  // ════════════════════════════════════════════════════════════════════════

  bot.callbackQuery("progress", async (ctx) => {
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const user = await getDoc(sa, projectId, userDoc(userId));
    if (!user) {
      await ctx.answerCallbackQuery("Please /start first!");
      return;
    }

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const totalDays = Object.keys(curriculum?.days ?? {}).length || 100;
    const completed = user.completedDays?.length || 0;
    const pct = Math.round((completed / totalDays) * 100);

    // Build progress bar
    const barLen = 10;
    const filled = Math.round((pct / 100) * barLen);
    const bar = "█".repeat(filled) + "░".repeat(barLen - filled);

    const avgScore = user.scores
      ? Math.round(Object.values(user.scores).reduce((a, b) => a + b, 0) / Object.values(user.scores).length)
      : 0;

    let msg =
      `📊 *Your Progress*\n\n` +
      `📅 Current Day: *${user.currentDay}*/${totalDays}\n` +
      `✅ Completed: *${completed}* days\n` +
      `Progress: ${bar} *${pct}%*\n\n` +
      `⭐ XP: *${user.totalXp || 0}*\n` +
      `🔥 Streak: *${user.streak || 0}* days\n` +
      `📝 Avg Quiz Score: *${avgScore}%*\n`;

    const kb = new InlineKeyboard()
      .text("🏠 Back to Menu", "back_menu");

    await ctx.editMessageText(msg, { parse_mode: "Markdown", reply_markup: kb });
    await ctx.answerCallbackQuery();
  });

  // ════════════════════════════════════════════════════════════════════════
  // Learning Path
  // ════════════════════════════════════════════════════════════════════════

  bot.callbackQuery("path", async (ctx) => {
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const user = await getDoc(sa, projectId, userDoc(userId));
    if (!user) {
      await ctx.answerCallbackQuery("Please /start first!");
      return;
    }

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const days = curriculum?.days ?? {};
    const phases = curriculum?.phases ?? [];
    const completed = new Set(user.completedDays || []);

    let msg = `🗺️ *Your Learning Path*\n\n`;

    // Show phases and their days
    phases.forEach((phase) => {
      const phaseDays = phase.dayIds || phase.days || [];
      const phaseCompleted = phaseDays.filter(d => completed.has(d)).length;
      const phaseTotal = phaseDays.length;

      msg += `${phase.icon || "📚"} *${phase.name}*\n`;
      msg += `Progress: ${phaseCompleted}/${phaseTotal}\n`;

      // Show last few days
      phaseDays.slice(0, 5).forEach(d => {
        const dayData = days[String(d)];
        const done = completed.has(d);
        msg += `  ${done ? "✅" : "⬜"} Day ${d}: ${dayData?.title || "..."}\n`;
      });
      if (phaseDays.length > 5) msg += `  ... and ${phaseDays.length - 5} more\n`;
      msg += `\n`;
    });

    const kb = new InlineKeyboard().text("🏠 Back to Menu", "back_menu");
    await ctx.editMessageText(msg, { parse_mode: "Markdown", reply_markup: kb });
    await ctx.answerCallbackQuery();
  });

  // ════════════════════════════════════════════════════════════════════════
  // AI Chat
  // ════════════════════════════════════════════════════════════════════════

  bot.callbackQuery("ai_chat", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `🤖 *AI Tutor*\n\n` +
      `Send me any question about your lessons!\n\n` +
      `Examples:\n` +
      `• "What are Python variables?"\n` +
      `• "Explain Day 5 topic"\n` +
      `• "Give me a practice exercise"`,
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

  // Handle text messages (AI chat)
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const userId = String(ctx.from.id);

    // Skip commands
    if (text.startsWith("/")) return;

    // Check if this is a quiz answer (shouldn't happen with inline keyboards, but safety)
    const session = quizSessions.get(userId);
    if (session) {
      await ctx.reply("Please use the buttons above to answer the quiz! 🎯");
      return;
    }

    // Forward to AI
    await ctx.replyWithChatAction("typing");

    try {
      const aiResponse = await callAI(env, text);
      await ctx.reply(aiResponse, { parse_mode: "Markdown" });
    } catch {
      await ctx.reply(
        "🤖 AI is temporarily unavailable. Try again in a moment!\n\n" +
        "You can also ask me:\n" +
        "• /start — Go to main menu\n" +
        "• /day — View today's links\n" +
        "• /test — Take a periodic test"
      );
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // Admin Commands (secret: "kkj")
  // ════════════════════════════════════════════════════════════════════════

  bot.command("admin", async (ctx) => {
    const userId = String(ctx.from.id);
    const adminIds = (env.ADMIN_TELEGRAM_IDS || "").split(",").map(s => s.trim());

    if (!adminIds.includes(userId)) {
      await ctx.reply("⛔ Access denied.");
      return;
    }

    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;
    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const dayCount = Object.keys(curriculum?.days ?? {}).length;

    // Count users
    // (simplified — in production you'd query bot_users collection)

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
      `Choose an action:`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

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
      `\`\`\`\`\n\n` +
      `Example:\n` +
      `\`/addlinks 5\`\n` +
      `\`\`\`\n` +
      `title: Python Variables\n` +
      `desc: Variables and data types\n` +
      `yt1: https://youtube.com/watch?v=abc | Variables 101 | CodeWithHarry\n` +
      `\`\`\``,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("addlinks", async (ctx) => {
    const userId = String(ctx.from.id);
    const adminIds = (env.ADMIN_TELEGRAM_IDS || "").split(",").map(s => s.trim());
    if (!adminIds.includes(userId)) {
      await ctx.reply("⛔ Admin only.");
      return;
    }

    const parts = ctx.message.text.split("\n");
    const header = parts[0];
    const dayNum = header.replace("/addlinks", "").trim();

    if (!dayNum || isNaN(parseInt(dayNum))) {
      await ctx.reply("Usage: /addlinks DAY_NUMBER followed by content on new lines.");
      return;
    }

    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    // Parse content
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

    // Update curriculum
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
      `\`\`\`\n\n` +
      `A = options separated by |\n` +
      `C = correct answer index (0-based)\n` +
      `Q = question text`,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("addquiz", async (ctx) => {
    const userId = String(ctx.from.id);
    const adminIds = (env.ADMIN_TELEGRAM_IDS || "").split(",").map(s => s.trim());
    if (!adminIds.includes(userId)) {
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

    // Parse questions
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

    // Update curriculum
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

  // Admin: Sync from web
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

  // ════════════════════════════════════════════════════════════════════════
  // Back to Menu
  // ════════════════════════════════════════════════════════════════════════

  bot.callbackQuery("back_menu", async (ctx) => {
    // Re-trigger /start
    await ctx.answerCallbackQuery();
    // Simulate /start
    const userId = String(ctx.from.id);
    const sa = getSA(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const user = await getDoc(sa, projectId, userDoc(userId));
    if (!user) {
      await ctx.reply("Send /start to begin!");
      return;
    }

    const curriculum = await getDoc(sa, projectId, CURRICULUM_DOC);
    const totalDays = Object.keys(curriculum?.days ?? {}).length || 100;
    const day = user.currentDay;
    const completed = user.completedDays?.length || 0;

    const kb = new InlineKeyboard()
      .text("📚 Today's Links", `day_${day}`)
      .row()
      .text("🧪 Take Quiz", `quiz_${day}`)
      .row()
      .text("🤖 Ask AI", "ai_chat")
      .row()
      .text("📊 My Progress", "progress")
      .text("🗺️ Learning Path", "path");

    await ctx.editMessageText(
      `🎓 *Computer Skills Academy*\n\n` +
      `Welcome, *${user.name}*!\n\n` +
      `📅 Day *${day}* of ${totalDays} | ✅ ${completed} done | ⭐ ${user.totalXp || 0} XP`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  return bot;
}

// ── AI Integration ────────────────────────────────────────────────────────

async function callAI(env, prompt) {
  const baseUrl = env.MIMO_BASE_URL || "https://opencode.ai/zen/v1";
  const model = env.MIMO_MODEL || "mimo-v2.5-free";
  const apiKey = env.MIMO_API_KEY || env.NVIDIA_API_KEY || "";

  if (!apiKey) throw new Error("No AI API key configured");

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
        messages: [
          {
            role: "system",
            content: "You are a friendly tutor at Computer Skills Academy. Help students learn about computers, programming, and AI. Keep answers concise and in simple English with Indian context. Use examples. If asked about a video topic, explain it clearly.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
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
  if (nvidiaKey) {
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
            {
              role: "system",
              content: "You are a friendly tutor at Computer Skills Academy. Help students learn about computers, programming, and AI. Keep answers concise and in simple English with Indian context.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 1024,
          temperature: 0.7,
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

  throw new Error("All AI models failed — check MIMO_API_KEY or NVIDIA_API_KEY in Worker secrets");
}

// ── Export for Cloudflare Worker ───────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    // Only accept POST (Telegram webhooks)
    if (request.method !== "POST") {
      return new Response("CSA Telegram Bot is running! 🎓", { status: 200 });
    }

    try {
      const bot = createBot(env);
      // Handle the webhook update
      const update = await request.json();
      await bot.handleUpdate(update);
      return new Response("ok", { status: 200 });
    } catch (err) {
      console.error("Bot error:", err);
      return new Response("ok", { status: 200 }); // Always 200 to Telegram
    }
  },
};
