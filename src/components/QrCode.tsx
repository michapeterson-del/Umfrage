"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCode({
  value,
  size = 180,
  filename = "qr-code.png",
  shareTitle = "Umfrage",
}: {
  value: string;
  size?: number;
  filename?: string;
  shareTitle?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: size * 2, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only read of browser APIs unavailable during SSR
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function handleShare() {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: shareTitle, text: value, files: [file] });
        return;
      }
    } catch {
      // fall through to link-only share below
    }
    try {
      await navigator.share({ title: shareTitle, url: value });
    } catch {
      // user cancelled or sharing unsupported — nothing to do
    }
  }

  if (!dataUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400"
        style={{ width: size, height: size }}
      >
        QR-Code …
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={dataUrl}
        alt="QR-Code zum Teilen"
        width={size}
        height={size}
        className="rounded-lg border border-slate-200 bg-white p-2"
      />
      <div className="flex items-center gap-3">
        <a
          href={dataUrl}
          download={filename}
          className="text-xs font-medium text-[var(--accent)] hover:underline"
        >
          Herunterladen
        </a>
        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Teilen
          </button>
        )}
      </div>
    </div>
  );
}
