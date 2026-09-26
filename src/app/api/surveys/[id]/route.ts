import { NextResponse } from "next/server";
import { getSurvey, hasVoted, updateSurvey } from "@/lib/surveys";
import { getOrCreateVoterToken } from "@/lib/voter";
import { validateDraft } from "../route";
import type { QuestionEditDraft } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = await getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: "Umfrage nicht gefunden." }, { status: 404 });
  }

  const { token } = await getOrCreateVoterToken(id);
  const voted = await hasVoted(id, token);

  return NextResponse.json({ survey, voted });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

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

  // Carry the per-question id from the raw body through validation (which
  // strips unknown fields) so updateSurvey can match questions by id and
  // keep their existing answers instead of recreating every question.
  const rawQuestions = (body as { questions?: unknown }).questions;
  const questionIds = Array.isArray(rawQuestions)
    ? rawQuestions.map((q) =>
        typeof q === "object" && q !== null && typeof (q as { id?: unknown }).id === "string"
          ? (q as { id: string }).id
          : undefined
      )
    : [];
  const questions: QuestionEditDraft[] = result.draft.questions.map((q, i) => ({
    ...q,
    id: questionIds[i],
  }));

  const updateResult = await updateSurvey(id, token, { ...result.draft, questions });
  if (!updateResult.ok) {
    return NextResponse.json({ error: updateResult.error }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
