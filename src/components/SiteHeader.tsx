"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "./AccountMenu";

export default function SiteHeader() {
  const pathname = usePathname();

  // Survey pages (/u/...) render their own themed header matching that
  // survey's chosen brand — the creator dashboard chrome (with the account
  // menu) has no business being there for anonymous respondents.
  if (pathname?.startsWith("/u/")) return null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logos/tepto.png" alt="tepto" width={92} height={30} priority className="h-7 w-auto" />
          <span className="text-sm font-medium text-slate-400">Umfrage</span>
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}
