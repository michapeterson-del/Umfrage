import { randomUUID } from "node:crypto";
import { db } from "./db";
import type {
  AnswerInput,
  Question,
  QuestionResult,
  Survey,
  SurveyDraft,
  SurveyResults,
} from "./types";

function newId() {
  return randomUUID();
}

function newToken() {
  return randomUUID().replace(/-/g, "");
}

interface QuestionRow {
  id: string;
  survey_id: string;
  position: number;
  type: string;
  text: string;
  options: string | null;
  required: number;
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

export function createSurvey(draft: SurveyDraft): { id: string; adminToken: string } {
  const id = newId();
  const adminToken = newToken();
  const createdAt = new Date().toISOString();

  const insertSurvey = db.prepare(
    `INSERT INTO surveys (id, title, description, admin_token, created_at) VALUES (?, ?, ?, ?, ?)`
  );
  const insertQuestion = db.prepare(
    `INSERT INTO questions (id, survey_id, position, type, text, options, required) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    insertSurvey.run(id, draft.title, draft.description ?? "", adminToken, createdAt);
    draft.questions.forEach((q, index) => {
      insertQuestion.run(
        newId(),
        id,
        index,
        q.type,
        q.text,
        q.options ? JSON.stringify(q.options) : null,
        q.required ? 1 : 0
      );
    });
  });
  tx();

  return { id, adminToken };
}

export function getSurvey(id: string): Survey | null {
  const surveyRow = db
    .prepare(`SELECT id, title, description, created_at FROM surveys WHERE id = ?`)
    .get(id) as { id: string; title: string; description: string; created_at: string } | undefined;
  if (!surveyRow) return null;

  const questionRows = db
    .prepare(`SELECT * FROM questions WHERE survey_id = ? ORDER BY position ASC`)
    .all(id) as QuestionRow[];

  return {
    id: surveyRow.id,
    title: surveyRow.title,
    description: surveyRow.description,
    createdAt: surveyRow.created_at,
    questions: questionRows.map(rowToQuestion),
  };
}

export function getSurveyByAdminToken(id: string, adminToken: string): Survey | null {
  const row = db
    .prepare(`SELECT id FROM surveys WHERE id = ? AND admin_token = ?`)
    .get(id, adminToken) as { id: string } | undefined;
  if (!row) return null;
  return getSurvey(id);
}

export function isValidAdminToken(id: string, adminToken: string): boolean {
  const row = db
    .prepare(`SELECT id FROM surveys WHERE id = ? AND admin_token = ?`)
    .get(id, adminToken);
  return !!row;
}

export function hasVoted(surveyId: string, voterToken: string): boolean {
  const row = db
    .prepare(`SELECT id FROM responses WHERE survey_id = ? AND voter_token = ?`)
    .get(surveyId, voterToken);
  return !!row;
}

export function submitResponse(
  surveyId: string,
  voterToken: string,
  answers: AnswerInput[]
): { ok: true } | { ok: false; error: string } {
  const survey = getSurvey(surveyId);
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
  const insertResponse = db.prepare(
    `INSERT INTO responses (id, survey_id, created_at, voter_token) VALUES (?, ?, ?, ?)`
  );
  const insertAnswer = db.prepare(
    `INSERT INTO answers (id, response_id, question_id, value) VALUES (?, ?, ?, ?)`
  );

  try {
    const tx = db.transaction(() => {
      insertResponse.run(responseId, surveyId, new Date().toISOString(), voterToken);
      for (const a of answers) {
        if (!questionById.has(a.questionId)) continue;
        insertAnswer.run(newId(), responseId, a.questionId, JSON.stringify(a.value));
      }
    });
    tx();
  } catch {
    return { ok: false, error: "Du hast an dieser Umfrage bereits teilgenommen." };
  }

  return { ok: true };
}

export function getResults(surveyId: string): SurveyResults | null {
  const survey = getSurvey(surveyId);
  if (!survey) return null;

  const totalResponses = (
    db.prepare(`SELECT COUNT(*) as c FROM responses WHERE survey_id = ?`).get(surveyId) as {
      c: number;
    }
  ).c;

  const answerRows = db
    .prepare(
      `SELECT a.question_id as question_id, a.value as value
       FROM answers a
       JOIN responses r ON r.id = a.response_id
       WHERE r.survey_id = ?`
    )
    .all(surveyId) as { question_id: string; value: string }[];

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

export function getRawResponses(surveyId: string) {
  const survey = getSurvey(surveyId);
  if (!survey) return null;

  const responseRows = db
    .prepare(`SELECT id, created_at FROM responses WHERE survey_id = ? ORDER BY created_at ASC`)
    .all(surveyId) as { id: string; created_at: string }[];

  const answerRows = db
    .prepare(`SELECT response_id, question_id, value FROM answers WHERE response_id IN (
      SELECT id FROM responses WHERE survey_id = ?
    )`)
    .all(surveyId) as { response_id: string; question_id: string; value: string }[];

  const answersByResponse = new Map<string, Map<string, unknown>>();
  for (const row of answerRows) {
    const map = answersByResponse.get(row.response_id) ?? new Map();
    map.set(row.question_id, JSON.parse(row.value));
    answersByResponse.set(row.response_id, map);
  }

  const rows = responseRows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    answers: answersByResponse.get(r.id) ?? new Map<string, unknown>(),
  }));

  return { survey, rows };
}
