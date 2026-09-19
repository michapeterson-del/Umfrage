import { NextResponse } from "next/server";
import { createSurvey } from "@/lib/surveys";
import type { QuestionDraft, QuestionType, SurveyDraft } from "@/lib/types";

const VALID_TYPES: QuestionType[] = ["single", "multiple", "rating", "text"];

function validateDraft(body: unknown): { draft: SurveyDraft } | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Ungültige Anfrage." };
  const b = body as Record<string, unknown>;

  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) return { error: "Titel darf nicht leer sein." };
  if (title.length > 200) return { error: "Titel ist zu lang." };

  const description = typeof b.description === "string" ? b.description.trim() : "";

  if (!Array.isArray(b.questions) || b.questions.length === 0) {
    return { error: "Die Umfrage braucht mindestens eine Frage." };
  }
  if (b.questions.length > 30) return { error: "Zu viele Fragen (max. 30)." };

  const questions: QuestionDraft[] = [];
  for (const raw of b.questions) {
    if (typeof raw !== "object" || raw === null) return { error: "Ungültige Frage." };
    const q = raw as Record<string, unknown>;
    const type = q.type as QuestionType;
    if (!VALID_TYPES.includes(type)) return { error: "Ungültiger Fragetyp." };
    const text = typeof q.text === "string" ? q.text.trim() : "";
    if (!text) return { error: "Jede Frage braucht einen Text." };
    if (text.length > 500) return { error: "Frage ist zu lang." };

    let options: string[] | undefined;
    if (type === "single" || type === "multiple") {
      const rawOptions = Array.isArray(q.options) ? q.options : [];
      options = rawOptions
        .filter((o): o is string => typeof o === "string")
        .map((o) => o.trim())
        .filter(Boolean)
        .slice(0, 20);
      if (options.length < 2) return { error: `Frage "${text}" braucht mindestens 2 Antwortoptionen.` };
    }

    questions.push({
      type,
      text,
      options,
      required: q.required !== false,
    });
  }

  const collectName = b.collectName === true;

  return { draft: { title, description, collectName, questions } };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const result = validateDraft(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const rawCreatorId = (body as Record<string, unknown>).creatorId;
  const creatorId =
    typeof rawCreatorId === "string" && rawCreatorId.trim().length > 0
      ? rawCreatorId.trim().slice(0, 100)
      : undefined;

  const { id, adminToken } = await createSurvey(result.draft, creatorId);
  return NextResponse.json({ id, adminToken });
}
