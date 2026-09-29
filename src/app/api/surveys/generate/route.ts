import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { generateSurveyDraft } from "@/lib/ai";
import { query } from "@/lib/db";

// Schutz des Anthropic-Kontingents: die Route ist ohne Login erreichbar.
const MAX_PRO_IP_UND_STUNDE = 15;
const MAX_GESAMT_PRO_TAG = 500;

async function overLimit(request: Request): Promise<boolean> {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unbekannt";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const [{ ip_count, total }] = await query<{ ip_count: string; total: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE ip_hash = $1 AND created_at > NOW() - INTERVAL '1 hour') AS ip_count,
       COUNT(*) AS total
     FROM ai_requests WHERE created_at > NOW() - INTERVAL '1 day'`,
    [ipHash]
  );
  if (Number(ip_count) >= MAX_PRO_IP_UND_STUNDE || Number(total) >= MAX_GESAMT_PRO_TAG) return true;
  await query(`INSERT INTO ai_requests (ip_hash) VALUES ($1)`, [ipHash]);
  if (Math.random() < 0.02) {
    await query(`DELETE FROM ai_requests WHERE created_at < NOW() - INTERVAL '2 days'`);
  }
  return false;
}

export async function POST(request: Request) {
  let body: { input?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  if (!input) {
    return NextResponse.json(
      { error: "Bitte beschreibe, was du fragen möchtest." },
      { status: 400 }
    );
  }
  if (input.length > 8000) {
    return NextResponse.json({ error: "Text ist zu lang (max. 8000 Zeichen)." }, { status: 400 });
  }

  if (await overLimit(request)) {
    return NextResponse.json(
      { error: "Zu viele KI-Anfragen. Bitte später erneut versuchen." },
      { status: 429 }
    );
  }

  const { draft, usedAI } = await generateSurveyDraft(input);
  return NextResponse.json({ draft, usedAI });
}
