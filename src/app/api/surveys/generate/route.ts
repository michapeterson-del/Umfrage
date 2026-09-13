import { NextResponse } from "next/server";
import { generateSurveyDraft } from "@/lib/ai";

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

  const { draft, usedAI } = await generateSurveyDraft(input);
  return NextResponse.json({ draft, usedAI });
}
