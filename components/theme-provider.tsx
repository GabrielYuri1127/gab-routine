"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "gavium-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const savedMode = readSavedTheme();
    setModeState(savedMode);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function syncTheme() {
      const resolved = mode === "system" ? (media.matches ? "dark" : "light") : mode;
      applyTheme(resolved);
      setResolvedTheme(resolved);
    }

    function syncStoredTheme(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        setModeState(isThemeMode(event.newValue) ? event.newValue : "system");
      }
    }

    syncTheme();
    media.addEventListener("change", syncTheme);
    window.addEventListener("storage", syncStoredTheme);

    return () => {
      media.removeEventListener("change", syncTheme);
      window.removeEventListener("storage", syncStoredTheme);
    };
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setMode(nextMode) {
        try {
          window.localStorage.setItem(STORAGE_KEY, nextMode);
        } catch {
          // The theme still applies for this session when storage is unavailable.
        }
        setModeState(nextMode);
      }
    }),
    [mode, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return value;
}

function readSavedTheme(): ThemeMode {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(value) ? value : "system";
  } catch {
    return "system";
  }
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute("content", theme === "dark" ? "#0b1017" : "#f5f7fb");
}
