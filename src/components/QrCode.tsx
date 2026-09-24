"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

function wrapTitle(ctx: CanvasRenderingContext2D, title: string, maxWidth: number): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const allLines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      allLines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) allLines.push(current);

  if (allLines.length <= 2) return allLines;

  const lines = allLines.slice(0, 2);
  let last = lines[1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1).trimEnd();
  }
  lines[1] = `${last}…`;
  return lines;
}

async function composeQrImage(value: string, title: string, qrPixelSize: number): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(value, { width: qrPixelSize, margin: 1 });
  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = () => reject(new Error("QR image failed to load"));
    qrImg.src = qrDataUrl;
  });

  const padding = 28;
  const fontSize = 26;
  const lineHeight = fontSize * 1.3;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return qrDataUrl;

  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  const lines = title.trim() ? wrapTitle(ctx, title.trim(), qrPixelSize) : [];
  const titleBlockHeight = lines.length > 0 ? lines.length * lineHeight + padding * 0.5 : 0;

  canvas.width = qrPixelSize + padding * 2;
  canvas.height = qrPixelSize + padding * 2 + titleBlockHeight;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0f172a";
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, padding * 0.75 + i * lineHeight, qrPixelSize);
  });

  ctx.drawImage(qrImg, padding, padding + titleBlockHeight, qrPixelSize, qrPixelSize);

  return canvas.toDataURL("image/png");
}

export default function QrCode({
  value,
  title = "",
  size = 180,
  filename = "qr-code.png",
}: {
  value: string;
  title?: string;
  size?: number;
  filename?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    let cancelled = false;
    composeQrImage(value, title, size * 2)
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, title, size]);

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
        await navigator.share({ title: title || "Umfrage", text: value, files: [file] });
        return;
      }
    } catch {
      // fall through to link-only share below
    }
    try {
      await navigator.share({ title: title || "Umfrage", url: value });
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
        alt={title ? `QR-Code für ${title}` : "QR-Code zum Teilen"}
        style={{ width: size, height: "auto" }}
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
