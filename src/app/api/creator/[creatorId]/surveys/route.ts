import { NextResponse } from "next/server";
import { getSurveysByCreator } from "@/lib/surveys";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const { creatorId } = await params;
  if (!creatorId || creatorId.trim().length === 0) {
    return NextResponse.json({ error: "Ungültige Ersteller-ID." }, { status: 400 });
  }

  const surveys = await getSurveysByCreator(creatorId.trim());
  return NextResponse.json({ surveys });
}
