"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCode({
  value,
  size = 180,
  filename = "qr-code.png",
}: {
  value: string;
  size?: number;
  filename?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

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
      <a
        href={dataUrl}
        download={filename}
        className="text-xs font-medium text-[var(--accent)] hover:underline"
      >
        QR-Code herunterladen
      </a>
    </div>
  );
}
