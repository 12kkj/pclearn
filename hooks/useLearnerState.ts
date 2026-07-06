"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { LearnerState, ChatMessage, StudentId, LessonSnapshot } from "@/types";
import { autoBackupStudent, restoreFromBackup } from "@/lib/data-export";
import {
  loadStateFromFirestore,
  syncStateToFirestore,
  loadLessonCacheFromFirestore,
  cacheLessonInFirestore,
  mergeStates,
  onFirebaseAuthChange,
} from "@/lib/firebase-sync";

export const getStorageKey = (studentId?: StudentId) =>
  studentId ? `csa_${studentId}_learner` : "csa_v4_learner";

const DEFAULT_LEARNER: LearnerState = {
  name: "Learner",
  profile:
    "A motivated beginner starting from absolute zero, wanting to master computers, programming, and AI completely.",
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
  preferredChatModel: "openai/gpt-oss-120b",
  lessonContextByDay: {},
  lessonSnapshots: {},
};

function getISTDate(date?: Date): string {
  return (date ?? new Date()).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

function updateStreak(state: LearnerState): LearnerState {
  const today = getISTDate();
  if (state.lastActiveDate === today) return state;
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  nowIST.setDate(nowIST.getDate() - 1);
  const yesterday = getISTDate(nowIST);
  const newStreak =
    state.lastActiveDate === yesterday ? state.streak + 1 : 1;
  return { ...state, lastActiveDate: today, streak: newStreak };
}

function loadState(studentId?: StudentId): LearnerState {
  try {
    const raw = localStorage.getItem(getStorageKey(studentId));
    const base = raw ? JSON.parse(raw) : {};
    const persistedName = studentId ? localStorage.getItem(`csa_${studentId}_customname`)?.trim() : "";
    const persistedProfile = studentId ? localStorage.getItem(`csa_${studentId}_customprofile`)?.trim() : "";

    if (!raw) {
      if (studentId) {
        const backup = restoreFromBackup(studentId);
        if (backup) {
          localStorage.setItem(getStorageKey(studentId), JSON.stringify(backup));
          return { ...DEFAULT_LEARNER, ...backup } as LearnerState;
        }
      }
      return DEFAULT_LEARNER;
    }

    return {
      ...DEFAULT_LEARNER,
      ...base,
      ...(persistedName ? { name: persistedName } : {}),
      ...(persistedProfile ? { profile: persistedProfile } : {}),
    } as LearnerState;
  } catch {
    return DEFAULT_LEARNER;
  }
}

function saveState(s: LearnerState, studentId?: StudentId) {
  try {
    localStorage.setItem(getStorageKey(studentId), JSON.stringify(s));
    if (studentId) {
      localStorage.setItem(`csa_${studentId}_customname`, s.name?.trim() || DEFAULT_LEARNER.name);
      localStorage.setItem(`csa_${studentId}_customprofile`, s.profile?.trim() || DEFAULT_LEARNER.profile);
    }
  } catch { /* quota exceeded */ }
  if (studentId) {
    autoBackupStudent(studentId, s as unknown as Record<string, unknown>);
  }
}

export function useLearnerState(studentId?: StudentId) {
  const [learner, setLearnerRaw] = useState<LearnerState>(DEFAULT_LEARNER);
  const [hydrated, setHydrated] = useState(false);
  // cloudSynced: true once the initial Firestore pull + merge is done.
  // Firestore writes are blocked until this is true to prevent overwriting cloud data
  // with local defaults before the merge completes.
  const [cloudSynced, setCloudSynced] = useState(false);
  const _syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track which studentId we last hydrated for, to re-hydrate on identity change
  const _hydratedFor = useRef<StudentId | undefined>(undefined);

  // ── Step 1: Hydrate from localStorage ──────────────────────────────────
  // Runs immediately on mount (so the UI can render), and again when the
  // studentId becomes known after login so we load the correct student key.
  useEffect(() => {
    const targetId = studentId;
    if (_hydratedFor.current === targetId) return; // Already loaded for this id
    _hydratedFor.current = targetId;

    const loaded = loadState(targetId);
    setLearnerRaw(updateStreak(loaded));
    setHydrated(true);

    // Reset cloud-sync gate when identity changes (don't push stale state)
    setCloudSynced(false);
  }, [studentId]);

  // ── Step 2: Merge with Firestore once identity is confirmed ────────────
  useEffect(() => {
    if (!hydrated || !studentId) return;

    const unsubscribe = onFirebaseAuthChange(async (user) => {
      if (!user || cloudSynced) return;

      try {
        const [cloudState, cloudCache] = await Promise.all([
          loadStateFromFirestore(studentId as StudentId),
          loadLessonCacheFromFirestore(studentId as StudentId),
        ]);

        setLearnerRaw((prev) => {
          const merged = cloudState ? mergeStates(prev, cloudState) : prev;
          const mergedCache = {
            ...cloudCache,
            ...merged.lessonCache, // local cache wins (more recent)
          };
          const final = { ...merged, lessonCache: mergedCache };
          saveState(final, studentId);
          return final;
        });
      } catch (err) {
        console.warn("[useLearnerState] Cloud merge failed:", err);
      } finally {
        // Mark sync complete regardless — unblocks Firestore writes
        setCloudSynced(true);
      }
    });

    return () => unsubscribe();
  }, [hydrated, studentId]);

  // ── Step 3: Save to localStorage on every change ───────────────────────
  useEffect(() => {
    if (hydrated) saveState(learner, studentId);
  }, [learner, hydrated]);

  // ── Step 4: Debounced push to Firestore — only after cloud pull done ───
  // cloudSynced guards against writing local/default state to Firestore before
  // we've had a chance to pull and merge existing cloud data.
  useEffect(() => {
    if (!hydrated || !studentId || !cloudSynced) return;

    if (_syncTimer.current) clearTimeout(_syncTimer.current);
    _syncTimer.current = setTimeout(() => {
      syncStateToFirestore(studentId as StudentId, learner).catch(() => {});
    }, 3000);

    return () => {
      if (_syncTimer.current) clearTimeout(_syncTimer.current);
    };
  }, [learner, hydrated, studentId, cloudSynced]);

  // ── Callbacks ──────────────────────────────────────────────────────────

  const setLearner = useCallback(
    (updater: (prev: LearnerState) => LearnerState) => setLearnerRaw(updater),
    []
  );

  const updateProfile = useCallback((name: string, profile: string) => {
    const safeName = name?.trim() || DEFAULT_LEARNER.name;
    const safeProfile = profile?.trim() || DEFAULT_LEARNER.profile;
    setLearnerRaw((prev) => ({ ...prev, name: safeName, profile: safeProfile }));
    if (studentId) {
      localStorage.setItem(`csa_${studentId}_customname`, safeName);
      localStorage.setItem(`csa_${studentId}_customprofile`, safeProfile);
    }
  }, [studentId]);

  const completeDay = useCallback(
    (day: number, score: number, weakTopicsFound: string[] = []) => {
      setLearnerRaw((prev) => {
        const xpGain =
          score >= 10 ? 150 : score >= 8 ? 100 : score >= 5 ? 75 : 40;
        const completed = prev.completedDays.includes(day)
          ? prev.completedDays
          : [...prev.completedDays, day];

        const badges = [...prev.badges];
        if (day === 7 && !badges.includes("week1")) badges.push("week1");
        if (day === 14 && !badges.includes("week2")) badges.push("week2");
        if (day === 21 && !badges.includes("week3")) badges.push("week3");
        if (day === 30 && !badges.includes("month1")) badges.push("month1");
        if (day === 50 && !badges.includes("halfway")) badges.push("halfway");
        if (day === 100 && !badges.includes("graduate")) badges.push("graduate");

        const newWeakTopics = [
          ...new Set([...prev.weakTopics, ...weakTopicsFound]),
        ].slice(-15);

        return {
          ...prev,
          completedDays: completed,
          currentDay: Math.max(prev.currentDay, day),
          testScores: { ...prev.testScores, [day]: score },
          xp: prev.xp + xpGain,
          badges,
          weakTopics: newWeakTopics,
        };
      });
    },
    []
  );

  const cacheLesson = useCallback(
    (day: number, content: string) => {
      setLearnerRaw((prev) => ({
        ...prev,
        lessonCache: { ...prev.lessonCache, [day]: content },
      }));
      if (studentId) {
        cacheLessonInFirestore(studentId as StudentId, day, content).catch(() => {});
      }
    },
    [studentId]
  );

  const appendChat = useCallback((message: ChatMessage) => {
    setLearnerRaw((prev) => ({
      ...prev,
      chatHistory: [...prev.chatHistory.slice(-49), message],
    }));
  }, []);

  const clearChat = useCallback(() => {
    setLearnerRaw((prev) => ({ ...prev, chatHistory: [] }));
  }, []);

  const setPreferredChatModel = useCallback((modelId: string) => {
    setLearnerRaw((prev) => ({ ...prev, preferredChatModel: modelId }));
  }, []);

  const saveLessonSnapshot = useCallback((day: number, snapshot: Partial<LessonSnapshot>) => {
    setLearnerRaw((prev) => ({
      ...prev,
      lessonSnapshots: {
        ...(prev.lessonSnapshots ?? {}),
        [day]: {
          ...(prev.lessonSnapshots?.[day] ?? {}),
          ...snapshot,
          updatedAt: Date.now(),
        },
      },
    }));
  }, []);

  const exportProgress = useCallback(() => {
    const data = JSON.stringify(learner, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `csa-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [learner]);

  const importProgress = useCallback((json: string) => {
    setLearnerRaw({ ...DEFAULT_LEARNER, ...JSON.parse(json) });
  }, []);

  const resetProgress = useCallback(() => {
    setLearnerRaw(DEFAULT_LEARNER);
  }, []);

  return {
    learner,
    setLearner,
    hydrated,
    cloudSynced,
    updateProfile,
    completeDay,
    cacheLesson,
    appendChat,
    clearChat,
    setPreferredChatModel,
    saveLessonSnapshot,
    exportProgress,
    importProgress,
    resetProgress,
  };
}
