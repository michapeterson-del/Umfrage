export type ThemeId = "solar" | "robotics" | "masterclass" | "alle";

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  accent: string;
  accentHover: string;
  headerBg: "light" | "dark";
  logo: { src: string; alt: string; className: string };
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  solar: {
    id: "solar",
    label: "kitSolar by tepto",
    accent: "#16a34a",
    accentHover: "#15803d",
    headerBg: "light",
    logo: { src: "/logos/tepto-kitsolar.png", alt: "kitSolar by tepto", className: "h-6 w-auto" },
  },
  robotics: {
    id: "robotics",
    label: "tepto Robotics",
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    headerBg: "light",
    logo: { src: "/logos/tepto-robotics.png", alt: "tepto Robotics", className: "h-6 w-auto" },
  },
  masterclass: {
    id: "masterclass",
    label: "tepto Masterclass",
    accent: "#c9a227",
    accentHover: "#a9871f",
    headerBg: "dark",
    logo: { src: "/logos/tepto-masterclass.png", alt: "tepto Masterclass", className: "h-9 w-auto rounded" },
  },
  alle: {
    id: "alle",
    label: "Alle Marken",
    accent: "#111827",
    accentHover: "#000000",
    headerBg: "dark",
    logo: { src: "/logos/tepto.png", alt: "tepto", className: "h-6 w-auto brightness-0 invert" },
  },
};

export const DEFAULT_THEME: ThemeId = "solar";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && value in THEMES;
}
