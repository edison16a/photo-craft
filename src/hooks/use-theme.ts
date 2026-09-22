"use client";
/**
 * Light and dark theme. The theme lives on the html element as a
 * `data-theme` attribute (set before first paint by the layout script) and
 * is remembered in localStorage.
 */
import { useCallback, useEffect, useState } from "react";

/** The two colour themes. */
export type Theme = "light" | "dark";
/** localStorage key that remembers the theme. The layout script reads the same key. */
export const THEME_STORAGE_KEY = "photo-craft:theme";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Returns the active theme and a toggle. */
export function useTheme(): { theme: Theme; toggleTheme: () => void; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(readTheme());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked. The theme still applies for this visit.
    }
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, toggleTheme, setTheme };
}
