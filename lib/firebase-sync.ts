// ============================================================
// Firebase Sync — Cloud backup & cross-device sync
// ============================================================
// Strategy:
//   - localStorage = primary (fast, offline)
//   - Firestore = cloud replica (sync on login + debounced saves)
//
// Firestore structure:
//   students/{studentId}             — main LearnerState (minus lessonCache)
//   students/{studentId}/cache/{day} — per-day lesson markdown
//
// NOTE: All functions here are CLIENT-ONLY. Never call from SSR/server code.
// ============================================================

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { LearnerState, StudentId } from "@/types";

// ── Email mapping ──────────────────────────────────────────────────────────

/** Maps studentId → Firebase Auth email */
/**
 * Pad a short PIN to meet Firebase's 6-character minimum.
 * The user always types their real PIN; this is only used when talking to Firebase Auth.
 * The padding is deterministic so the same PIN always produces the same Firebase password.
 */
function padPin(pin: string): string {
  if (pin.length >= 6) return pin;
  return pin.padEnd(6, "_");
}

export function studentEmail(studentId: StudentId): string {
  return studentId === "st_1"
    ? "student1@learnpc.app"
    : "student2@learnpc.app";
}

// ── Firebase Auth ──────────────────────────────────────────────────────────

/**
 * Sign a student into Firebase Auth.
 * Creates the account if it doesn't exist yet (first device), otherwise signs in.
 * Returns the Firebase User on success, null on failure.
 */
export type FirebaseSignInResult = "ok" | "wrong_pin" | "network_error" | "not_enabled" | "weak_password";

/**
 * Sign a student into Firebase Auth.
 * Returns "ok" on success, "wrong_pin" if credentials are rejected for an existing account,
 * or "network_error" if Firebase is unreachable.
 *
 * Modern Firebase Auth may return auth/invalid-credential for BOTH "wrong password" and
 * "user not found". We disambiguate by attempting account creation: if create succeeds the
 * user was new; if it fails with email-already-in-use the password was wrong.
 */
export async function firebaseSignIn(
  studentId: StudentId,
  pin: string
): Promise<FirebaseSignInResult> {
  const auth = getFirebaseAuth();
  const email = studentEmail(studentId);

  // ── 1. Try sign-in (handles returning users) ──────────────────────────
  try {
    await signInWithEmailAndPassword(auth, email, padPin(pin));
    return "ok";
  } catch (signInErr: unknown) {
    const signInCode = (signInErr as { code?: string })?.code;

    // Email/Password provider not enabled in Firebase Console
    if (signInCode === "auth/operation-not-allowed") {
      return "not_enabled";
    }

    // Network / service unreachable — don't attempt account creation
    if (
      signInCode === "auth/network-request-failed" ||
      signInCode === "auth/too-many-requests"
    ) {
      return "network_error";
    }

    // ── 2. Sign-in failed — try creating the account ─────────────────────
    // This handles both "user-not-found" and modern "invalid-credential" for new users.
    try {
      await createUserWithEmailAndPassword(auth, email, padPin(pin));
      return "ok"; // New account created, PIN is now the password
    } catch (createErr: unknown) {
      const createCode = (createErr as { code?: string })?.code;
      if (createCode === "auth/email-already-in-use") {
        // Account exists → sign-in failed because of wrong PIN
        return "wrong_pin";
      }
      if (createCode === "auth/operation-not-allowed") {
        return "not_enabled";
      }
      if (createCode === "auth/weak-password") {
        // Firebase requires passwords to be at least 6 characters
        return "weak_password";
      }
      // Other create errors → treat as network/service error
      return "network_error";
    }
  }
}

/** Sign the current Firebase user out */
export async function firebaseSignOut(): Promise<void> {
  try {
    await signOut(getFirebaseAuth());
  } catch {
    // silent
  }
}

/**
 * Update the Firebase Auth password for the currently signed-in user.
 * Returns true on success. May fail with auth/requires-recent-login if the
 * session is old — caller should prompt the user to log out and back in.
 */
export async function updateStudentPassword(newPin: string): Promise<boolean> {
  try {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) return false;
    await updatePassword(auth.currentUser, padPin(newPin));
    return true;
  } catch {
    return false;
  }
}

/** Returns the currently signed-in Firebase user (or null) */
export function getCurrentFirebaseUser(): User | null {
  try {
    return getFirebaseAuth().currentUser;
  } catch {
    return null;
  }
}

/** Subscribe to Firebase auth state changes */
export function onFirebaseAuthChange(callback: (user: User | null) => void) {
  try {
    return onAuthStateChanged(getFirebaseAuth(), callback);
  } catch {
    // Not on client yet — return a no-op unsubscribe
    return () => {};
  }
}

// ── Firestore State Sync ───────────────────────────────────────────────────

/** Fields we exclude from the Firestore state doc (too large / device-local) */
function stripLocalFields(state: LearnerState): Omit<LearnerState, "lessonCache"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lessonCache, ...rest } = state;
  return rest;
}

/**
 * Push LearnerState to Firestore for the given student.
 * lessonCache is skipped (stored separately via cacheLessonInFirestore).
 */
export async function syncStateToFirestore(
  studentId: StudentId,
  state: LearnerState
): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) return;

    const db = getFirebaseDb();
    const ref = doc(db, "students", studentId);
    await setDoc(
      ref,
      {
        ...stripLocalFields(state),
        _lastSynced: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[firebase-sync] Failed to push state:", err);
  }
}

/**
 * Pull LearnerState from Firestore.
 * Returns null if no cloud data exists yet or if not authenticated.
 */
export async function loadStateFromFirestore(
  studentId: StudentId
): Promise<Partial<LearnerState> | null> {
  try {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) return null;

    const db = getFirebaseDb();
    const ref = doc(db, "students", studentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _lastSynced, ...state } = data;
    return state as Partial<LearnerState>;
  } catch (err) {
    console.warn("[firebase-sync] Failed to load state:", err);
    return null;
  }
}

// ── Lesson Cache Sync ──────────────────────────────────────────────────────

/**
 * Store a single lesson's markdown in Firestore.
 * Each day is a separate document so we never hit the 1MB doc limit.
 */
export async function cacheLessonInFirestore(
  studentId: StudentId,
  day: number,
  content: string
): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) return;

    const db = getFirebaseDb();
    const ref = doc(db, "students", studentId, "cache", String(day));
    await setDoc(ref, { day, content, cachedAt: serverTimestamp() });
  } catch {
    // Non-critical
  }
}

/**
 * Load all cached lessons from Firestore for a student.
 * Returns a Record<day, content> map.
 */
export async function loadLessonCacheFromFirestore(
  studentId: StudentId
): Promise<Record<number, string>> {
  try {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) return {};

    const db = getFirebaseDb();
    const colRef = collection(db, "students", studentId, "cache");
    const snap = await getDocs(colRef);
    const cache: Record<number, string> = {};
    snap.forEach((d: any) => {
      const data = d.data();
      if (data.day != null && data.content) {
        cache[data.day as number] = data.content as string;
      }
    });
    return cache;
  } catch {
    return {};
  }
}

// ── State Merge Helper ─────────────────────────────────────────────────────

/**
 * Merge local and cloud states.
 * Cloud wins for progress/scores/badges (cross-device source of truth).
 * Local lessonCache is always preserved (too large to fully sync per-load).
 */
export function mergeStates(
  local: LearnerState,
  cloud: Partial<LearnerState>
): LearnerState {
  const mergedCompletedDays = Array.from(
    new Set([...(local.completedDays ?? []), ...(cloud.completedDays ?? [])])
  ).sort((a, b) => a - b);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  const mergedTestScores: Record<number, number> = {
    ...(local.testScores ?? {}),
    ...(cloud.testScores ?? {}),
  };

  const mergedBadges = Array.from(
    new Set([...(local.badges ?? []), ...(cloud.badges ?? [])])
  );

  const mergedWeakTopics = Array.from(
    new Set([...(local.weakTopics ?? []), ...(cloud.weakTopics ?? [])])
  ).slice(-15);

  const localChat = local.chatHistory ?? [];
  const cloudChat = (cloud.chatHistory as typeof localChat) ?? [];
  const mergedChat = localChat.length >= cloudChat.length ? localChat : cloudChat;

  return {
    ...local,
    ...cloud,
    completedDays: mergedCompletedDays,
    testScores: mergedTestScores,
    badges: mergedBadges,
    weakTopics: mergedWeakTopics,
    chatHistory: mergedChat,
    currentDay: Math.max(local.currentDay ?? 0, cloud.currentDay ?? 0),
    xp: Math.max(local.xp ?? 0, cloud.xp ?? 0),
    streak: Math.max(local.streak ?? 0, cloud.streak ?? 0),
    lessonCache: local.lessonCache ?? {},
    lessonContextByDay: {
      ...(local.lessonContextByDay ?? {}),
      ...(cloud.lessonContextByDay ?? {}),
    },
    lessonSnapshots: {
      ...(local.lessonSnapshots ?? {}),
      ...(cloud.lessonSnapshots ?? {}),
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════
// Curriculum Sync — pushes admin content to Firestore for all students
// Firestore structure:
//   curriculum (single doc) → { phases: [...], days: { "0": {...}, "1": {...} } }
// ══════════════════════════════════════════════════════════════════════════

const CURRICULUM_DOC = "curriculum";

/**
 * Admin sync helper — signs in anonymously to push curriculum to Firestore.
 * The curriculum collection is publicly readable in our security rules,
 * so students can pull it without auth.
 */
async function ensureAdminAuth(): Promise<boolean> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return true; // Already signed in
  try {
    const { signInAnonymously } = await import("firebase/auth");
    await signInAnonymously(auth);
    return true;
  } catch {
    // Anonymous auth not enabled — try with a throwaway email
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, "admin@learnpc.app", "admin123");
      return true;
    } catch {
      console.warn("[firebase-sync] Could not authenticate admin for curriculum sync");
      return false;
    }
  }
}

/** Strip heavy/unnecessary fields before writing to Firestore */
function stripCurriculumForFirestore(state: any): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lastUpdated, subDays, ...rest } = state;
  return { ...rest, _lastSynced: serverTimestamp() };
}

/**
 * Push the full admin curriculum state to Firestore as a single document.
 * All phases + days live inside one "curriculum" doc.
 */
export async function syncCurriculumToFirestore(
  state: any
): Promise<void> {
  try {
    // Ensure we have an auth session before writing to Firestore
    const authed = await ensureAdminAuth();
    if (!authed) {
      console.warn("[firebase-sync] Skipping curriculum sync — no auth");
      return;
    }
    const db = getFirebaseDb();
    const ref = doc(db, CURRICULUM_DOC);

    // Write everything into a single document
    await setDoc(ref, {
      phases: state.phases ?? [],
      days: state.days ?? {},
      lastUpdated: serverTimestamp(),
    });

    const dayCount = Object.keys(state.days ?? {}).length;
    console.log("[firebase-sync] Curriculum pushed to Firestore:", dayCount, "days");
  } catch (err) {
    console.warn("[firebase-sync] Failed to push curriculum:", err);
  }
}

/**
 * Pull curriculum from Firestore (single document).
 * Returns { phases, days } or null if no cloud data exists.
 */
export async function loadCurriculumFromFirestore(): Promise<{
  phases: any[];
  days: Record<number, any>;
} | null> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, CURRICULUM_DOC);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data();
    const days: Record<number, any> = {};
    const rawDays = data.days ?? {};
    for (const [key, val] of Object.entries(rawDays)) {
      const num = parseInt(key, 10);
      if (!isNaN(num)) days[num] = val;
    }

    console.log("[firebase-sync] Curriculum loaded from Firestore:", Object.keys(days).length, "days");
    return { phases: data.phases ?? [], days };
  } catch (err) {
    console.warn("[firebase-sync] Failed to load curriculum:", err);
    return null;
  }
}

/**
 * Delete ALL curriculum data from Firestore (nuclear reset).
 * Deletes the single "curriculum" document.
 */
export async function deleteCurriculumFromFirestore(): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, CURRICULUM_DOC);
    await deleteDoc(ref);
    console.log("[firebase-sync] Curriculum deleted from Firestore");
  } catch (err) {
    console.warn("[firebase-sync] Failed to delete curriculum:", err);
  }
}
