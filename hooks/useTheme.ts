"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "csa_theme";

export function useTheme() {
  const [isDark, setIsDark] = useState(true); // dark by default

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setIsDark(saved === "dark");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((d) => !d), []);

  return { isDark, toggle };
}
