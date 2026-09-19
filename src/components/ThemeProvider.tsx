"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { THEMES, THEME_STORAGE_KEY, isThemeId, type ThemeId } from "@/lib/themes";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "solar",
  setTheme: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: ThemeId) {
  const config = THEMES[theme];
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.setProperty("--accent", config.accent);
  root.style.setProperty("--accent-hover", config.accentHover);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("solar");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initial = isThemeId(stored) ? stored : "solar";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only read of browser APIs unavailable during SSR
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  function setTheme(next: ThemeId) {
    setThemeState(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
