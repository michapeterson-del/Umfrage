import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_PREFIX = "umfrage_voter_";

export async function getOrCreateVoterToken(surveyId: string): Promise<{
  token: string;
  isNew: boolean;
}> {
  const cookieStore = await cookies();
  const name = `${COOKIE_PREFIX}${surveyId}`;
  const existing = cookieStore.get(name)?.value;
  if (existing) return { token: existing, isNew: false };

  const token = randomUUID();
  cookieStore.set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return { token, isNew: true };
}
