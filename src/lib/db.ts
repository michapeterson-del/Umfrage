import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const globalForDb = globalThis as unknown as { __umfrageDb?: Database.Database };

function createDb() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const instance = new Database(path.join(dataDir, "umfrage.db"));
  instance.pragma("journal_mode = WAL");
  instance.exec(`
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      admin_token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      options TEXT,
      required INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      voter_token TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(survey_id);
    CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
    CREATE INDEX IF NOT EXISTS idx_answers_response ON answers(response_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_survey_voter ON responses(survey_id, voter_token);
  `);
  return instance;
}

// Lazily opened on first real use (not at module import time): Next.js imports
// route modules during `next build` just to collect metadata, without ever
// calling the handlers. Opening the sqlite file eagerly at import time made
// several build workers race to open/migrate the same file concurrently and
// fail with "database is locked".
function ensureDb(): Database.Database {
  if (!globalForDb.__umfrageDb) {
    globalForDb.__umfrageDb = createDb();
  }
  return globalForDb.__umfrageDb;
}

export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const instance = ensureDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
