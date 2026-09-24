import Image from "next/image";
import Link from "next/link";
import { THEMES, type ThemeId } from "@/lib/themes";

export default function SurveyThemeBanner({
  theme,
  showBackLink = false,
}: {
  theme: ThemeId;
  showBackLink?: boolean;
}) {
  const config = THEMES[theme];
  const dark = config.headerBg === "dark";

  return (
    <div className={dark ? "border-b border-white/10 bg-black" : "border-b border-slate-200 bg-white"}>
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <Image
          src={config.logo.src}
          alt={config.logo.alt}
          width={150}
          height={64}
          className={config.logo.className}
        />
        {showBackLink && (
          <Link
            href="/"
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium ${
              dark
                ? "border-white/20 text-white/80 hover:bg-white/10"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            ← Übersicht
          </Link>
        )}
      </div>
    </div>
  );
}
