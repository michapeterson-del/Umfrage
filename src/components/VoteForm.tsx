"use client";

import { useEffect, useState } from "react";
import type { AnswerInput, Question, Survey } from "@/lib/types";

type AnswerValue = string | string[] | number | undefined;

export default function VoteForm({ surveyId }: { surveyId: string }) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
        setSurvey(data.survey as Survey);
        setAlreadyVoted(!!data.voted);
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

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleMultiple(questionId: string, option: string) {
    const current = (answers[questionId] as string[] | undefined) ?? [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setAnswer(questionId, next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey) return;
    setSubmitError(null);

    for (const q of survey.questions) {
      if (!q.required) continue;
      const value = answers[q.id];
      const empty =
        value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
      if (empty) {
        setSubmitError(`Bitte beantworte: "${q.text}"`);
        return;
      }
    }

    const payload: AnswerInput[] = survey.questions
      .filter((q) => answers[q.id] !== undefined && answers[q.id] !== "")
      .map((q) => ({ questionId: q.id, value: answers[q.id]! as AnswerInput["value"] }));

    setSubmitting(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload, name: survey.collectName ? name : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Absenden fehlgeschlagen.");
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-center text-slate-500">Umfrage wird geladen …</p>;
  }

  if (loadError || !survey) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {loadError ?? "Umfrage nicht gefunden."}
      </div>
    );
  }

  if (submitted || alreadyVoted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-green-900">
          {submitted ? "Danke für deine Teilnahme! 🎉" : "Du hast bereits teilgenommen"}
        </h2>
        <p className="mt-2 text-sm text-green-800">
          Deine Antwort wurde anonym gespeichert.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{survey.title}</h1>
        {survey.description && <p className="mt-2 text-slate-600">{survey.description}</p>}
        <p className="mt-2 text-xs text-slate-400">Diese Umfrage ist anonym.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {survey.collectName && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label htmlFor="voter-name" className="text-sm font-medium text-slate-800">
              Name <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="voter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}
        {survey.questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(v) => setAnswer(q.id, v)}
            onToggleMultiple={(opt) => toggleMultiple(q.id, opt)}
          />
        ))}

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {submitting ? "Wird gesendet …" : "Absenden"}
        </button>
      </form>
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
  onToggleMultiple,
}: {
  question: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  onToggleMultiple: (option: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-slate-800">
        {question.text}
        {question.required && <span className="ml-1 text-red-500">*</span>}
      </div>

      {question.type === "single" && (
        <div className="mt-3 space-y-2">
          {(question.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name={question.id}
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {question.type === "multiple" && (
        <div className="mt-3 space-y-2">
          {(question.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={((value as string[] | undefined) ?? []).includes(opt)}
                onChange={() => onToggleMultiple(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {question.type === "rating" && (
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`h-10 w-10 rounded-full border text-sm font-semibold ${
                value === n
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-slate-300 text-slate-600 hover:border-[var(--accent)]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {question.type === "text" && (
        <textarea
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
