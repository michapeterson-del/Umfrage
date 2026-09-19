import Image from "next/image";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 py-6 text-center">
        <p className="text-xs font-medium text-slate-400">Teil der tepto-Familie</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <Image src="/logos/tepto.png" alt="tepto" width={92} height={30} className="h-6 w-auto" />
          <Image
            src="/logos/tepto-kitsolar.png"
            alt="kitSolar by tepto"
            width={150}
            height={24}
            className="h-6 w-auto"
          />
          <Image
            src="/logos/tepto-robotics.png"
            alt="tepto Robotics"
            width={92}
            height={24}
            className="h-6 w-auto"
          />
          <Image
            src="/logos/tepto-masterclass.png"
            alt="tepto Masterclass"
            width={85}
            height={64}
            className="h-16 w-auto rounded-md"
          />
        </div>
      </div>
    </footer>
  );
}
