import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logos/tepto.png" alt="tepto" width={92} height={30} priority className="h-7 w-auto" />
          <span className="text-sm font-medium text-slate-400">Umfrage</span>
        </Link>
      </div>
    </header>
  );
}
