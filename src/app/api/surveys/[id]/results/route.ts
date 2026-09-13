import { NextResponse } from "next/server";
import { getResults, isValidAdminToken } from "@/lib/surveys";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";

  if (!token || !isValidAdminToken(id, token)) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const results = getResults(id);
  if (!results) {
    return NextResponse.json({ error: "Umfrage nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(results);
}
