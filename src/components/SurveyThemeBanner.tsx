import Image from "next/image";
import { THEMES, type ThemeId } from "@/lib/themes";

const LOGO_BY_THEME: Record<ThemeId, { src: string; alt: string; className: string }> = {
  solar: { src: "/logos/tepto-kitsolar.png", alt: "tepto Solar", className: "h-7 w-auto" },
  robotics: { src: "/logos/tepto-robotics.png", alt: "tepto Robotics", className: "h-7 w-auto" },
  masterclass: { src: "/logos/tepto-masterclass.png", alt: "tepto Masterclass", className: "h-11 w-auto rounded" },
  alle: { src: "/logos/tepto.png", alt: "tepto", className: "h-7 w-auto brightness-0 invert" },
};

export default function SurveyThemeBanner({ theme }: { theme: ThemeId }) {
  const dark = THEMES[theme].headerBg === "dark";
  const logo = LOGO_BY_THEME[theme];

  return (
    <div className={dark ? "border-b border-white/10 bg-black" : "border-b border-slate-200 bg-white"}>
      <div className="mx-auto max-w-2xl px-4 py-3">
        <Image src={logo.src} alt={logo.alt} width={150} height={64} className={logo.className} />
      </div>
    </div>
  );
}
