import type { CSSProperties } from "react";
import { THEMES, type ThemeId } from "./themes";

export function themeStyle(theme: ThemeId): CSSProperties {
  const t = THEMES[theme];
  return { "--accent": t.accent, "--accent-hover": t.accentHover } as CSSProperties;
}
