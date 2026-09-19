"use client";

import { useAppTheme } from "./ThemeProvider";
import { THEMES, type ThemeId } from "@/lib/themes";

export default function ThemeSwitcher({ dark = false }: { dark?: boolean }) {
  const { theme, setTheme } = useAppTheme();

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as ThemeId)}
      aria-label="Marke auswählen"
      className={
        dark
          ? "rounded-lg border border-white/20 bg-transparent px-2 py-1.5 text-xs font-medium text-white [&>option]:text-black"
          : "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
      }
    >
      {Object.values(THEMES).map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
