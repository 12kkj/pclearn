"use client";

import { useState, useCallback, useEffect } from "react";
import type { StudentState, StudentId, ChatMessage } from "@/types";

const STORAGE_KEY = "csa_v3_state";
const INITIAL_STUDENT: Omit<StudentState, "id" | "name" | "profile"> = {
  currentDay: 0,
  completedDays: [],
  testScores: {},
  weakTopics: [],
  xp: 0,
  streak: 0,
  lastActiveDate: "",
  chatHistory: [],
  badges: [],
  lessonCache: {},
};

const DEFAULTS: Record<StudentId, Pick<StudentState, "id" | "name" | "profile">> = {
  st_1: {
    id: "st_1",
    name: "Student 1",
    profile:
      "Complete computer fundamentals + programming journey. Absolute beginner in programming but motivated to learn everything from scratch.",
  },
  st_2: {
    id: "st_2",
    name: "Student 2",
    profile:
      "Practical skills, quick career-ready modules, exam prep. Absolute beginner in computer science, wants to learn from zero to advanced level.",
  },
  student1: {
    id: "student1",
    name: "Student 1",
    profile:
      "Complete computer fundamentals + programming journey. Absolute beginner in programming but motivated to learn everything from scratch.",
  },
  student2: {
    id: "student2",
    name: "Student 2",
    profile:
      "Practical skills, quick career-ready modules, exam prep. Absolute beginner in computer science, wants to learn from zero to advanced level.",
  },
};

function makeDefault(id: StudentId): StudentState {
  return { ...DEFAULTS[id], ...INITIAL_STUDENT };
}

function loadState(): { student1: StudentState; student2: StudentState } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no data");
    const parsed = JSON.parse(raw);
    return {
      student1: { ...makeDefault("student1"), ...parsed.student1 },
      student2: { ...makeDefault("student2"), ...parsed.student2 },
    };
  } catch {
    return {
      student1: makeDefault("student1"),
      student2: makeDefault("student2"),
    };
  }
}

function saveState(s1: StudentState, s2: StudentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ student1: s1, student2: s2 }));
  } catch {
    /* quota exceeded — ignore */
  }
}

/** Update streak and last-active date */
function updateStreak(state: StudentState): StudentState {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastActiveDate === today) return state;

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const newStreak =
    state.lastActiveDate === yesterday ? state.streak + 1 : 1;

  return { ...state, lastActiveDate: today, streak: newStreak };
}

export function useStudentState() {
  const [student1, setStudent1] = useState<StudentState>(makeDefault("student1"));
  const [student2, setStudent2] = useState<StudentState>(makeDefault("student2"));
  const [activeStudentId, setActiveStudentId] = useState<StudentId>("student1");
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadState();
    setStudent1(updateStreak(loaded.student1));
    setStudent2(updateStreak(loaded.student2));
    setHydrated(true);
  }, []);

  // Persist whenever state changes
  useEffect(() => {
    if (hydrated) saveState(student1, student2);
  }, [student1, student2, hydrated]);

  const activeStudent = activeStudentId === "student1" ? student1 : student2;

  const updateStudent = useCallback(
    (id: StudentId, updater: (prev: StudentState) => StudentState) => {
      if (id === "student1") setStudent1(updater);
      else setStudent2(updater);
    },
    [],
  );

  /** Mark a day as completed and award XP */
  const completeDay = useCallback(
    (studentId: StudentId, day: number, score: number) => {
      updateStudent(studentId, (prev) => {
        const xpGain = score === 5 ? 100 : score >= 4 ? 75 : 50;
        const completed = prev.completedDays.includes(day)
          ? prev.completedDays
          : [...prev.completedDays, day];

        // Award badges
        const badges = [...prev.badges];
        if (day === 7 && !badges.includes("week1")) badges.push("week1");
        if (day === 30 && !badges.includes("month1")) badges.push("month1");
        if (day === 50 && !badges.includes("halfway")) badges.push("halfway");
        if (day === 100 && !badges.includes("graduate")) badges.push("graduate");

        return {
          ...prev,
          completedDays: completed,
          currentDay: Math.max(prev.currentDay, day),
          testScores: { ...prev.testScores, [day]: score },
          xp: prev.xp + xpGain,
          badges,
        };
      });
    },
    [updateStudent],
  );

  /** Add weak topic if not already tracked */
  const addWeakTopic = useCallback(
    (studentId: StudentId, topic: string) => {
      updateStudent(studentId, (prev) => ({
        ...prev,
        weakTopics: prev.weakTopics.includes(topic)
          ? prev.weakTopics
          : [...prev.weakTopics.slice(-9), topic], // keep last 10
      }));
    },
    [updateStudent],
  );

  /** Remove a weak topic once mastered */
  const removeWeakTopic = useCallback(
    (studentId: StudentId, topic: string) => {
      updateStudent(studentId, (prev) => ({
        ...prev,
        weakTopics: prev.weakTopics.filter((t) => t !== topic),
      }));
    },
    [updateStudent],
  );

  /** Cache a lesson so it loads instantly next time */
  const cacheLesson = useCallback(
    (studentId: StudentId, day: number, content: string) => {
      updateStudent(studentId, (prev) => ({
        ...prev,
        lessonCache: { ...prev.lessonCache, [day]: content },
      }));
    },
    [updateStudent],
  );

  /** Append a chat message */
  const appendChat = useCallback(
    (studentId: StudentId, message: ChatMessage) => {
      updateStudent(studentId, (prev) => ({
        ...prev,
        chatHistory: [...prev.chatHistory.slice(-49), message], // keep last 50
      }));
    },
    [updateStudent],
  );

  /** Export progress as downloadable JSON */
  const exportProgress = useCallback(() => {
    const data = JSON.stringify({ student1, student2 }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `csa-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [student1, student2]);

  /** Import progress from JSON file */
  const importProgress = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.student1) setStudent1({ ...makeDefault("student1"), ...parsed.student1 });
      if (parsed.student2) setStudent2({ ...makeDefault("student2"), ...parsed.student2 });
    } catch {
      throw new Error("Invalid backup file");
    }
  }, []);

  /** Reset a single student */
  const resetStudent = useCallback((id: StudentId) => {
    if (id === "student1") setStudent1(makeDefault("student1"));
    else setStudent2(makeDefault("student2"));
  }, []);

  return {
    student1,
    student2,
    activeStudent,
    activeStudentId,
    setActiveStudentId,
    updateStudent,
    completeDay,
    addWeakTopic,
    removeWeakTopic,
    cacheLesson,
    appendChat,
    exportProgress,
    importProgress,
    resetStudent,
    hydrated,
  };
}
