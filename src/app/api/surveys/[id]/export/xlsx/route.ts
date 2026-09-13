import { NextResponse } from "next/server";
import { isValidAdminToken, getSurvey } from "@/lib/surveys";
import { buildXlsx } from "@/lib/export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";

  if (!token || !(await isValidAdminToken(id, token))) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const survey = await getSurvey(id);
  const buffer = await buildXlsx(id);
  if (!buffer || !survey) {
    return NextResponse.json({ error: "Umfrage nicht gefunden." }, { status: 404 });
  }

  const filename = `${survey.title.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "").trim() || "umfrage"}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
