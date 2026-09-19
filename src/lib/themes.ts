export type ThemeId = "solar" | "robotics" | "masterclass" | "alle";

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  accent: string;
  accentHover: string;
  headerBg: "light" | "dark";
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  solar: {
    id: "solar",
    label: "tepto Solar",
    accent: "#16a34a",
    accentHover: "#15803d",
    headerBg: "light",
  },
  robotics: {
    id: "robotics",
    label: "tepto Robotics",
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    headerBg: "light",
  },
  masterclass: {
    id: "masterclass",
    label: "tepto Masterclass",
    accent: "#c9a227",
    accentHover: "#a9871f",
    headerBg: "dark",
  },
  alle: {
    id: "alle",
    label: "Alle Marken",
    accent: "#111827",
    accentHover: "#000000",
    headerBg: "dark",
  },
};

export const DEFAULT_THEME: ThemeId = "solar";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && value in THEMES;
}
