"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { QuestionEditDraft, Survey } from "@/lib/types";
import { mergeSurveysIntoStorage } from "@/lib/creatorStorage";
import { THEMES } from "@/lib/themes";
import { themeStyle } from "@/lib/themeStyle";
import { emptyQuestion, QuestionEditor } from "./SurveyCreator";

type EditDraft = {
  title: string;
  description: string;
  collectName: boolean;
  theme: Survey["theme"];
  allowMultipleResponses: boolean;
  questions: QuestionEditDraft[];
};

export default function SurveyEditor({ surveyId, token }: { surveyId: string; token: string }) {
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/surveys/${surveyId}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error ?? "Umfrage nicht gefunden.");
          return;
        }
        const survey = data.survey as Survey;
        setDraft({
          title: survey.title,
          description: survey.description,
          collectName: survey.collectName,
          theme: survey.theme,
          allowMultipleResponses: survey.allowMultipleResponses,
          questions: survey.questions
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((q) => ({
              id: q.id,
              type: q.type,
              text: q.text,
              options: q.options,
              required: q.required,
            })),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError("Verbindung fehlgeschlagen.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  function updateQuestion(index: number, q: QuestionEditDraft) {
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

  async function handleSave() {
    if (!draft) return;
    setSaveError(null);
    setSaved(false);

    if (!draft.title.trim()) {
      setSaveError("Bitte gib einen Titel für die Umfrage ein.");
      return;
    }
    if (draft.questions.length === 0) {
      setSaveError("Füge mindestens eine Frage hinzu.");
      return;
    }
    for (const q of draft.questions) {
      if (!q.text.trim()) {
        setSaveError("Alle Fragen brauchen einen Text.");
        return;
      }
      if ((q.type === "single" || q.type === "multiple") && (q.options ?? []).filter((o) => o.trim()).length < 2) {
        setSaveError(`Frage "${q.text}" braucht mindestens 2 Antwortoptionen.`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}?token=${encodeURIComponent(token)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      mergeSurveysIntoStorage([
        { id: surveyId, title: draft.title, adminToken: token, createdAt: new Date().toISOString() },
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-center text-slate-500">Umfrage wird geladen …</p>
      </div>
    );
  }

  if (loadError || !draft) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {loadError ?? "Umfrage nicht gefunden."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-12" style={themeStyle(draft.theme)}>
      <h1 className="text-xl font-bold text-slate-900">Umfrage bearbeiten</h1>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        Änderungen an einer Frage wirken sich nur auf neue Antworten aus. Wird eine Frage gelöscht, gehen
        die bisherigen Antworten zu dieser Frage verloren.
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={draft.collectName}
            onChange={(e) => setDraft({ ...draft, collectName: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            Namen der Teilnehmenden abfragen
            <span className="block text-xs text-slate-400">
              Falls aktiviert, wird beim Abstimmen nach dem Namen gefragt — die Angabe bleibt für
              Teilnehmende trotzdem freiwillig, die Umfrage bleibt anonym nutzbar.
            </span>
          </span>
        </label>
        <div>
          <span className="block text-sm font-medium text-slate-700">Antwortmodus</span>
          <p className="text-xs text-slate-400">Legt fest, wie oft eine Person antworten darf.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                !draft.allowMultipleResponses
                  ? "border-slate-800 bg-slate-50"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="responseMode"
                checked={!draft.allowMultipleResponses}
                onChange={() => setDraft({ ...draft, allowMultipleResponses: false })}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-700">Einmalige Umfrage</span>
                <span className="block text-xs text-slate-400">Jede Person kann nur einmal antworten.</span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                draft.allowMultipleResponses
                  ? "border-slate-800 bg-slate-50"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="responseMode"
                checked={draft.allowMultipleResponses}
                onChange={() => setDraft({ ...draft, allowMultipleResponses: true })}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-700">Fragerunde</span>
                <span className="block text-xs text-slate-400">
                  Eine Person kann mehrfach antworten (z. B. laufende Ideensammlung).
                </span>
              </span>
            </label>
          </div>
        </div>
        <div>
          <span className="block text-sm font-medium text-slate-700">Marke dieser Umfrage</span>
          <p className="text-xs text-slate-400">
            Legt Farbe und Logo fest, die Teilnehmende auf der Umfrage- und du auf der Ergebnisseite sehen.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.values(THEMES).map((t) => {
              const selected = draft.theme === t.id;
              const bgClass = t.headerBg === "dark" ? "bg-black" : "bg-white";
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, theme: t.id })}
                  className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 ${bgClass} ${
                    selected ? "border-slate-800" : "border-transparent hover:border-slate-300"
                  }`}
                  aria-label={t.label}
                  title={t.label}
                >
                  <Image
                    src={t.logo.src}
                    alt={t.logo.alt}
                    width={100}
                    height={28}
                    className={t.logo.className}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {draft.questions.map((q, i) => (
          <QuestionEditor
            key={q.id ?? `new-${i}`}
            question={q}
            onChange={(nq) => updateQuestion(i, nq)}
            onDelete={() => deleteQuestion(i)}
          />
        ))}
        <button
          type="button"
          onClick={addQuestion}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
        >
          + Frage hinzufügen
        </button>
      </div>

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      {saved && <p className="text-sm text-green-700">Gespeichert ✓</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {saving ? "Wird gespeichert …" : "Änderungen speichern"}
        </button>
        <a
          href={`/u/${surveyId}/ergebnisse?token=${encodeURIComponent(token)}`}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Zu den Ergebnissen
        </a>
      </div>
    </div>
  );
}
