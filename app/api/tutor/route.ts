// ============================================================
// Computer Skills Academy - Tutor API Route
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getLessonByDay, CURRICULUM } from "@/lib/curriculum";
import { searchWeb } from "@/lib/search";
import { searchYouTube, searchHindiYouTube, summarizeYouTubeVideo } from "@/lib/youtube";
import { runCompletion, runStreamingCompletion } from "@/lib/ai-client";
import { MODEL_ASSIGNMENTS, MODELS } from "@/constants/models";
import type { ModelId } from "@/constants/models";
import type { TutorApiRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: TutorApiRequest = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    if (action === "get_lesson") return await handleGetLesson(body);
    if (action === "get_test") return await handleGetTest(body);
    if (action === "evaluate_test") return await handleEvaluateTest(body);
    if (action === "chat") return await handleChat(body);
    if (action === "summarize_video") return await handleSummarizeVideo(body);
    if (action === "get_resources") return await handleGetResources(body);
    if (action === "get_daily_tech") return await handleGetDailyTech(body);
    if (action === "get_daily_tech_quick") return await handleGetDailyTechQuick(body);
    if (action === "get_weekly_quiz") return await handleWeeklyQuiz(body);
    if (action === "evaluate_weekly_quiz") return await handleEvaluateWeeklyQuiz(body);
    if (action === "admin_action") return await handleAdminAction(body);
    if (action === "get_transcript") return await handleGetTranscript(body);
    if (action === "video_checkpoints") return await handleVideoCheckpoints(body);
    if (action === "video_ask_ai") return await handleVideoAskAi(body);
    if (action === "video_jump_to") return await handleVideoJumpTo(body);
    if (action === "admin_transcribe_video") return await handleAdminTranscribeVideo(body);
    if (action === "admin_generate_lesson") return await handleAdminGenerateLesson(body);
    if (action === "admin_generate_curriculum") return await handleAdminGenerateCurriculum(body);
    if (action === "admin_get_all_days") return await handleAdminGetAllDays(body);
    if (action === "admin_auto_fill_link") return await handleAdminAutoFillLink(body);
    if (action === "admin_generate_full_curriculum") return await handleAdminGenerateFullCurriculum(body);
    if (action === "admin_test_model") return await handleAdminTestModel(body);

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[Tutor API] Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── GET LESSON (streaming) ─────────────────────────────────────────────────

async function handleGetLesson(body: TutorApiRequest) {
  const { day = 1, learnerProfile } = body;

  const lessonMeta = getLessonByDay(day);
  if (!lessonMeta) {
    return NextResponse.json({ error: `Lesson for Day ${day} not found` }, { status: 404 });
  }

  const [hindiVideos, englishVideos, webArticles] = await Promise.all([
    searchHindiYouTube(`${lessonMeta.title} computer tutorial Hindi`),
    searchYouTube(`${lessonMeta.title} beginner tutorial easy`),
    searchWeb(`${lessonMeta.title} beginner guide article blog simple explanation`),
  ]);

  const resourceBlock = `
REAL RESOURCES (use ONLY these exact URLs — do NOT invent new ones):

🎬 Hindi YouTube:
${hindiVideos.map((v) => `- [${v.title}] ${v.url ?? `https://youtube.com/watch?v=${v.videoId}`} (Channel: ${v.channelName ?? v.channelTitle})`).join("\n") || "None found"}

🎬 English YouTube:
${englishVideos.map((v) => `- [${v.title}] ${v.url ?? `https://youtube.com/watch?v=${v.videoId}`} (Channel: ${v.channelName ?? v.channelTitle})`).join("\n") || "None found"}

🌐 Articles:
${webArticles.map((a) => `- [${a.title}] ${a.url}`).join("\n") || "None found"}
`.trim();

  const prompt = `You are "Computer Skills Academy," a world-class AI tutor teaching in clear, friendly Indian English.

LEARNER PROFILE: ${learnerProfile ?? "a complete beginner starting from zero"}

Generate the COMPLETE lesson for Day ${day}: "${lessonMeta.title}"
Phase: ${lessonMeta.phase} | Difficulty: ${lessonMeta.difficulty} | Est. Time: ${lessonMeta.estimatedMinutes} min

CRITICAL RULES:
- Write everything in clear, friendly INDIAN ENGLISH (not Hinglish, not Hindi)
- Use simple vocabulary that an Indian student can easily understand
- Include Indian real-life analogies (cricket, Bollywood, chai, dabbawala, Indian railways, etc.)
- Define every technical term BEFORE using it
- Your response must be IMMEDIATELY readable educational content — NO internal thinking, NO numbered analysis steps, NO meta-commentary
- Start directly with the lesson content, nothing else
- ABSOLUTE RULE — DO NOT WRITE ANY "Resources", "Recommended Resources", "Useful Links", or "References" section, heading, or list ANYWHERE in your response, in any format (no headings, no numbered list, no links). The app shows real clickable video/article cards separately — your job ends at the Progress Tracker line. If you write resource links yourself, they will render as broken text and confuse the student.
- Your response MUST end immediately after the "Progress Tracker" line below. Do not add anything after it.

FORMAT YOUR RESPONSE IN EXACTLY THIS ORDER (use beautiful Markdown with emojis):

# 📅 Day ${day}: ${lessonMeta.title}

## 📊 Lesson Overview
- **Difficulty:** ${lessonMeta.difficulty}
- **Estimated Study Time:** ~${lessonMeta.estimatedMinutes} minutes
- **Phase ${lessonMeta.phase}:** ${lessonMeta.topics.slice(0, 3).join(", ")}

## 🎯 Prerequisites & Learning Objectives
[List 2-3 prerequisites, then 4-5 clear learning objectives as bullet points]

## 📖 Simple Explanation
[Explain the entire topic in clear, friendly Indian English. Imagine teaching a student who knows NOTHING about this topic. Define every technical word BEFORE using it. Use Indian real-life analogies (cricket, Bollywood, Indian railways, local shops, etc.). This section should be thorough and detailed — at least 500 words. Use paragraphs, bullet points, bold highlights, and sub-sections as needed.]

## 💡 Real-Life Analogies
[3-4 creative, relatable examples connecting the concept to everyday Indian life]

## 📚 Key Terms Dictionary
[A glossary table with Term | Meaning | Example for ALL important words introduced today]

## 🛠️ Step-by-Step Practical Exercises
[3-5 numbered exercises the student can do RIGHT NOW on their computer. Be specific with exact steps.]

## ✅ Today's Task
[One clear, achievable task to complete before tomorrow]

## 🚀 Optional Challenge (For Advanced Learners)
[A harder challenge for curious students]

## ⚠️ Common Mistakes to Avoid
[5-6 bullet points of typical beginner mistakes on this topic]

## 🔭 Tomorrow's Preview — Day ${day + 1}
[Brief, exciting teaser about what's coming next]

---
💻 **Computer Skills Academy — Progress Tracker**
**Day ${day} | ${lessonMeta.title} | Phase ${lessonMeta.phase} | UNLOCKED ✅**

DO NOT write a "Recommended Resources" section yourself — the app already renders real, clickable video/article cards separately below the lesson using this data:
${resourceBlock}
Do not repeat these links or a resources list inside your markdown response; just end after the progress tracker line above.`;

  const lessonStream = runStreamingCompletion({
    model: MODEL_ASSIGNMENTS.lesson,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 10000,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const SENTINEL = "\n\n<<<RESOURCES_JSON>>>\n";
  const resourceMeta = JSON.stringify({ hindiVideos, englishVideos, webArticles });

  // Safety net: some models ignore the "don't write resources" instruction and
  // append their own (often broken/unclickable) resources section anyway. We
  // watch the streamed text line-by-line for a HEADING that names such a
  // section, and truncate everything from there onward — the app already
  // renders real resource cards separately. Only real heading-shaped lines
  // are checked (not arbitrary prose) to avoid false positives.
  const HEADING_SHAPE = /^(#{1,6}\s|📎|\*\*[^*]{1,80}\*\*\s*$|\d+\.\s*$|\d+\s*$)/;
  const BANNED_KEYWORDS = /(recommended|suggested|useful|helpful|extra)\s+resources\b|\bresources\b.*\blinks?\b|\breferences\b|\buseful\s+links\b/i;
  // Some models leak the raw instruction/prompt text itself instead of (or alongside)
  // a heading — these plain-prose phrases are unambiguous signs of a leaked resource
  // block and are safe to truncate on regardless of line shape.
  const LEAKED_PROSE = /(use only these|real,?\s*verified resources|best hindi\/?hinglish youtube|best english youtube|practice site|quiz site|official docs?\b.*resource)/i;

  function isBannedHeadingLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (LEAKED_PROSE.test(trimmed)) return true;
    return HEADING_SHAPE.test(trimmed) && BANNED_KEYWORDS.test(trimmed);
  }

  const combined = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = lessonStream.getReader();
      let carry = "";
      let stopped = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (stopped) continue; // drain the reader without enqueueing more
          const text = carry + decoder.decode(value, { stream: true });
          const lines = text.split("\n");
          carry = lines.pop() ?? ""; // last (possibly incomplete) line held back
          let out = "";
          for (const line of lines) {
            if (isBannedHeadingLine(line)) {
              stopped = true;
              break;
            }
            out += line + "\n";
          }
          if (out) controller.enqueue(encoder.encode(out));
          if (stopped) { carry = ""; continue; }
        }
        if (!stopped && carry && !isBannedHeadingLine(carry)) {
          controller.enqueue(encoder.encode(carry));
        }
      } finally {
        reader.releaseLock();
      }
      controller.enqueue(encoder.encode(SENTINEL + resourceMeta));
      controller.close();
    },
  });

  return new Response(combined, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache",
    },
  });
}

// ── GET TEST ───────────────────────────────────────────────────────────────

async function handleGetTest(body: TutorApiRequest) {
  const { day = 1, learnerProfile, weakTopics } = body;

  const lessonMeta = getLessonByDay(day);
  if (!lessonMeta) {
    return NextResponse.json({ error: `Lesson for Day ${day} not found` }, { status: 404 });
  }

  const spacedRep =
    weakTopics && weakTopics.length > 0
      ? `Also include 1-2 spaced repetition questions from these previously weak topics: ${weakTopics.slice(0, 5).join(", ")}.`
      : "";

  // ── Fetch YouTube transcripts for video-based quiz questions ──
  let videoContext = "";
  try {
    const videos = await searchYouTube(`${lessonMeta.title} tutorial beginner`, 3);
    if (videos.length > 0) {
      const { fetchTranscriptMultiLang } = await import("@/lib/youtube");
      const transcripts: string[] = [];
      for (const video of videos.slice(0, 2)) {
        try {
          const transcript = await fetchTranscriptMultiLang(video.videoId);
          if (transcript && transcript.trim().length > 50) {
            transcripts.push(`Video: "${video.title}"\nTranscript excerpt:\n${transcript.split(" ").slice(0, 500).join(" ")}`);
          }
        } catch {
          // skip failed transcript
        }
      }
      if (transcripts.length > 0) {
        videoContext = `\n\nVIDEO TRANSCRIPT CONTEXT (use for 2 questions per difficulty level):\n${transcripts.join("\n\n")}\n`;
      }
    }
  } catch {
    // video fetch failure is non-fatal
  }

  const prompt = `You are "Computer Skills Academy," a strict examiner testing on Day ${day}: "${lessonMeta.title}".
Learner: ${learnerProfile ?? "beginner"}
${spacedRep}
${videoContext}

Generate a comprehensive 12-question assessment with EXACTLY this difficulty distribution:
- 3 Easy questions
- 3 Medium questions
- 3 Intermediate questions
- 3 Tough questions

CRITICAL: For EACH difficulty level (easy, medium, intermediate, tough):
- 2 questions MUST be based on the VIDEO TRANSCRIPT CONTEXT above (if available)
- 1 question MUST be based on general curriculum knowledge of the topic

Question types should include: mcq (multiple choice), fib (fill-in-blank), tf (true/false), scenario (practical scenario), and viva (open-ended explanation).

Return ONLY valid JSON:
{
  "title": "Day ${day} Assessment — ${lessonMeta.title}",
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "difficulty": "easy",
      "hint": "Short hint"
    },
    {
      "id": "q2",
      "type": "fib",
      "question": "Fill in the blank: _______ is the _______ of computers.",
      "options": [],
      "difficulty": "easy",
      "hint": "Think about today's main concept"
    },
    {
      "id": "q3",
      "type": "tf",
      "question": "True or False: [statement about the topic]",
      "options": ["True", "False"],
      "difficulty": "easy",
      "hint": "Think carefully"
    },
    {
      "id": "q4",
      "type": "mcq",
      "question": "Medium difficulty MCQ based on video",
      "options": ["A", "B", "C", "D"],
      "difficulty": "medium",
      "hint": "hint"
    },
    {
      "id": "q5",
      "type": "scenario",
      "question": "Medium scenario question based on video content",
      "options": ["A", "B", "C"],
      "difficulty": "medium",
      "hint": "Apply what you learned from the video"
    },
    {
      "id": "q6",
      "type": "viva",
      "question": "Medium viva question on curriculum topic",
      "options": [],
      "difficulty": "medium",
      "hint": "Use examples from the lesson"
    },
    {
      "id": "q7",
      "type": "mcq",
      "question": "Intermediate MCQ from video",
      "options": ["A", "B", "C", "D"],
      "difficulty": "intermediate",
      "hint": "Think deeper about the video content"
    },
    {
      "id": "q8",
      "type": "scenario",
      "question": "Intermediate scenario based on video",
      "options": ["A", "B", "C"],
      "difficulty": "intermediate",
      "hint": "Apply concepts from the video"
    },
    {
      "id": "q9",
      "type": "fib",
      "question": "Intermediate fill-in-blank from curriculum",
      "options": [],
      "difficulty": "intermediate",
      "hint": "Deep knowledge needed"
    },
    {
      "id": "q10",
      "type": "mcq",
      "question": "Tough MCQ from video transcript",
      "options": ["A", "B", "C", "D"],
      "difficulty": "tough",
      "hint": "Expert level"
    },
    {
      "id": "q11",
      "type": "viva",
      "question": "Tough viva from video — explain in depth",
      "options": [],
      "difficulty": "tough",
      "hint": "Comprehensive answer expected"
    },
    {
      "id": "q12",
      "type": "scenario",
      "question": "Tough real-world scenario from curriculum",
      "options": ["A", "B", "C", "D"],
      "difficulty": "tough",
      "hint": "Expert-level problem solving"
    }
  ]
}

Questions must be accurate, challenging, and directly test Day ${day}'s content: ${lessonMeta.topics.join(", ")}.
${videoContext ? "PRIORITIZE questions from the video transcripts — they test whether the student actually watched and understood the videos." : ""}`;

  const raw = await runCompletion({
    model: MODEL_ASSIGNMENTS.quiz,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    maxTokens: 2500,
    jsonMode: true,
  });

  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    console.error("[Quiz] JSON parse failed:", raw.slice(0, 300));
    return NextResponse.json({ error: "Failed to generate quiz", raw }, { status: 500 });
  }
}

// ── EVALUATE TEST ──────────────────────────────────────────────────────────

async function handleEvaluateTest(body: TutorApiRequest) {
  const { day = 1, learnerProfile, currentQuestionSet, userAnswers } = body;

  const lessonMeta = getLessonByDay(day);
  if (!lessonMeta) {
    return NextResponse.json({ error: `Lesson for Day ${day} not found` }, { status: 404 });
  }

  const nextDay = CURRICULUM.find((c) => c.day === day + 1);

  const prompt = `You are "Computer Skills Academy," a strict but kind evaluator for Day ${day}: "${lessonMeta.title}".
Learner: ${learnerProfile ?? "beginner"}

There are 12 questions total. Difficulty distribution: 3 easy + 3 medium + 3 intermediate + 3 tough.

QUESTIONS:
${JSON.stringify(currentQuestionSet?.questions ?? [], null, 2)}

STUDENT ANSWERS:
${JSON.stringify(userAnswers ?? {}, null, 2)}

EVALUATION RULES:
- MCQ/FIB/TF: Check absolute correctness
- Scenario/Viva: Evaluate logical reasoning, accuracy, completeness
- Scoring: Each correct answer = 1 point. Total out of 12.
- PASS THRESHOLD: 70% (9 or more correct out of 12 = pass)
- 9 or fewer correct = fail
- For EACH question, provide: isCorrect, correctAnswer, explanation
- For WRONG answers, provide a detailed explanation in friendly Indian English + what they should have answered
- weakTopicsAdded: list specific sub-topics they got wrong
- Give encouraging mentor message

Return ONLY valid JSON:
{
  "passed": false,
  "overallScore": 0,
  "totalQuestions": 12,
  "correctCount": 0,
  "feedback": [
    {
      "questionId": "q1",
      "isCorrect": true,
      "correctAnswer": "The correct answer",
      "studentAnswer": "What they wrote",
      "explanation": "Brief explanation in friendly Indian English"
    }
  ],
  "weakTopicsAdded": ["specific topics they struggled with"],
  "mentorMessage": "Encouraging message in Indian English. If passed: congratulate and preview '${nextDay?.title ?? "the next lesson"}'. If failed: motivate them to revise and try again."
}`;

  const raw = await runCompletion({
    model: MODEL_ASSIGNMENTS.evaluate,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    maxTokens: 2500,
    jsonMode: true,
  });

  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    console.error("[Evaluation] JSON parse failed:", raw.slice(0, 300));
    return NextResponse.json({ error: "Failed to evaluate test", raw }, { status: 500 });
  }
}

// ── CHAT ───────────────────────────────────────────────────────────────────

async function handleChat(body: TutorApiRequest) {
  const { day = 0, learnerProfile, weakTopics, chatHistory = [], chatModel } = body;

  const resolvedModel = (chatModel as ModelId | undefined) ?? MODEL_ASSIGNMENTS.chat;

  // Search web to augment the answer
  let webContext = "";
  const lastMsg = chatHistory[chatHistory.length - 1];
  if (lastMsg?.role === "user" && lastMsg.content.length > 8) {
    try {
      const results = await searchWeb(lastMsg.content, 3);
      if (results.length > 0) {
        webContext =
          "\n\nRELEVANT WEB CONTEXT (use to enhance your answer):\n" +
          results.map((r) => `- ${r.title}: ${r.description ?? r.snippet ?? ""}`).join("\n");
      }
    } catch {
      /* search failure is non-fatal */
    }
  }

  const systemPrompt = `You are "Computer Skills Academy," an elite, patient AI mentor for Indian students.
Learner Profile: ${learnerProfile ?? "a complete beginner"}
Current Day in Curriculum: Day ${day}
Weak Topics (for spaced repetition context): ${weakTopics?.join(", ") || "None yet"}

Default language: Clear, friendly Indian English.
IMPORTANT: Respond in INDIAN ENGLISH by default. Only use Hindi or Hinglish if the student explicitly asks you to do so.

Rules:
- Define every technical term before using it
- Use relatable Indian analogies (cricket, Bollywood, Indian railways, chai stalls, local examples)
- Be warm, encouraging, and thorough
- Use code examples with proper syntax highlighting when helpful
- Keep answers well-structured with headers if the answer is long
- Never skip explaining prerequisites${webContext}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...chatHistory.slice(-12).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
  ];

  const reply = await runCompletion({
    model: resolvedModel,
    messages,
    temperature: 0.75,
    maxTokens: 2000,
  });

  return NextResponse.json({ reply, modelUsed: resolvedModel });
}

// ── GET RESOURCES (for cached lesson re-load) ──────────────────────────────

async function handleGetResources(body: TutorApiRequest) {
  const { day = 1 } = body;
  const lessonMeta = getLessonByDay(day);
  if (!lessonMeta) {
    return NextResponse.json({ error: `Lesson for Day ${day} not found` }, { status: 404 });
  }

  const [hindiVideos, englishVideos, webArticles] = await Promise.all([
    searchHindiYouTube(lessonMeta.title),
    searchYouTube(lessonMeta.title),
    searchWeb(`${lessonMeta.title} beginner tutorial guide`),
  ]);

  return NextResponse.json({ hindiVideos, englishVideos, webArticles });
}

// ── SUMMARIZE VIDEO ────────────────────────────────────────────────────────

async function handleSummarizeVideo(body: TutorApiRequest) {
  const { videoId, videoTitle } = body;
  if (!videoId) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  const summary = await summarizeYouTubeVideo(videoId, videoTitle ?? "Unknown");
  return NextResponse.json({ summary });
}

// ── DAILY TECH BRIEFING ─────────────────────────────────────────────────────

async function handleGetDailyTech(body: TutorApiRequest) {
  const { day = 1 } = body;
  const { getDailyTechBriefing } = await import("@/lib/daily-tech");
  const briefing = await getDailyTechBriefing(day);
  return NextResponse.json({ briefing });
}

async function handleGetDailyTechQuick(body: TutorApiRequest) {
  const { techCategory = "general" } = body;
  const { quickTechSearch } = await import("@/lib/daily-tech");
  const items = await quickTechSearch(techCategory, 5);
  return NextResponse.json({ items });
}

// ── WEEKLY QUIZ ─────────────────────────────────────────────────────────────
// Generates a 50-question quiz covering the previous 7 days of curriculum.
// Pass threshold: 80% (40/50). Wrong answers get explanations + recommendations.

async function handleWeeklyQuiz(body: TutorApiRequest) {
  const { day = 1, learnerProfile, weakTopics } = body;
  const { QUIZ_CONFIG } = await import("@/types");

  // Gather topics from the previous 7 days
  const startDay = Math.max(1, day - 7);
  const weekDays: number[] = [];
  for (let d = startDay; d < day; d++) {
    weekDays.push(d);
  }

  const weekTopics = weekDays
    .map((d) => {
      const meta = getLessonByDay(d);
      return meta ? `Day ${d}: ${meta.title} (${meta.topics.join(", ")})` : null;
    })
    .filter(Boolean);

  const prompt = `You are "Computer Skills Academy," creating a WEEKLY TEST covering Days ${startDay} to ${day - 1}.
Learner: ${learnerProfile ?? "beginner"}
Weak Topics (prioritize these): ${weakTopics?.slice(0, 10).join(", ") || "None"}

WEEK'S CURRICULUM:
${weekTopics.join("\n")}

Generate a comprehensive 50-question test with this difficulty distribution:
- 15 Easy questions (basics, definitions, true/false)
- 15 Medium questions (application, scenarios)
- 15 Intermediate questions (analysis, comparison, multi-step)
- 5 Tough questions (expert-level, deep understanding)

Mix question types: mcq, fib, tf, scenario. Every question MUST be multiple-choice or true/false (no viva/open-ended).

Return ONLY valid JSON:
{
  "title": "Weekly Test — Days ${startDay}-${day - 1}",
  "questions": [
    {
      "id": "wq1",
      "type": "mcq",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "difficulty": "easy",
      "day": ${startDay},
      "topic": "topic name"
    }
  ]
}

Questions must be accurate and test real understanding, not just memorization.`;

  const raw = await runCompletion({
    model: MODEL_ASSIGNMENTS.quiz,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    maxTokens: 8000,
    jsonMode: true,
  });

  try {
    const quiz = JSON.parse(raw);
    return NextResponse.json(quiz);
  } catch {
    console.error("[Weekly Quiz] JSON parse failed:", raw.slice(0, 300));
    return NextResponse.json({ error: "Failed to generate weekly quiz", raw }, { status: 500 });
  }
}

// ── EVALUATE WEEKLY QUIZ ─────────────────────────────────────────────────────

async function handleEvaluateWeeklyQuiz(body: TutorApiRequest) {
  const { day = 1, learnerProfile, currentQuestionSet, userAnswers } = body;
  const { QUIZ_CONFIG } = await import("@/types");
  const totalQuestions = QUIZ_CONFIG.weekly.totalQuestions; // 50
  const passPercent = QUIZ_CONFIG.weekly.passPercent; // 80

  const prompt = `You are "Computer Skills Academy," evaluating a WEEKLY TEST (50 questions).
Learner: ${learnerProfile ?? "beginner"}

QUESTIONS:
${JSON.stringify(currentQuestionSet?.questions?.slice(0, 30) ?? [], null, 2)}
... (${totalQuestions} total questions)

STUDENT ANSWERS:
${JSON.stringify(userAnswers ?? {}, null, 2)}

EVALUATION RULES:
- Score = number of correct answers. Total out of ${totalQuestions}.
- PASS: ${passPercent}% (${Math.round(totalQuestions * passPercent / 100)}+ correct)
- FAIL: less than ${passPercent}%
- For EVERY WRONG answer, provide:
  - Correct answer
  - Detailed explanation in friendly Indian English
  - A YouTube video recommendation URL for learning (use real, popular tutorial URLs)
  - A blog/article URL for reading (use real URLs like geeksforgeeks.org, w3schools.com, tutorialspoint.com)
- weakTopicsAdded: list ALL weak topics found

Return ONLY valid JSON:
{
  "passed": false,
  "overallScore": 0,
  "totalQuestions": ${totalQuestions},
  "correctCount": 0,
  "wrongAnswers": [
    {
      "questionId": "wq1",
      "question": "The question text",
      "correctAnswer": "Correct answer",
      "studentAnswer": "What they answered",
      "explanation": "Detailed explanation in friendly Indian English",
      "videoRecommendation": "https://youtube.com/watch?v=...",
      "blogRecommendation": "https://..."
    }
  ],
  "weakTopicsAdded": [],
  "mentorMessage": "Encouraging feedback in friendly Indian English"
}`;

  const raw = await runCompletion({
    model: MODEL_ASSIGNMENTS.evaluate,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    maxTokens: 8000,
    jsonMode: true,
  });

  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    console.error("[Weekly Eval] JSON parse failed:", raw.slice(0, 300));
    return NextResponse.json({ error: "Failed to evaluate weekly quiz", raw }, { status: 500 });
  }
}

// ── VIDEO PLAYER FEATURES ────────────────────────────────────────────────────

const CF_TRANSCRIPT = "https://flat-bird-6bd4.koush3069.workers.dev/api/transcript";

async function handleGetTranscript(body: TutorApiRequest) {
  const { videoId } = body;
  if (!videoId) return NextResponse.json({ segments: [] });

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  for (const lang of ["en", "hi", ""]) {
    try {
      const params = new URLSearchParams({ url: videoUrl });
      if (lang) params.set("lang", lang);
      const res = await fetch(`${CF_TRANSCRIPT}?${params}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const data = await res.json();
      if ((data.segments ?? []).length > 0) return NextResponse.json(data);
    } catch { /* try next */ }
  }
  return NextResponse.json({ segments: [], title: "", duration: "0:00" });
}

async function handleVideoCheckpoints(body: TutorApiRequest) {
  const { videoTitle, segments } = body;
  if (!segments?.length) return NextResponse.json({ checkpoints: [] });

  const txSample = segments.slice(0, 80)
    .map(s => `[${s.formattedStart}] ${s.text}`).join("\n");

  try {
    const raw = await runCompletion({
      model: MODEL_ASSIGNMENTS.chat,
      messages: [
        {
          role: "system",
          content: `You are an educational AI. Given a video transcript, identify 3-5 moments where a student learning computer science should pause and check their understanding. Return ONLY a valid JSON array (no markdown, no explanation):
[{"time":<seconds>,"formattedStart":"<M:SS>","question":"<short Hinglish question>"}]`,
        },
        {
          role: "user",
          content: `Video: "${videoTitle}"\n\nTranscript:\n${txSample}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 500,
    });
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const checkpoints = JSON.parse(match[0]);
      return NextResponse.json({ checkpoints });
    }
  } catch { /* non-fatal */ }
  return NextResponse.json({ checkpoints: [] });
}

async function handleVideoAskAi(body: TutorApiRequest) {
  const { question, videoTitle, transcript, currentTime, chatHistory } = body;
  const timeStr = currentTime !== undefined
    ? `${Math.floor((currentTime as number) / 60)}:${String(Math.floor((currentTime as number) % 60)).padStart(2, "0")}`
    : "0:00";

  const history = (chatHistory ?? []).map(m => ({ role: m.role, content: m.content }));

  const reply = await runCompletion({
    model: MODEL_ASSIGNMENTS.chat,
    messages: [
      {
        role: "system",
        content: `You are an expert CS tutor for Indian students. The student is watching "${videoTitle}" and is currently at ${timeStr}. You have the full transcript below. Answer in Hinglish (mix of Hindi + English), simply, with examples. Reference timestamps when helpful. Be concise.

TRANSCRIPT:
${transcript ?? "Not available"}`,
      },
      ...history,
      { role: "user", content: question ?? "" },
    ],
    temperature: 0.6,
    maxTokens: 600,
  });
  return NextResponse.json({ reply });
}

async function handleVideoJumpTo(body: TutorApiRequest) {
  const { query, segments } = body;
  if (!query || !segments?.length) {
    return NextResponse.json({ error: "query and segments required" }, { status: 400 });
  }

  const txSample = segments
    .map(s => `[${s.formattedStart}|${Math.floor(s.start)}s] ${s.text}`)
    .join("\n").slice(0, 6000);

  try {
    const raw = await runCompletion({
      model: MODEL_ASSIGNMENTS.chat,
      messages: [
        {
          role: "system",
          content: `You are a transcript search tool. Given a transcript and a query, find where that topic is best explained. Return ONLY valid JSON (no markdown):
{"time":<seconds as integer>,"formattedStart":"<M:SS>","context":"<exact transcript text, max 100 chars>"}`,
        },
        { role: "user", content: `Query: "${query}"\n\nTranscript:\n${txSample}` },
      ],
      temperature: 0.2,
      maxTokens: 200,
    });
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return NextResponse.json(JSON.parse(match[0]));
  } catch { /* fall through */ }
  return NextResponse.json({ error: "Topic not found in transcript" }, { status: 404 });
}

// ── ADMIN MODE ──────────────────────────────────────────────────────────────
// Admin mode is activated by typing "kkj" in the AI chat.
// It provides read-only access to view any student's data for 1 hour.

async function handleAdminAction(body: TutorApiRequest) {
  const { studentId, adminAction } = body as TutorApiRequest & {
    studentId?: string;
    adminAction?: "view_student" | "view_all" | "analytics";
  };

  if (!adminAction) {
    return NextResponse.json({ error: "adminAction is required" }, { status: 400 });
  }

  // Admin actions are processed locally — no AI call needed.
  // The actual data is in localStorage on the client side.
  // This endpoint just validates and provides admin-specific context.

  if (adminAction === "view_student") {
    return NextResponse.json({
      mode: "admin",
      message: `Viewing student: ${studentId ?? "all"}. Admin mode active for 1 hour.`,
      adminCapabilities: [
        "View any student's progress, scores, and weak areas",
        "View quiz results and analytics",
        "Cannot modify student data (read-only)",
      ],
    });
  }

  if (adminAction === "view_all") {
    return NextResponse.json({
      mode: "admin",
      message: "Viewing all students. Admin mode active for 1 hour.",
      students: ["st_1", "st_2"],
    });
  }

  return NextResponse.json({ error: "Unknown admin action" }, { status: 400 });
}

// ── ADMIN: TRANSCRIBE VIDEO ──────────────────────────────────────────────────
// Transcribes a YouTube video and returns the full transcript text.

async function handleAdminTranscribeVideo(body: TutorApiRequest) {
  const { videoId, videoTitle } = body;
  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let fullTranscript = "";

  for (const lang of ["en", "hi", ""]) {
    try {
      const params = new URLSearchParams({ url: videoUrl });
      if (lang) params.set("lang", lang);
      const res = await fetch(`${CF_TRANSCRIPT}?${params}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      const data = await res.json();
      if ((data.segments ?? []).length > 0) {
        fullTranscript = data.segments.map((s: { text: string }) => s.text).join(" ");
        break;
      }
    } catch { /* try next language */ }
  }

  if (!fullTranscript) {
    return NextResponse.json({ transcript: "", message: "No transcript available for this video" });
  }

  // Use AI to clean up and structure the transcript into readable content
  try {
    const cleaned = await runCompletion({
      model: MODEL_ASSIGNMENTS.lesson,
      messages: [
        {
          role: "system",
          content: `You are a transcript processor. Clean up this YouTube video transcript into well-structured, readable educational content. Fix grammar, add proper punctuation, organize into logical paragraphs, and remove filler words (um, uh, like, you know). Keep the original meaning intact. Return ONLY the cleaned transcript text, no headers or markdown.`,
        },
        {
          role: "user",
          content: `Video: "${videoTitle ?? "Unknown"}"\n\nRaw transcript:\n${fullTranscript.slice(0, 8000)}`,
        },
      ],
      temperature: 0.2,
      maxTokens: 4000,
    });
    return NextResponse.json({ transcript: cleaned, videoTitle, videoId });
  } catch {
    return NextResponse.json({ transcript: fullTranscript, videoTitle, videoId });
  }
}

// ── ADMIN: GENERATE LESSON FROM RESOURCES ────────────────────────────────────
// Takes admin-provided resources and generates a complete lesson.

async function handleAdminGenerateLesson(body: TutorApiRequest) {
  const { day = 1, title, topics, resources, transcript } = body;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const resourceBlock = resources?.length
    ? `\n\nADMIN-PROVIDED RESOURCES:\n${resources.map(r => `- [${r.title}] ${r.url} (${r.type})`).join("\n")}`
    : "";

  // Include transcript content in the lesson generation prompt
  const transcriptBlock = transcript
    ? `\n\nVIDEO TRANSCRIPTS (use these to inform the lesson content):\n${transcript.slice(0, 6000)}`
    : "";

  const prompt = `You are "Computer Skills Academy," a world-class AI tutor teaching in clear, friendly Indian English.

Generate a COMPLETE lesson for Day ${day}: "${title}"
Topics: ${topics?.join(", ") ?? title}
${resourceBlock}${transcriptBlock}

CRITICAL RULES:
- Write in clear, friendly INDIAN ENGLISH
- Use Indian real-life analogies (cricket, Bollywood, chai, dabbawala, Indian railways)
- Define every technical term BEFORE using it
- Start directly with lesson content
- DO NOT write any "Resources" section — the app handles that separately
- End after the "Progress Tracker" line

FORMAT:
# 📅 Day ${day}: ${title}

## 🎯 Learning Objectives
[4-5 objectives]

## 📖 Complete Explanation
[Thorough explanation with examples, at least 600 words]

## 💡 Real-Life Analogies
[3-4 Indian analogies]

## 🛠️ Practical Exercises
[3-5 step-by-step exercises]

## ✅ Today's Task
[One clear task]

## ⚠️ Common Mistakes
[5-6 bullet points]

---
💻 **Computer Skills Academy — Progress Tracker**
**Day ${day} | ${title} | UNLOCKED ✅**`;

  const lessonContent = await runStreamingCompletion({
    model: MODEL_ASSIGNMENTS.lesson,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 8000,
  });

  // Read the full stream
  const reader = lessonContent.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullContent += decoder.decode(value, { stream: true });
  }
  reader.releaseLock();

  return NextResponse.json({ lessonContent: fullContent, day, title });
}

// ── ADMIN: GENERATE CURRICULUM ──────────────────────────────────────────────
// Auto-generates a curriculum structure based on admin's topic area.

async function handleAdminGenerateCurriculum(body: TutorApiRequest) {
  const { title, topics } = body;

  const prompt = `You are a curriculum designer for "Computer Skills Academy."

Create a structured curriculum for the topic: "${title ?? "Computer Fundamentals"}"
Topics to cover: ${topics?.join(", ") ?? "general computer skills"}

Generate a JSON array of day objects (5-30 days depending on topic complexity):
{
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "description": "Brief description",
      "difficulty": "beginner|intermediate|advanced",
      "estimatedMinutes": 30,
      "topics": ["topic1", "topic2"]
    }
  ]
}

Rules:
- Start from basics and progress to advanced
- Each day should cover ONE main concept
- Include practical exercises
- Make titles clear and descriptive
- Return ONLY valid JSON`;

  try {
    const raw = await runCompletion({
      model: MODEL_ASSIGNMENTS.lesson,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      maxTokens: 3000,
      jsonMode: true,
    });
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Failed to generate curriculum" }, { status: 500 });
  }
}

// ── ADMIN: GET ALL DAYS ─────────────────────────────────────────────────────
// Returns all managed days for admin overview.

async function handleAdminGetAllDays(_body: TutorApiRequest) {
  return NextResponse.json({ message: "Days managed client-side", totalDays: CURRICULUM.length });
}

// ── ADMIN: AUTO-FILL LINK METADATA ────────────────────────────────────────
// When admin pastes a URL, AI auto-generates title, difficulty, time, description, topics.

async function handleAdminAutoFillLink(body: TutorApiRequest) {
  const { url, title: existingTitle, type } = body;

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

  // Step 1: For YouTube, fetch the actual title + channel via oEmbed API
  let fetchedTitle = existingTitle || "";
  let fetchedChannel = "";
  if (isYouTube) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        fetchedTitle = oembedData.title || fetchedTitle;
        fetchedChannel = oembedData.author_name || "";
      }
    } catch { /* oEmbed failed, continue without it */ }
  }

  // Step 2: Use AI to generate description, difficulty, topics from the URL + title
  const prompt = `You are an education content curator. Analyze this URL and generate metadata for a learning resource.

URL: ${url}
Title: ${fetchedTitle || "Unknown"}
Channel: ${fetchedChannel || "Unknown"}
Type: ${type || (isYouTube ? "youtube" : "web")}

Return a JSON object with these fields:
{
  "title": "Resource title (use the fetched title above)",
  "channelName": "${fetchedChannel || "Channel name"}",
  "description": "2-3 sentence description of what this resource covers",
  "difficulty": "beginner",
  "estimatedMinutes": 30,
  "topics": ["topic1", "topic2", "topic3"],
  "subTopics": [
    { "name": "sub-topic name", "description": "what it covers", "objectives": ["learn X", "apply Y"] }
  ]
}

Rules:
- ALWAYS use the title provided above as the title field
- difficulty: beginner, intermediate, or advanced
- topics: specific learning topics (3-5)
- subTopics: break down each topic (2-3 per topic)
- estimatedMinutes: typical time to consume + practice
- Return ONLY valid JSON`;

  try {
    const raw = await runCompletion({
      model: MODEL_ASSIGNMENTS.lesson,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      maxTokens: 1500,
      jsonMode: true,
    });
    const data = JSON.parse(raw);
    return NextResponse.json({
      title: data.title || fetchedTitle || existingTitle || "Untitled",
      channelName: data.channelName || fetchedChannel || undefined,
      description: data.description || "",
      difficulty: data.difficulty || "beginner",
      estimatedMinutes: data.estimatedMinutes || 30,
      topics: data.topics || [],
      subTopics: data.subTopics || [],
    });
  } catch {
    // Fallback: return at least the fetched title/channel even if AI fails
    return NextResponse.json({
      title: fetchedTitle || existingTitle || "Untitled",
      channelName: fetchedChannel || undefined,
      description: "",
      difficulty: "beginner",
      estimatedMinutes: 30,
      topics: [],
      subTopics: [],
    });
  }
}

// ── ADMIN: GENERATE FULL CURRICULUM ───────────────────────────────────────
// AI generates entire curriculum: phases → days → sub-days → topics.

async function handleAdminGenerateFullCurriculum(body: TutorApiRequest) {
  const { title, topics, description } = body;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const prompt = `You are an expert curriculum designer for "Computer Skills Academy."

Create a COMPLETE curriculum for: "${title}"
${description ? `Description: ${description}` : ""}
${topics?.length ? `Topics to include: ${topics.join(", ")}` : ""}

Generate a JSON object with this EXACT structure:
{
  "title": "${title}",
  "description": "Overall curriculum description",
  "totalDays": 20,
  "phases": [
    {
      "name": "Phase name",
      "icon": "emoji",
      "description": "What this phase covers",
      "color": "#3b82f6",
      "days": [
        {
          "day": 1,
          "title": "Day title",
          "description": "Day description",
          "difficulty": "beginner",
          "estimatedMinutes": 30,
          "topics": ["topic1", "topic2"],
          "subTopics": [
            { "name": "sub-topic", "description": "what it covers", "objectives": ["learn X", "apply Y"] }
          ],
          "subDays": [
            { "suffix": "a", "title": "Theory", "type": "theory", "estimatedMinutes": 15 },
            { "suffix": "b", "title": "Practice", "type": "practice", "estimatedMinutes": 20 },
            { "suffix": "c", "title": "Project", "type": "project", "estimatedMinutes": 25 }
          ]
        }
      ]
    }
  ]
}

Rules:
- Start from basics, progress to advanced
- Each day covers ONE main concept
- Include practical exercises in sub-days
- Sub-days: theory (a), practice (b), project/quiz (c)
- Topics should be specific and actionable
- SubTopics should have clear learning objectives
- Phase icons should be single relevant emojis
- Colors should be visually distinct for each phase
- Return ONLY valid JSON`;

  try {
    const raw = await runCompletion({
      model: MODEL_ASSIGNMENTS.lesson,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      maxTokens: 8000,
      jsonMode: true,
    });
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to generate curriculum" }, { status: 500 });
  }
}

// ── ADMIN: TEST AI MODEL ──────────────────────────────────────────────────
// Tests a specific AI model with a prompt and returns the result.

async function handleAdminTestModel(body: TutorApiRequest) {
  const req = body as TutorApiRequest & { model?: string; message?: string };
  const modelId = (req.model || MODEL_ASSIGNMENTS.chat) as ModelId;
  const testPrompt = req.message || "Hello! Please respond with a short test message confirming you are working.";

  const startTime = Date.now();
  try {
    const raw = await runCompletion({
      model: modelId,
      messages: [{ role: "user", content: testPrompt }],
      temperature: 0.5,
      maxTokens: 500,
    });
    const latencyMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      modelId,
      response: raw,
      latencyMs,
    });
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      success: false,
      modelId,
      error: msg,
      latencyMs,
    });
  }
}
