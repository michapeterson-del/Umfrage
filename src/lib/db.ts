import { Pool } from "pg";

const globalForDb = globalThis as unknown as {
  __umfragePool?: Pool;
  __umfrageSchemaReady?: Promise<void>;
};

function createPool(): Pool {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    throw new Error(
      "Keine Datenbankverbindung konfiguriert. Bitte POSTGRES_URL (oder DATABASE_URL) setzen — " +
        "z.B. durch Verknüpfen einer Vercel Postgres/Neon-Datenbank mit dem Projekt."
    );
  }

  return new Pool({ connectionString });
}

function getPool(): Pool {
  if (!globalForDb.__umfragePool) {
    globalForDb.__umfragePool = createPool();
  }
  return globalForDb.__umfragePool;
}

async function createSchema(): Promise<void> {
  const pool = getPool();
  await pool.query(`
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
      required BOOLEAN NOT NULL DEFAULT TRUE
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
}

// Schema creation is deferred to first real use (not at module import time):
// Next.js imports route modules during `next build` just to collect metadata,
// without ever calling the handlers — opening a DB connection at that point
// would fail in environments without a database configured at build time.
function ensureSchema(): Promise<void> {
  if (!globalForDb.__umfrageSchemaReady) {
    globalForDb.__umfrageSchemaReady = createSchema();
  }
  return globalForDb.__umfrageSchemaReady;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureSchema();
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

export async function withTransaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const tx: TransactionClient = {
      query: (text, params = []) => client.query(text, params).then((r) => r.rows),
    };
    const result = await fn(tx);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface TransactionClient {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}
