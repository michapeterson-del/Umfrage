import { NextResponse } from "next/server";
import { getSurvey, hasVoted } from "@/lib/surveys";
import { getOrCreateVoterToken } from "@/lib/voter";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const survey = getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: "Umfrage nicht gefunden." }, { status: 404 });
  }

  const { token } = await getOrCreateVoterToken(id);
  const voted = hasVoted(id, token);

  return NextResponse.json({ survey, voted });
}
