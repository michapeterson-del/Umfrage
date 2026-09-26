import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { getRawResponses, getResults } from "./surveys";
import type { SurveyResults } from "./types";

function answerToText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export async function buildXlsx(surveyId: string): Promise<Buffer | null> {
  const results = await getResults(surveyId);
  const raw = await getRawResponses(surveyId);
  if (!results || !raw) return null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Umfrage App";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Zusammenfassung");
  summarySheet.columns = [
    { header: "Frage", key: "question", width: 50 },
    { header: "Antwort / Option", key: "option", width: 30 },
    { header: "Anzahl", key: "count", width: 12 },
    { header: "Anteil", key: "percent", width: 12 },
  ];
  summarySheet.getRow(1).font = { bold: true };

  for (const qr of results.questionResults) {
    if (qr.optionCounts) {
      const total = Object.values(qr.optionCounts).reduce((a, b) => a + b, 0) || 1;
      for (const [option, count] of Object.entries(qr.optionCounts)) {
        summarySheet.addRow({
          question: qr.question.text,
          option,
          count,
          percent: `${Math.round((count / total) * 100)}%`,
        });
      }
    } else if (qr.ratingDistribution) {
      const total = qr.totalAnswers || 1;
      for (const [stars, count] of Object.entries(qr.ratingDistribution)) {
        summarySheet.addRow({
          question: qr.question.text,
          option: `${stars} Sterne`,
          count,
          percent: `${Math.round((count / total) * 100)}%`,
        });
      }
      summarySheet.addRow({
        question: qr.question.text,
        option: "Durchschnitt",
        count: (qr.ratingAverage ?? 0).toFixed(2),
        percent: "",
      });
    } else if (qr.textAnswers) {
      summarySheet.addRow({
        question: qr.question.text,
        option: `${qr.textAnswers.length} Freitextantworten (siehe Tabellenblatt "Antworten")`,
        count: qr.textAnswers.length,
        percent: "",
      });
    }
    summarySheet.addRow({});
  }

  const rawSheet = workbook.addWorksheet("Antworten");
  const questionColumns = results.survey.questions.map((q) => ({
    header: q.text,
    key: q.id,
    width: 30,
  }));
  rawSheet.columns = [
    { header: "Eingegangen am", key: "createdAt", width: 22 },
    ...(results.survey.collectName ? [{ header: "Name", key: "voterName", width: 22 }] : []),
    ...questionColumns,
  ];
  rawSheet.getRow(1).font = { bold: true };

  for (const row of raw.rows) {
    const rowData: Record<string, string> = {
      createdAt: new Date(row.createdAt).toLocaleString("de-DE"),
      voterName: row.voterName ?? "",
    };
    for (const q of results.survey.questions) {
      rowData[q.id] = answerToText(row.answers.get(q.id));
    }
    rawSheet.addRow(rowData);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildPdf(surveyId: string): Promise<Buffer | null> {
  const results = await getResults(surveyId);
  if (!results) return null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderPdf(doc, results);
    doc.end();
  });
}

function renderPdf(doc: PDFKit.PDFDocument, results: SurveyResults) {
  doc.fontSize(20).font("Helvetica-Bold").text(results.survey.title);
  if (results.survey.description) {
    doc.moveDown(0.3).fontSize(11).font("Helvetica").fillColor("#555").text(results.survey.description);
    doc.fillColor("black");
  }
  doc
    .moveDown(0.5)
    .fontSize(10)
    .fillColor("#555")
    .text(`Teilnehmer:innen insgesamt: ${results.totalResponses}`)
    .text(`Erstellt am: ${new Date(results.survey.createdAt).toLocaleString("de-DE")}`)
    .fillColor("black");

  doc.moveDown(1);

  const barMaxWidth = 300;

  for (const qr of results.questionResults) {
    if (doc.y > 680) doc.addPage();

    doc.moveDown(0.8);
    doc.fontSize(13).font("Helvetica-Bold").text(qr.question.text);
    doc.fontSize(9).font("Helvetica").fillColor("#777").text(`Antworten: ${qr.totalAnswers}`).fillColor("black");
    doc.moveDown(0.3);

    if (qr.optionCounts) {
      const total = Object.values(qr.optionCounts).reduce((a, b) => a + b, 0) || 1;
      for (const [option, count] of Object.entries(qr.optionCounts)) {
        if (doc.y > 720) doc.addPage();
        const pct = count / total;
        const y = doc.y;
        doc.fontSize(10).font("Helvetica").text(`${option}`, { continued: false });
        const barY = doc.y + 2;
        doc.rect(50, barY, barMaxWidth, 10).stroke("#ddd");
        doc.rect(50, barY, Math.max(2, barMaxWidth * pct), 10).fill("#4f46e5");
        doc.fillColor("black").fontSize(9).text(`${count} (${Math.round(pct * 100)}%)`, 50 + barMaxWidth + 10, barY - 1);
        // .text() with an explicit x/y leaves the cursor there instead of
        // back at the left margin — without resetting doc.x, every following
        // unpositioned .text() call (next bar's label, next question's
        // title) starts from this offset and overlaps or runs off the page.
        doc.x = 50;
        doc.y = barY + 16;
        void y;
      }
    } else if (qr.ratingDistribution) {
      doc.fontSize(11).font("Helvetica-Bold").text(`Durchschnitt: ${(qr.ratingAverage ?? 0).toFixed(2)} / 5`);
      doc.moveDown(0.2);
      const total = qr.totalAnswers || 1;
      for (const stars of [5, 4, 3, 2, 1]) {
        if (doc.y > 720) doc.addPage();
        const count = qr.ratingDistribution[stars] ?? 0;
        const pct = count / total;
        doc.fontSize(10).font("Helvetica").text(`${stars} Sterne`);
        // barY is read after the label above, so the bar lands below its
        // text instead of overlapping it (the label call moves doc.y down).
        const barY = doc.y + 2;
        doc.rect(50, barY, barMaxWidth, 10).stroke("#ddd");
        doc.rect(50, barY, Math.max(2, barMaxWidth * pct), 10).fill("#f59e0b");
        doc.fillColor("black").fontSize(9).text(`${count} (${Math.round(pct * 100)}%)`, 50 + barMaxWidth + 10, barY - 1);
        doc.x = 50;
        doc.y = barY + 16;
      }
    } else if (qr.textAnswers) {
      if (qr.textAnswers.length === 0) {
        doc.fontSize(10).font("Helvetica-Oblique").fillColor("#777").text("Keine Antworten.").fillColor("black");
      }
      for (const answer of qr.textAnswers) {
        if (doc.y > 720) doc.addPage();
        doc.fontSize(10).font("Helvetica").text(`• ${answer}`, { width: 480 });
      }
    }
  }
}
