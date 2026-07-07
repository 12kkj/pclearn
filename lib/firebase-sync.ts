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
//   curriculum/phases   → { phases: [...], lastUpdated }
//   curriculum/days/{N} → { dayNumber, lessonContent, resources, ... }
// ══════════════════════════════════════════════════════════════════════════

const CURRICULUM_COLLECTION = "curriculum";

/** Strip heavy/unnecessary fields before writing to Firestore */
function stripCurriculumForFirestore(state: any): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lastUpdated, subDays, ...rest } = state;
  return { ...rest, _lastSynced: serverTimestamp() };
}

/**
 * Push the full admin curriculum state to Firestore.
 * - Phases go into a single "phases" doc.
 * - Each day's content goes into its own doc under curriculum/days/.
 */
export async function syncCurriculumToFirestore(
  state: any
): Promise<void> {
  try {
    const db = getFirebaseDb();

    // 1. Save phases + metadata
    const phasesRef = doc(db, CURRICULUM_COLLECTION, "phases");
    await setDoc(phasesRef, {
      phases: state.phases ?? [],
      lastUpdated: serverTimestamp(),
    });

    // 2. Save each day's content as its own doc
    const days = state.days ?? {};
    const dayEntries = Object.entries(days) as [string, any][];
    for (const [dayStr, dayData] of dayEntries) {
      const dayNum = parseInt(dayStr, 10);
      if (isNaN(dayNum)) continue;
      const dayRef = doc(db, CURRICULUM_COLLECTION, "days", dayStr);
      // Only save the essential content fields (skip anything huge or redundant)
      const { dayNumber: _dn, ...content } = dayData;
      await setDoc(dayRef, {
        dayNumber: dayNum,
        ...content,
        _lastSynced: serverTimestamp(),
      });
    }

    // 3. Clean up deleted day docs (days that exist in Firestore but not in local state)
    try {
      const daysCol = collection(db, CURRICULUM_COLLECTION, "days");
      const existingDocs = await getDocs(daysCol);
      const validDayNums = new Set(dayEntries.map(([k]) => k));
      const batch = writeBatch(db);
      let batchCount = 0;
      existingDocs.forEach((d: any) => {
        if (!validDayNums.has(d.id)) {
          batch.delete(d.ref);
          batchCount++;
        }
      });
      if (batchCount > 0) await batch.commit();
    } catch { /* non-critical cleanup */ }

    console.log("[firebase-sync] Curriculum pushed to Firestore:", dayEntries.length, "days");
  } catch (err) {
    console.warn("[firebase-sync] Failed to push curriculum:", err);
  }
}

/**
 * Pull curriculum from Firestore.
 * Returns { phases, days } or null if no cloud data exists.
 */
export async function loadCurriculumFromFirestore(): Promise<{
  phases: any[];
  days: Record<number, any>;
} | null> {
  try {
    const db = getFirebaseDb();

    // 1. Load phases
    const phasesRef = doc(db, CURRICULUM_COLLECTION, "phases");
    const phasesSnap = await getDoc(phasesRef);
    if (!phasesSnap.exists()) return null;
    const phasesData = phasesSnap.data();

    // 2. Load all day docs
    const daysCol = collection(db, CURRICULUM_COLLECTION, "days");
    const daysSnap = await getDocs(daysCol);
    const days: Record<number, any> = {};
    daysSnap.forEach((d: any) => {
      const data = d.data();
      const dayNum = data.dayNumber ?? parseInt(d.id, 10);
      if (!isNaN(dayNum)) {
        const { _lastSynced: _ls, dayNumber: _dn, ...rest } = data;
        days[dayNum] = rest;
      }
    });

    console.log("[firebase-sync] Curriculum loaded from Firestore:", Object.keys(days).length, "days");
    return { phases: phasesData.phases ?? [], days };
  } catch (err) {
    console.warn("[firebase-sync] Failed to load curriculum:", err);
    return null;
  }
}

/**
 * Delete ALL curriculum data from Firestore (nuclear reset).
 * Does NOT touch student data.
 */
export async function deleteCurriculumFromFirestore(): Promise<void> {
  try {
    const db = getFirebaseDb();
    const batch = writeBatch(db);

    // Delete phases doc
    batch.delete(doc(db, CURRICULUM_COLLECTION, "phases"));

    // Delete all day docs
    const daysCol = collection(db, CURRICULUM_COLLECTION, "days");
    const daysSnap = await getDocs(daysCol);
    daysSnap.forEach((d: any) => batch.delete(d.ref));

    await batch.commit();
    console.log("[firebase-sync] Curriculum deleted from Firestore");
  } catch (err) {
    console.warn("[firebase-sync] Failed to delete curriculum:", err);
  }
}
