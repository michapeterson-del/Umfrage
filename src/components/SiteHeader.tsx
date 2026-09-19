"use client";

import Image from "next/image";
import Link from "next/link";
import { useAppTheme } from "./ThemeProvider";
import { THEMES } from "@/lib/themes";
import ThemeSwitcher from "./ThemeSwitcher";
import AccountMenu from "./AccountMenu";

function ThemeLogo({ theme }: { theme: ReturnType<typeof useAppTheme>["theme"] }) {
  if (theme === "solar") {
    return <Image src="/logos/tepto-kitsolar.png" alt="tepto Solar" width={150} height={24} className="h-7 w-auto" />;
  }
  if (theme === "robotics") {
    return <Image src="/logos/tepto-robotics.png" alt="tepto Robotics" width={92} height={24} className="h-7 w-auto" />;
  }
  if (theme === "masterclass") {
    return (
      <Image
        src="/logos/tepto-masterclass.png"
        alt="tepto Masterclass"
        width={85}
        height={64}
        className="h-11 w-auto rounded"
      />
    );
  }
  // "alle": every logo, forced to a uniform white silhouette on black — all
  // brands visible without mixing their individual colors.
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logos/tepto.png"
        alt="tepto"
        width={92}
        height={30}
        className="h-6 w-auto brightness-0 invert"
      />
      <Image
        src="/logos/tepto-kitsolar.png"
        alt="tepto Solar"
        width={150}
        height={24}
        className="h-5 w-auto brightness-0 invert"
      />
      <Image
        src="/logos/tepto-robotics.png"
        alt="tepto Robotics"
        width={92}
        height={24}
        className="h-5 w-auto brightness-0 invert"
      />
      <Image
        src="/logos/tepto-masterclass.png"
        alt="tepto Masterclass"
        width={85}
        height={64}
        className="h-8 w-auto rounded border border-white/20"
      />
    </div>
  );
}

export default function SiteHeader() {
  const { theme } = useAppTheme();
  const dark = THEMES[theme].headerBg === "dark";

  return (
    <header className={dark ? "border-b border-white/10 bg-black" : "border-b border-slate-200 bg-white"}>
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <ThemeLogo theme={theme} />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeSwitcher dark={dark} />
          <AccountMenu dark={dark} />
        </div>
      </div>
    </header>
  );
}
