import Image from "next/image";
import { THEMES, type ThemeId } from "@/lib/themes";

export default function SurveyThemeBanner({ theme }: { theme: ThemeId }) {
  const config = THEMES[theme];
  const dark = config.headerBg === "dark";

  return (
    <div className={dark ? "border-b border-white/10 bg-black" : "border-b border-slate-200 bg-white"}>
      <div className="mx-auto max-w-2xl px-4 py-3">
        <Image
          src={config.logo.src}
          alt={config.logo.alt}
          width={150}
          height={64}
          className={config.logo.className}
        />
      </div>
    </div>
  );
}
