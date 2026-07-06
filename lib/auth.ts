// Authentication utilities for per-student password and device handling.
// Combines local password check (localStorage) with Firebase Auth for cross-device sync.

import { firebaseSignIn, firebaseSignOut } from "@/lib/firebase-sync";
import type { StudentId } from "@/types";

/** Simple base64 encode – not secure, just obfuscates the local cached password. */
function encode(pwd: string): string {
  return btoa(pwd);
}
function decode(encoded: string): string {
  try {
    return atob(encoded);
  } catch {
    return "";
  }
}

export function savePassword(studentId: string, pwd: string): void {
  localStorage.setItem(`csa_${studentId}_pwd`, encode(pwd));
}

export function checkPassword(studentId: string, pwd: string): boolean {
  const stored = localStorage.getItem(`csa_${studentId}_pwd`);
  if (!stored) return false;
  return decode(stored) === pwd;
}

export function saveDeviceId(studentId: string, deviceId: string): void {
  localStorage.setItem(`csa_${studentId}_device`, deviceId);
}

export function getSavedDeviceId(studentId: string): string | null {
  return localStorage.getItem(`csa_${studentId}_device`);
}

export function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `dev_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Check if the current device is already linked to a profile */
export function isDeviceLinked(studentId: string): boolean {
  return getSavedDeviceId(studentId) !== null;
}

// ── Firebase-backed login ──────────────────────────────────────────────────

/**
 * Full login flow — validates PIN via Firebase Auth (source of truth for cross-device).
 *
 * Security contract:
 * - Firebase Auth is the primary gatekeeper.
 * - "ok"           → Firebase accepted the PIN; local password cached for offline.
 * - "wrong_pin"    → Firebase confirmed the account exists but PIN is wrong.
 * - "firebase_error" → Firebase unreachable; falls back to verified local credential only.
 *
 * On a new device with no local password and Firebase unreachable → "firebase_error" (blocks login).
 * Never saves a new local password unless Firebase explicitly accepted the PIN.
 */
export async function firebaseLogin(
  studentId: StudentId,
  pin: string
): Promise<"ok" | "wrong_pin" | "firebase_error" | "not_enabled" | "weak_password"> {
  const localStored = localStorage.getItem(`csa_${studentId}_pwd`);

  // Fast-fail: existing verified local credential doesn't match
  if (localStored && decode(localStored) !== pin) {
    return "wrong_pin";
  }

  const result = await firebaseSignIn(studentId, pin);

  if (result === "ok") {
    // Firebase accepted — cache PIN locally for offline use
    savePassword(studentId, pin);
    return "ok";
  }

  if (result === "wrong_pin") {
    return "wrong_pin";
  }

  if (result === "not_enabled") {
    return "not_enabled";
  }

  if (result === "weak_password") {
    return "weak_password";
  }

  // result === "network_error" — Firebase unreachable
  // Allow offline access only if a previously verified local credential matches
  if (localStored && decode(localStored) === pin) {
    return "ok";
  }

  // No verified local credential to fall back on — cannot confirm identity
  return "firebase_error";
}

/** Log out of both Firebase Auth and clear local session flags. */
export async function logoutStudent(): Promise<void> {
  await firebaseSignOut();
  localStorage.removeItem("csa_device_auth");
  localStorage.removeItem("csa_current_user");
}

/**
 * Change the password for the currently signed-in student.
 * Updates Firebase Auth AND the local cached credential.
 * Returns true on success, false if Firebase rejects (e.g. session too old).
 */
export async function changePassword(studentId: StudentId, newPin: string): Promise<boolean> {
  const { updateStudentPassword } = await import("@/lib/firebase-sync");
  const ok = await updateStudentPassword(newPin);
  if (ok) {
    savePassword(studentId, newPin);
  }
  return ok;
}
