// ============================================================
// Computer Skills Academy — Data Export / Import Utilities
// ============================================================
// Exports all student data (progress, password, device, chat)
// to a portable JSON file so it can be transferred across devices.
//
// File naming convention:  csa_st_1_data.json  /  csa_st_2_data.json
// ============================================================

import type { StudentId } from "@/types";
import { getStorageKey } from "@/hooks/useLearnerState";
import { checkPassword } from "@/lib/auth";

/** The shape of the exported JSON file */
export interface StudentDataExport {
  /** Metadata */
  _meta: {
    appName: string;
    version: string;
    exportedAt: string;       // ISO datetime
    studentId: StudentId;
    studentName: string;
  };

  /** Password (base64-encoded, same as localStorage) */
  password: string | null;

  /** Device identifier */
  deviceId: string | null;

  /** Full learner state */
  learner: Record<string, unknown>;

  /** Whether the user was previously logged in on this device */
  deviceAuth: {
    isLoggedIn: boolean;
    lastLogin: string | null;
  };
}

/** All localStorage keys we care about for a student */
function getStudentKeys(studentId: StudentId) {
  return {
    learner: getStorageKey(studentId),            // csa_st_1_learner
    password: `csa_${studentId}_pwd`,             // csa_st_1_pwd
    device: `csa_${studentId}_device`,            // csa_st_1_device
    deviceAuth: "csa_device_auth",                // shared device auth
    currentUser: "csa_current_user",              // shared current user
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

/** Read all data for a student from localStorage */
export function readStudentData(studentId: StudentId): StudentDataExport {
  const keys = getStudentKeys(studentId);

  const learnerRaw = localStorage.getItem(keys.learner);
  const learner = learnerRaw ? JSON.parse(learnerRaw) : {};

  const deviceAuthRaw = localStorage.getItem(keys.deviceAuth);
  const deviceAuth = deviceAuthRaw ? JSON.parse(deviceAuthRaw) : { isLoggedIn: false, lastLogin: null };

  const profileNames: Record<StudentId, string> = {
    st_1: "Student 1",
    st_2: "Student 2",
    student1: "Student 1",
    student2: "Student 2",
  };

  return {
    _meta: {
      appName: "Computer Skills Academy",
      version: "3.0",
      exportedAt: new Date().toISOString(),
      studentId,
      studentName: profileNames[studentId],
    },
    password: localStorage.getItem(keys.password),
    deviceId: localStorage.getItem(keys.device),
    learner,
    deviceAuth: {
      isLoggedIn: deviceAuth.studentId === studentId ? deviceAuth.isLoggedIn : false,
      lastLogin: deviceAuth.lastLogin ?? null,
    },
  };
}

/** Export a student's data and trigger a browser file download */
export function exportStudentToFile(studentId: StudentId): void {
  const data = readStudentData(studentId);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `csa_${studentId}_data.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Export BOTH students' data into a single file */
export function exportAllStudentsToFile(): void {
  const combined = {
    _meta: {
      appName: "Computer Skills Academy",
      version: "3.0",
      exportedAt: new Date().toISOString(),
      type: "all-students",
    },
    st_1: readStudentData("st_1"),
    st_2: readStudentData("st_2"),
  };

  const json = JSON.stringify(combined, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `csa_all_students_data.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────

export type ImportResult = {
  success: boolean;
  message: string;
  studentId?: StudentId;
};

/** 
 * Import student data from a JSON file string.
 * If a password is provided, it will be validated against the exported password
 * before importing (to prevent accidental overwrites with wrong data).
 */
export function importStudentFromData(
  jsonData: string,
  options?: { password?: string; forceOverwrite?: boolean }
): ImportResult {
  try {
    const parsed = JSON.parse(jsonData);

    // Handle single-student export
    if (parsed._meta?.studentId && parsed._meta?.appName === "Computer Skills Academy") {
      return importSingleStudent(parsed as StudentDataExport, options);
    }

    // Handle combined (both students) export
    if (parsed._meta?.type === "all-students" && parsed.st_1 && parsed.st_2) {
      const r1 = importSingleStudent(parsed.st_1, options);
      const r2 = importSingleStudent(parsed.st_2, options);
      return {
        success: r1.success && r2.success,
        message: `Imported: ${r1.message} | ${r2.message}`,
      };
    }

    // Try legacy format — flat object with learner key
    if (parsed.currentDay !== undefined || parsed.completedDays !== undefined) {
      // Looks like raw learner state
      return {
        success: false,
        message: "This looks like raw learner data, not a CSA export file. Please use the full export format.",
      };
    }

    return { success: false, message: "Unrecognized file format. Please use a Computer Skills Academy export file." };
  } catch {
    return { success: false, message: "Invalid JSON file. Please check the file format." };
  }
}

function importSingleStudent(
  data: StudentDataExport,
  options?: { password?: string; forceOverwrite?: boolean }
): ImportResult {
  const studentId = data._meta.studentId;
  if (studentId !== "st_1" && studentId !== "st_2") {
    return { success: false, message: `Invalid student ID: ${studentId}` };
  }

  // If password is provided, validate it against the exported data
  if (options?.password && data.password) {
    // Temporarily save the password to validate
    const keys = getStudentKeys(studentId);
    const existingPwd = localStorage.getItem(keys.password);
    localStorage.setItem(keys.password, data.password);
    const isValid = checkPassword(studentId, options.password);
    if (!isValid) {
      // Restore original
      if (existingPwd) localStorage.setItem(keys.password, existingPwd);
      else localStorage.removeItem(keys.password);
      return { success: false, message: `Password validation failed for ${studentId}. The exported data password doesn't match.` };
    }
    // Restore — the import will overwrite below
    if (existingPwd) localStorage.setItem(keys.password, existingPwd);
    else localStorage.removeItem(keys.password);
  }

  // Write all data to localStorage
  const keys = getStudentKeys(studentId);

  if (data.learner && Object.keys(data.learner).length > 0) {
    localStorage.setItem(keys.learner, JSON.stringify(data.learner));
  }

  if (data.password !== null && data.password !== undefined) {
    localStorage.setItem(keys.password, data.password);
  }

  if (data.deviceId !== null && data.deviceId !== undefined) {
    localStorage.setItem(keys.device, data.deviceId);
  }

  return {
    success: true,
    message: `Successfully imported ${data._meta.studentName} (${studentId}) — ${Object.keys(data.learner).length > 0 ? "progress restored" : "no progress data"}`,
    studentId,
  };
}

// ─── Continuous Auto-Save (called from useLearnerState) ───────────────────────

/**
 * Auto-save learner state to a "backup" key every time state changes.
 * This creates a recovery copy that can survive localStorage clears for other keys.
 * Called automatically by the useLearnerState hook.
 */
export function autoBackupStudent(studentId: StudentId, learnerState: Record<string, unknown>): void {
  try {
    const key = `csa_${studentId}_backup`;
    const data = {
      learner: learnerState,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // quota exceeded — silent fail
  }
}

/**
 * Restore from auto-backup if main key is missing.
 * Returns the restored learner state or null.
 */
export function restoreFromBackup(studentId: StudentId): Record<string, unknown> | null {
  try {
    const key = `csa_${studentId}_backup`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.learner ?? null;
  } catch {
    return null;
  }
}

/**
 * Get a summary of all stored data for a student (for display in settings/UI).
 */
export function getStudentDataSummary(studentId: StudentId): {
  hasLearnerData: boolean;
  hasPassword: boolean;
  hasDevice: boolean;
  lastBackupTime: string | null;
  totalSizeBytes: number;
} {
  const keys = getStudentKeys(studentId);
  const learnerRaw = localStorage.getItem(keys.learner);
  const backupRaw = localStorage.getItem(`csa_${studentId}_backup`);

  let lastBackupTime: string | null = null;
  if (backupRaw) {
    try {
      const parsed = JSON.parse(backupRaw);
      lastBackupTime = parsed.savedAt ?? null;
    } catch { /* ignore */ }
  }

  let totalSize = 0;
  for (const key of Object.values(keys)) {
    const val = localStorage.getItem(key);
    if (val) totalSize += val.length * 2; // UTF-16
  }
  if (backupRaw) totalSize += backupRaw.length * 2;

  return {
    hasLearnerData: !!learnerRaw,
    hasPassword: !!localStorage.getItem(keys.password),
    hasDevice: !!localStorage.getItem(keys.device),
    lastBackupTime,
    totalSizeBytes: totalSize,
  };
}
