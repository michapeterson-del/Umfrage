"use client";

export interface SavedSurvey {
  id: string;
  title: string;
  adminToken: string;
  createdAt: string;
}

const STORAGE_KEY = "umfrage_meine_umfragen";
const CREATOR_ID_KEY = "umfrage_ersteller_id";
export const SURVEYS_CHANGED_EVENT = "umfrage:surveys-changed";

function notifyChanged() {
  window.dispatchEvent(new Event(SURVEYS_CHANGED_EVENT));
}

export function loadSavedSurveys(): SavedSurvey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSurvey[]) : [];
  } catch {
    return [];
  }
}

export function saveSurveyToStorage(entry: SavedSurvey) {
  const list = loadSavedSurveys();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...list]));
  notifyChanged();
}

export function removeSurveyFromStorage(id: string) {
  const list = loadSavedSurveys().filter((s) => s.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  notifyChanged();
}

export function mergeSurveysIntoStorage(entries: SavedSurvey[]) {
  const existing = loadSavedSurveys();
  const byId = new Map(existing.map((s) => [s.id, s]));
  for (const entry of entries) byId.set(entry.id, entry);
  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  notifyChanged();
}

export function getOrCreateCreatorId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(CREATOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(CREATOR_ID_KEY, id);
  }
  return id;
}

export function setCreatorId(id: string) {
  window.localStorage.setItem(CREATOR_ID_KEY, id);
}

/**
 * Parses either a full results link (".../u/<id>/ergebnisse?token=...") or a
 * plain "id:token" string, e.g. pasted from someone sharing one survey with you.
 */
export function parseSurveyLink(input: string): { id: string; token: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/u\/([^/]+)\/ergebnisse/);
    const token = url.searchParams.get("token");
    if (match && token) return { id: match[1], token };
  } catch {
    // not a URL, fall through
  }

  const parts = trimmed.split(":");
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return { id: parts[0].trim(), token: parts[1].trim() };
  }

  return null;
}
