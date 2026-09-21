import { randomUUID } from "node:crypto";
import { customAlphabet } from "nanoid";
import { query, withTransaction } from "./db";
import type {
  AnswerInput,
  Question,
  QuestionResult,
  ResponseSummary,
  Survey,
  SurveyDraft,
  SurveyResults,
} from "./types";
import { DEFAULT_THEME, type ThemeId } from "./themes";

function newId() {
  return randomUUID();
}

function newToken() {
  return randomUUID().replace(/-/g, "");
}

// Short, easy-to-read/share id for the public survey link — lowercase
// letters and digits only, excluding visually ambiguous characters
// (0/o, 1/l/i). Not a secret, just needs to look nice in a shared link.
const generateSurveyId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);

interface QuestionRow {
  id: string;
  survey_id: string;
  position: number;
  type: string;
  text: string;
  options: string | null;
  required: boolean;
}

function rowToQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    position: row.position,
    type: row.type as Question["type"],
    text: row.text,
    options: row.options ? (JSON.parse(row.options) as string[]) : undefined,
    required: !!row.required,
  };
}

export async function createSurvey(
  draft: SurveyDraft,
  creatorId?: string
): Promise<{ id: string; adminToken: string }> {
  const adminToken = newToken();
  const createdAt = new Date().toISOString();

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const id = generateSurveyId();
    try {
      await withTransaction(async (tx) => {
        await tx.query(
          `INSERT INTO surveys (id, title, description, admin_token, created_at, collect_name, creator_id, theme, allow_multiple_responses) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            draft.title,
            draft.description ?? "",
            adminToken,
            createdAt,
            draft.collectName === true,
            creatorId ?? null,
            draft.theme ?? DEFAULT_THEME,
            draft.allowMultipleResponses === true,
          ]
        );
        let position = 0;
        for (const q of draft.questions) {
          await tx.query(
            `INSERT INTO questions (id, survey_id, position, type, text, options, required) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [newId(), id, position, q.type, q.text, q.options ? JSON.stringify(q.options) : null, q.required]
          );
          position += 1;
        }
      });
      return { id, adminToken };
    } catch (err) {
      const code = (err as { code?: string } | undefined)?.code;
      // 23505 = unique_violation: extremely unlikely id collision — retry with a fresh id.
      if (code === "23505" && attempt < maxAttempts) continue;
      throw err;
    }
  }
  throw new Error("Umfrage konnte nicht erstellt werden (ID-Kollision).");
}

export async function getSurvey(id: string): Promise<Survey | null> {
  const surveyRows = await query<{
    id: string;
    title: string;
    description: string;
    created_at: string;
    collect_name: boolean;
    theme: string;
    allow_multiple_responses: boolean;
  }>(
    `SELECT id, title, description, created_at, collect_name, theme, allow_multiple_responses FROM surveys WHERE id = $1`,
    [id]
  );
  const surveyRow = surveyRows[0];
  if (!surveyRow) return null;

  const questionRows = await query<QuestionRow>(
    `SELECT * FROM questions WHERE survey_id = $1 ORDER BY position ASC`,
    [id]
  );

  return {
    id: surveyRow.id,
    title: surveyRow.title,
    description: surveyRow.description,
    collectName: !!surveyRow.collect_name,
    theme: (surveyRow.theme as ThemeId) || DEFAULT_THEME,
    allowMultipleResponses: !!surveyRow.allow_multiple_responses,
    createdAt: surveyRow.created_at,
    questions: questionRows.map(rowToQuestion),
  };
}

export interface CreatorSurveySummary {
  id: string;
  title: string;
  adminToken: string;
  createdAt: string;
}

export async function getSurveysByCreator(creatorId: string): Promise<CreatorSurveySummary[]> {
  const rows = await query<{ id: string; title: string; admin_token: string; created_at: string }>(
    `SELECT id, title, admin_token, created_at FROM surveys WHERE creator_id = $1 ORDER BY created_at DESC`,
    [creatorId]
  );
  return rows.map((r) => ({ id: r.id, title: r.title, adminToken: r.admin_token, createdAt: r.created_at }));
}

export async function isValidAdminToken(id: string, adminToken: string): Promise<boolean> {
  const rows = await query(`SELECT id FROM surveys WHERE id = $1 AND admin_token = $2`, [id, adminToken]);
  return rows.length > 0;
}

export async function hasVoted(surveyId: string, voterToken: string): Promise<boolean> {
  const rows = await query(`SELECT id FROM responses WHERE survey_id = $1 AND voter_token = $2`, [
    surveyId,
    voterToken,
  ]);
  return rows.length > 0;
}

export async function submitResponse(
  surveyId: string,
  voterToken: string,
  answers: AnswerInput[],
  voterName?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const survey = await getSurvey(surveyId);
  if (!survey) return { ok: false, error: "Umfrage nicht gefunden." };

  const questionById = new Map(survey.questions.map((q) => [q.id, q]));
  for (const q of survey.questions) {
    if (!q.required) continue;
    const answer = answers.find((a) => a.questionId === q.id);
    const isEmpty =
      !answer ||
      answer.value === undefined ||
      answer.value === null ||
      answer.value === "" ||
      (Array.isArray(answer.value) && answer.value.length === 0);
    if (isEmpty) {
      return { ok: false, error: `Frage "${q.text}" ist erforderlich.` };
    }
  }

  const responseId = newId();

  await withTransaction(async (tx) => {
    await tx.query(
      `INSERT INTO responses (id, survey_id, created_at, voter_token, voter_name) VALUES ($1, $2, $3, $4, $5)`,
      [responseId, surveyId, new Date().toISOString(), voterToken, voterName?.trim() || null]
    );
    for (const a of answers) {
      if (!questionById.has(a.questionId)) continue;
      await tx.query(`INSERT INTO answers (id, response_id, question_id, value) VALUES ($1, $2, $3, $4)`, [
        newId(),
        responseId,
        a.questionId,
        JSON.stringify(a.value),
      ]);
    }
  });

  return { ok: true };
}

export async function getResults(surveyId: string): Promise<SurveyResults | null> {
  const survey = await getSurvey(surveyId);
  if (!survey) return null;

  const countRows = await query<{ c: string }>(`SELECT COUNT(*) as c FROM responses WHERE survey_id = $1`, [
    surveyId,
  ]);
  const totalResponses = Number(countRows[0]?.c ?? 0);

  const answerRows = await query<{ question_id: string; value: string }>(
    `SELECT a.question_id as question_id, a.value as value
     FROM answers a
     JOIN responses r ON r.id = a.response_id
     WHERE r.survey_id = $1`,
    [surveyId]
  );

  const answersByQuestion = new Map<string, string[]>();
  for (const row of answerRows) {
    const list = answersByQuestion.get(row.question_id) ?? [];
    list.push(row.value);
    answersByQuestion.set(row.question_id, list);
  }

  const questionResults: QuestionResult[] = survey.questions.map((question) => {
    const raw = answersByQuestion.get(question.id) ?? [];
    const parsed = raw.map((v) => JSON.parse(v) as string | string[] | number);

    if (question.type === "single") {
      const optionCounts: Record<string, number> = {};
      for (const opt of question.options ?? []) optionCounts[opt] = 0;
      for (const value of parsed) {
        const v = String(value);
        optionCounts[v] = (optionCounts[v] ?? 0) + 1;
      }
      return { question, totalAnswers: parsed.length, optionCounts };
    }

    if (question.type === "multiple") {
      const optionCounts: Record<string, number> = {};
      for (const opt of question.options ?? []) optionCounts[opt] = 0;
      for (const value of parsed) {
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          const key = String(v);
          optionCounts[key] = (optionCounts[key] ?? 0) + 1;
        }
      }
      return { question, totalAnswers: parsed.length, optionCounts };
    }

    if (question.type === "rating") {
      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      let count = 0;
      for (const value of parsed) {
        const n = Number(value);
        if (Number.isFinite(n) && n >= 1 && n <= 5) {
          ratingDistribution[n] = (ratingDistribution[n] ?? 0) + 1;
          sum += n;
          count += 1;
        }
      }
      return {
        question,
        totalAnswers: count,
        ratingDistribution,
        ratingAverage: count > 0 ? sum / count : 0,
      };
    }

    const textAnswers = parsed.map((v) => String(v)).filter((v) => v.trim().length > 0);
    return { question, totalAnswers: textAnswers.length, textAnswers };
  });

  return { survey, totalResponses, questionResults };
}

export async function getRawResponses(surveyId: string) {
  const survey = await getSurvey(surveyId);
  if (!survey) return null;

  const responseRows = await query<{ id: string; created_at: string; voter_name: string | null }>(
    `SELECT id, created_at, voter_name FROM responses WHERE survey_id = $1 ORDER BY created_at ASC`,
    [surveyId]
  );

  const answerRows = await query<{ response_id: string; question_id: string; value: string }>(
    `SELECT response_id, question_id, value FROM answers WHERE response_id IN (
      SELECT id FROM responses WHERE survey_id = $1
    )`,
    [surveyId]
  );

  const answersByResponse = new Map<string, Map<string, unknown>>();
  for (const row of answerRows) {
    const map = answersByResponse.get(row.response_id) ?? new Map();
    map.set(row.question_id, JSON.parse(row.value));
    answersByResponse.set(row.response_id, map);
  }

  const rows = responseRows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    voterName: r.voter_name,
    answers: answersByResponse.get(r.id) ?? new Map<string, unknown>(),
  }));

  return { survey, rows };
}

export async function getNamedResponses(surveyId: string): Promise<ResponseSummary[] | null> {
  const raw = await getRawResponses(surveyId);
  if (!raw) return null;
  return raw.rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    voterName: r.voterName,
    answers: Object.fromEntries(r.answers) as ResponseSummary["answers"],
  }));
}
