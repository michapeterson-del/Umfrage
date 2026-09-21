import { NextResponse } from "next/server";
import { getSurvey, hasVoted, submitResponse } from "@/lib/surveys";
import { getOrCreateVoterToken } from "@/lib/voter";
import type { AnswerInput } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { answers?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (!Array.isArray(body.answers)) {
    return NextResponse.json({ error: "Ungültige Antworten." }, { status: 400 });
  }

  const voterName = typeof body.name === "string" ? body.name.trim().slice(0, 200) : undefined;

  const answers: AnswerInput[] = [];
  for (const raw of body.answers) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.questionId !== "string") continue;
    const value = r.value as AnswerInput["value"];
    answers.push({ questionId: r.questionId, value });
  }

  const survey = await getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: "Umfrage nicht gefunden." }, { status: 404 });
  }

  const { token } = await getOrCreateVoterToken(id);

  if (!survey.allowMultipleResponses && (await hasVoted(id, token))) {
    return NextResponse.json(
      { error: "Du hast an dieser Umfrage bereits teilgenommen." },
      { status: 409 }
    );
  }

  const result = await submitResponse(id, token, answers, voterName);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
