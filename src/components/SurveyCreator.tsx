"use client";

import { useEffect, useState } from "react";
import type { QuestionDraft, QuestionType, SurveyDraft } from "@/lib/types";

interface SavedSurvey {
  id: string;
  title: string;
  adminToken: string;
  createdAt: string;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  single: "Einzelauswahl",
  multiple: "Mehrfachauswahl",
  rating: "Bewertung (1–5)",
  text: "Freitext",
};

const STORAGE_KEY = "umfrage_meine_umfragen";

function loadSavedSurveys(): SavedSurvey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSurvey[]) : [];
  } catch {
    return [];
  }
}

function saveSurveyToStorage(entry: SavedSurvey) {
  const list = loadSavedSurveys();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...list]));
}

function removeSurveyFromStorage(id: string) {
  const list = loadSavedSurveys().filter((s) => s.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function emptyQuestion(): QuestionDraft {
  return { type: "text", text: "", required: true };
}

function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="text-sm font-medium text-slate-700">{label}</div>
      {hint && <div className="text-xs text-slate-500 mb-1">{hint}</div>}
      <div className="mt-1 flex gap-2">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {copied ? "Kopiert ✓" : "Kopieren"}
        </button>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  onChange,
  onDelete,
}: {
  question: QuestionDraft;
  onChange: (q: QuestionDraft) => void;
  onDelete: () => void;
}) {
  const needsOptions = question.type === "single" || question.type === "multiple";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <input
          value={question.text}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
          placeholder="Fragetext"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={question.type}
          onChange={(e) => {
            const type = e.target.value as QuestionType;
            const nextNeedsOptions = type === "single" || type === "multiple";
            onChange({
              ...question,
              type,
              options: nextNeedsOptions
                ? question.options && question.options.length >= 2
                  ? question.options
                  : ["Ja", "Nein"]
                : undefined,
            });
          }}
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Frage löschen"
          className="shrink-0 rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          ✕
        </button>
      </div>

      {needsOptions && (
        <div className="mt-3 space-y-2 pl-1">
          {(question.options ?? []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={(e) => {
                  const options = [...(question.options ?? [])];
                  options[i] = e.target.value;
                  onChange({ ...question, options });
                }}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const options = (question.options ?? []).filter((_, idx) => idx !== i);
                  onChange({ ...question, options });
                }}
                className="text-slate-400 hover:text-red-600"
                aria-label="Option entfernen"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...question,
                options: [...(question.options ?? []), `Option ${(question.options?.length ?? 0) + 1}`],
              })
            }
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            + Option hinzufügen
          </button>
        </div>
      )}

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={question.required}
          onChange={(e) => onChange({ ...question, required: e.target.checked })}
        />
        Antwort erforderlich
      </label>
    </div>
  );
}

export default function SurveyCreator() {
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<SurveyDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiInfo, setAiInfo] = useState<string | null>(null);
  const [published, setPublished] = useState<{ id: string; adminToken: string } | null>(null);
  const [savedSurveys, setSavedSurveys] = useState<SavedSurvey[]>([]);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only read of browser APIs unavailable during SSR
    setSavedSurveys(loadSavedSurveys());
    setOrigin(window.location.origin);
  }, []);

  async function handleGenerate() {
    setError(null);
    setAiInfo(null);
    if (!input.trim()) {
      setError("Bitte beschreibe kurz, was du fragen möchtest.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/surveys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Etwas ist schiefgelaufen.");
        return;
      }
      setDraft(data.draft as SurveyDraft);
      setAiInfo(
        data.usedAI
          ? "Von der KI erstellt — prüfe die Fragen und passe sie bei Bedarf an."
          : "Kein ANTHROPIC_API_KEY konfiguriert — es wurde eine einfache Basis-Umfrage aus deinem Text erzeugt. Du kannst sie unten bearbeiten."
      );
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(index: number, q: QuestionDraft) {
    if (!draft) return;
    const questions = [...draft.questions];
    questions[index] = q;
    setDraft({ ...draft, questions });
  }

  function deleteQuestion(index: number) {
    if (!draft) return;
    setDraft({ ...draft, questions: draft.questions.filter((_, i) => i !== index) });
  }

  function addQuestion() {
    if (!draft) return;
    setDraft({ ...draft, questions: [...draft.questions, emptyQuestion()] });
  }

  async function handlePublish() {
    if (!draft) return;
    setError(null);
    if (!draft.title.trim()) {
      setError("Bitte gib einen Titel für die Umfrage ein.");
      return;
    }
    if (draft.questions.length === 0) {
      setError("Füge mindestens eine Frage hinzu.");
      return;
    }
    for (const q of draft.questions) {
      if (!q.text.trim()) {
        setError("Alle Fragen brauchen einen Text.");
        return;
      }
      if ((q.type === "single" || q.type === "multiple") && (q.options ?? []).filter((o) => o.trim()).length < 2) {
        setError(`Frage "${q.text}" braucht mindestens 2 Antwortoptionen.`);
        return;
      }
    }

    setPublishing(true);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Veröffentlichen fehlgeschlagen.");
        return;
      }
      const entry: SavedSurvey = {
        id: data.id,
        title: draft.title,
        adminToken: data.adminToken,
        createdAt: new Date().toISOString(),
      };
      saveSurveyToStorage(entry);
      setSavedSurveys(loadSavedSurveys());
      setPublished({ id: data.id, adminToken: data.adminToken });
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setPublishing(false);
    }
  }

  function resetAll() {
    setInput("");
    setDraft(null);
    setPublished(null);
    setError(null);
    setAiInfo(null);
  }

  if (published) {
    const voteLink = `${origin}/u/${published.id}`;
    const resultsLink = `${origin}/u/${published.id}/ergebnisse?token=${published.adminToken}`;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-900">Umfrage veröffentlicht 🎉</h2>
          <p className="mt-1 text-sm text-green-800">
            Teile den Umfrage-Link. Die Antworten sind anonym — nur du kannst über den Ergebnis-Link die
            Auswertung sehen.
          </p>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <CopyField label="Umfrage-Link (zum Teilen)" value={voteLink} />
          <CopyField
            label="Ergebnis-Link (privat, nicht teilen!)"
            value={resultsLink}
            hint="Nur mit diesem Link siehst du die Auswertung und kannst Excel/PDF herunterladen."
          />
        </div>
        <div className="flex gap-3">
          <a
            href={resultsLink}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Zu den Ergebnissen
          </a>
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Neue Umfrage erstellen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {!draft && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">
            Was möchtest du wissen?
          </label>
          <p className="mt-1 text-sm text-slate-500">
            Beschreibe frei in eigenen Worten, was du fragen möchtest — die KI erkennt daraus passende Fragen,
            Antworttypen und Optionen.
          </p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder={
              "Beispiel: Ich möchte wissen, wie zufrieden das Team mit der neuen Kaffeemaschine ist (Skala 1-5), ob wir öfter Bio-Kaffee anbieten sollten (Ja/Nein) und ob es Verbesserungsvorschläge gibt."
            }
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "KI erstellt Umfrage …" : "Umfrage mit KI erstellen"}
          </button>
        </div>
      )}

      {draft && (
        <div className="space-y-4">
          {aiInfo && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-800">
              {aiInfo}
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Titel</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Beschreibung <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            {draft.questions.map((q, i) => (
              <QuestionEditor
                key={i}
                question={q}
                onChange={(nq) => updateQuestion(i, nq)}
                onDelete={() => deleteQuestion(i)}
              />
            ))}
            <button
              type="button"
              onClick={addQuestion}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
            >
              + Frage hinzufügen
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {publishing ? "Wird veröffentlicht …" : "Umfrage veröffentlichen"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Zurück
            </button>
          </div>
        </div>
      )}

      {savedSurveys.length > 0 && !draft && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Meine Umfragen (auf diesem Gerät)</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {savedSurveys.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{s.title}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(s.createdAt).toLocaleDateString("de-DE")}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={`/u/${s.id}/ergebnisse?token=${s.adminToken}`}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    Ergebnisse
                  </a>
                  <a
                    href={`/u/${s.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Umfrage
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      removeSurveyFromStorage(s.id);
                      setSavedSurveys(loadSavedSurveys());
                    }}
                    className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-red-600"
                    aria-label="Aus Liste entfernen"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
