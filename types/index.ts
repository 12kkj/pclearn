// ============================================================
// Computer Skills Academy - Shared TypeScript Types
// ============================================================

// ── Student Profiles ─────────────────────────────────────────────────────

export type StudentId = "st_1" | "st_2" | "student1" | "student2";

export interface StudentProfile {
  id: StudentId;
  name: string;
  password: string;
  emoji: string;
  description: string;
}

export const STUDENT_PROFILES: Record<StudentId, StudentProfile> = {
  st_1: {
    id: "st_1",
    name: "Student 1",
    password: "1234",
    emoji: "🎓",
    description: "Complete computer fundamentals + programming journey.",
  },
  st_2: {
    id: "st_2",
    name: "Student 2",
    password: "1234",
    emoji: "📚",
    description: "Practical skills, quick career-ready modules, exam prep.",
  },
  student1: {
    id: "student1",
    name: "Student 1",
    password: "1234",
    emoji: "🎓",
    description: "Complete computer fundamentals + programming journey.",
  },
  student2: {
    id: "student2",
    name: "Student 2",
    password: "1234",
    emoji: "📚",
    description: "Practical skills, quick career-ready modules, exam prep.",
  },
};

// ── Admin System ──────────────────────────────────────────────────────────

/** Admin credentials — only Kaushik Jain */
export const ADMIN_CONFIG = {
  username: "kaushik",
  password: "kkj",
  name: "Kaushik Jain",
  role: "admin" as const,
};

export interface AdminSession {
  isActive: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
  viewingStudent: StudentId | null;
}

/** A resource link added by the admin for a specific day */
export interface AdminResourceLink {
  id: string;
  type: "youtube" | "blog" | "web";
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  channelName?: string;
  addedAt: string; // ISO date
}

/** Admin-managed content for a specific day */
export interface AdminDayContent {
  day: number;
  title: string;
  description: string;
  phase: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  topics: string[];
  resources: AdminResourceLink[];
  transcript?: string; // AI-generated transcript from videos
  lessonContent?: string; // AI-generated lesson from transcript
  quizGenerated?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Full admin curriculum state stored in localStorage */
export interface AdminCurriculumState {
  days: Record<number, AdminDayContent>;
  lastUpdated: string;
}

export type AppTab = "lesson" | "assessment" | "chat" | "roadmap" | "analytics";
export type DayState = "locked" | "testing" | "revision" | "unlocked" | "passed";
export type QuestionType = "mcq" | "fill" | "truefalse" | "scenario" | "viva";

export interface StudentState {
  id: StudentId;
  name: string;
  profile: string;
  currentDay: number;
  completedDays: number[];
  testScores: Record<number, number>;
  weakTopics: string[];
  xp: number;
  streak: number;
  lastActiveDate: string;
  chatHistory: ChatMessage[];
  badges: string[];
  lessonCache: Record<number, string>;
}

// ── Learner / Progress ─────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  model?: string; // which model replied
}

export interface LessonSnapshot {
  content?: string;
  resources?: LessonResources;
  quiz?: QuizData;
  notes?: string;
  updatedAt?: number;
}

export interface LearnerState {
  name: string;
  profile: string;
  currentDay: number;
  completedDays: number[];
  testScores: Record<number, number>; // day → score 0-5
  weakTopics: string[];
  xp: number;
  streak: number;
  lastActiveDate: string; // ISO date
  chatHistory: ChatMessage[];
  badges: string[];
  lessonCache: Record<number, string>; // day → cached lesson markdown
  preferredChatModel?: string; // last chosen chat model
  lessonContextByDay?: Record<number, string>;
  lessonSnapshots?: Record<number, LessonSnapshot>;
}

// ── Quiz / Assessment ──────────────────────────────────────────────────────

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string;
  difficulty: "easy" | "medium" | "intermediate" | "tough";
  topic: string;
  isWeakTopic?: boolean;
}

export interface QuizData {
  day: number;
  topic: string;
  questions: Question[];
  generatedAt: number;
}

export interface EvaluationResult {
  passed: boolean;
  score: number; // 0-5
  feedback: string;
  weakTopicsFound: string[];
  answers: Array<{
    questionId: string;
    correct: boolean;
    explanation: string;
  }>;
}

// ── Search / Resources ─────────────────────────────────────────────────────

export interface WebResult {
  title: string;
  url: string;
  snippet?: string;
  description?: string;
  source?: "duckduckgo" | "wikipedia" | "searxng";
}

export interface YouTubeResult {
  videoId: string;
  title: string;
  channelTitle?: string;
  channelName?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  url?: string;
  duration?: string;
  viewCount?: string;
  publishedAt?: string;
  description?: string;
  language?: "hindi" | "english" | "hinglish";
}

export interface LessonResources {
  hindiVideos: YouTubeResult[];
  englishVideos: YouTubeResult[];
  webArticles: WebResult[];
}

// ── Daily Tech News / Out-of-Syllabus ─────────────────────────────────────

export type TechNewsCategory =
  | "ai-model"
  | "llm"
  | "open-source"
  | "hardware"
  | "software"
  | "tool"
  | "web"
  | "fact"
  | "career"
  | "general";

export interface DailyTechNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  category: TechNewsCategory;
  publishedAt: string; // ISO date
  relevanceScore: number; // 0-1
  tags: string[];
}

export interface DailyTechBriefing {
  date: string;
  items: DailyTechNewsItem[];
  featuredItem?: DailyTechNewsItem;
  relatedLessonDay?: number;
  aiGeneratedSummary?: string;
}

// ── Daily Tech Topics (Out of Syllabus) ────────────────────────────────────

export type DailyTechTopicCategory =
  | "ai-model"
  | "llm"
  | "open-source"
  | "hardware-news"
  | "software-tool"
  | "web-platform"
  | "fun-fact"
  | "processor"
  | "gpu"
  | "coding-tip"
  | "career"
  | "industry";

export interface DailyTechTopic {
  id: string;
  day: number;
  title: string;
  summary: string;
  sourceUrl: string;
  source: string;                 // "web-search" | "youtube" | "blog"
  category: DailyTechTopicCategory;
  relatedPhase?: number;
  relatedTopics?: string[];
  fetchedAt: string;              // ISO date
  tags: string[];
}

// ── API Contract ───────────────────────────────────────────────────────────

export type TutorAction =
  | "get_lesson"
  | "get_test"
  | "evaluate_test"
  | "chat"
  | "summarize_video"
  | "get_resources"
  | "get_daily_tech"
  | "get_daily_tech_quick"
  | "get_weekly_quiz"
  | "evaluate_weekly_quiz"
  | "admin_action"
  | "get_transcript"
  | "video_checkpoints"
  | "video_ask_ai"
  | "video_jump_to"
  | "admin_save_day_content"
  | "admin_get_all_days"
  | "admin_transcribe_video"
  | "admin_generate_lesson"
  | "admin_generate_curriculum"
  | "admin_delete_day";

export interface TutorApiRequest {
  action: TutorAction;
  day?: number;
  learnerProfile?: string;
  weakTopics?: string[];
  topic?: string;
  // get_test / evaluate_test / weekly quiz
  currentQuestionSet?: { questions: QuizQuestion[] };
  userAnswers?: Record<string, string>;
  // chat
  message?: string;
  chatHistory?: ChatMessage[];
  chatModel?: string; // user-chosen model override
  // summarize_video
  videoId?: string;
  videoTitle?: string;
  // get_daily_tech_quick
  techCategory?: string;
  // admin
  studentId?: StudentId;
  adminAction?: "view_student" | "view_all" | "analytics";
  // video player
  segments?: Array<{ text: string; start: number; duration: number; formattedStart: string }>;
  query?: string;
  question?: string;
  transcript?: string;
  currentTime?: number;
  // admin content management
  dayContent?: AdminDayContent;
  resourceLink?: AdminResourceLink;
  title?: string;
  description?: string;
  topics?: string[];
  resources?: AdminResourceLink[];
}

export interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  options: string[];
  difficulty: string;
  hint?: string;
}

// ── Quiz Configuration ──────────────────────────────────────────────────────

/** Standard daily quiz: 12 questions (3 easy + 3 medium + 3 intermediate + 3 tough) */
export const QUIZ_CONFIG = {
  totalQuestions: 12,
  difficultySplit: {
    easy: 3,
    medium: 3,
    intermediate: 3,
    tough: 3,
  },
  /** Pass threshold: 70% (9 out of 12) */
  passPercent: 70,
  /** Weekly quiz: 50 questions from previous 7 days */
  weekly: {
    totalQuestions: 50,
    passPercent: 80,
    dayRange: 7,
  },
};

// ── SM-2 Spaced Repetition (Adaptive Difficulty) ────────────────────────────

export interface SM2Card {
  id: string;
  /** Question text */
  question: string;
  /** Topic tag */
  topic: string;
  /** Current difficulty level */
  difficulty: "easy" | "medium" | "intermediate" | "tough";
  /** Ease factor (≥1.3, default 2.5) */
  easeFactor: number;
  /** Number of successful repetitions */
  repetitions: number;
  /** Days until next review */
  interval: number;
  /** Last review timestamp (ISO) */
  lastReview: string;
  /** Next review timestamp (ISO) */
  nextReview: string;
  /** Times answered wrong for analytics */
  wrongCount: number;
  /** Times answered correct for analytics */
  correctCount: number;
}

export interface SM2Deck {
  studentId: StudentId;
  cards: SM2Card[];
  lastUpdated: string;
}

/** SM-2 quality ratings: 0-5 (0=blackout, 5=perfect) */
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

/** Calculate SM-2 review parameters */
export function calculateSM2(card: SM2Card, quality: SM2Quality): SM2Card {
  let { easeFactor, repetitions, interval } = card;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response — reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  // Adjust difficulty based on performance
  let difficulty = card.difficulty;
  if (quality <= 2) {
    // Struggling — go easier
    if (difficulty === "tough") difficulty = "intermediate";
    else if (difficulty === "intermediate") difficulty = "medium";
    else if (difficulty === "medium") difficulty = "easy";
  } else if (quality === 5 && easeFactor > 2.5) {
    // Nailing it — go harder
    if (difficulty === "easy") difficulty = "medium";
    else if (difficulty === "medium") difficulty = "intermediate";
    else if (difficulty === "intermediate") difficulty = "tough";
  }

  return {
    ...card,
    easeFactor: Math.round(easeFactor * 100) / 100,
    repetitions,
    interval,
    lastReview: now.toISOString(),
    nextReview: nextReview.toISOString(),
    difficulty,
    correctCount: quality >= 3 ? card.correctCount + 1 : card.correctCount,
    wrongCount: quality < 3 ? card.wrongCount + 1 : card.wrongCount,
  };
}

// ── Weekly Quiz ──────────────────────────────────────────────────────────────

export interface WeeklyQuizResult {
  studentId: StudentId;
  weekEnding: string; // ISO date
  score: number; // 0-50
  passPercent: number; // 80
  passed: boolean;
  wrongAnswers: Array<{
    questionId: string;
    question: string;
    correctAnswer: string;
    userAnswer: string;
    explanation: string;
    videoRecommendation?: string;
    blogRecommendation?: string;
  }>;
  completedAt: string; // ISO date
  timeTakenSeconds: number;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  studentId: StudentId;
  /** Time spent per topic (seconds) */
  timePerTopic: Record<string, number>;
  /** Weak areas identified */
  weakAreas: Array<{ topic: string; score: number; attempts: number }>;
  /** Quiz score trends over time */
  quizTrends: Array<{ day: number; score: number; date: string }>;
  /** Phase timeline */
  phaseTimelines: Array<{ phaseId: number; startDate: string; endDate?: string; daysSpent: number }>;
  /** Total study time (seconds) */
  totalStudyTime: number;
  /** Average quiz score */
  averageScore: number;
  /** Current streak */
  currentStreak: number;
  /** Best streak */
  bestStreak: number;
}

// ── Admin Mode ───────────────────────────────────────────────────────────────

export interface AdminSession {
  isActive: boolean;
  activatedAt: string | null; // ISO date
  expiresAt: string | null;   // ISO date (1 hour after activation)
  viewingStudent: StudentId | null;
}

// ── Celebration Screen ───────────────────────────────────────────────────────

export interface CelebrationData {
  day: number;
  topic: string;
  timeSpentMinutes: number;
  xpEarned: number;
  streak: number;
  score: number;
  totalQuestions: number;
  passed: boolean;
}

// ── Auth / Device ────────────────────────────────────────────────────────────

export interface DeviceAuth {
  studentId: StudentId | null;
  isLoggedIn: boolean;
  deviceId: string;
  lastLogin: string; // ISO date
}

/** Generate or retrieve a device fingerprint */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("csa_device_id");
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("csa_device_id", id);
  }
  return id;
}

// ── Curriculum ─────────────────────────────────────────────────────────────

export interface LessonMeta {
  day: number;
  title: string;
  phase: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  duration?: string;
  topics: string[];
  prerequisites?: number[];          // days that must be completed first
  learningObjectives?: string[];     // what the student will achieve
  tags?: string[];                   // searchable tags (e.g., "hands-on", "theory", "project", "exam")
  isRevisionDay?: boolean;
  isMonthlyTest?: boolean;
  isMilestone?: boolean;
}

export interface Phase {
  id: number;
  name: string;
  icon: string;
  color: string;
  days: number[];
  milestoneProject?: string;
}

// ── UI State ───────────────────────────────────────────────────────────────

export interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "info" | "success" | "system";
  content: string;
  timestamp: number;
}

export interface VideoSummaryState {
  videoId: string | null;
  title: string | null;
  summary: string | null;
  isLoading: boolean;
}
