"use client";

import { useEffect, useState } from "react";
import type { Question, QuestionResult, ResponseSummary, SurveyResults } from "@/lib/types";
import { themeStyle } from "@/lib/themeStyle";
import SurveyThemeBanner from "./SurveyThemeBanner";
import QrCode from "./QrCode";

function formatAnswerValue(value: string | string[] | number | undefined): string {
  if (value === undefined || value === null || value === "") return "–";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "–";
  return String(value);
}

function ResponseCard({ response, questions }: { response: ResponseSummary; questions: Question[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-slate-800">{response.voterName || "Anonym"}</span>
        <span className="text-xs text-slate-400">
          {new Date(response.createdAt).toLocaleString("de-DE")}
        </span>
      </div>
      <dl className="mt-2 space-y-1.5">
        {questions.map((q) => (
          <div key={q.id} className="text-sm">
            <dt className="text-slate-500">{q.text}</dt>
            <dd className="text-slate-800">{formatAnswerValue(response.answers[q.id])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Bar({
  label,
  count,
  total,
  color = "bg-[var(--accent)]",
}: {
  label: string;
  count: number;
  total: number;
  color?: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500">
          {count} ({pct}%)
        </span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuestionResultCard({ result }: { result: QuestionResult }) {
  const { question } = result;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-slate-900">{question.text}</h3>
        <span className="shrink-0 text-xs text-slate-400">{result.totalAnswers} Antworten</span>
      </div>

      {result.optionCounts && (
        <div className="mt-4 space-y-3">
          {Object.entries(result.optionCounts).map(([option, count]) => (
            <Bar key={option} label={option} count={count} total={Math.max(1, result.totalAnswers)} />
          ))}
        </div>
      )}

      {result.ratingDistribution && (
        <div className="mt-4 space-y-3">
          <div className="text-2xl font-bold text-[var(--accent)]">
            {(result.ratingAverage ?? 0).toFixed(2)}{" "}
            <span className="text-sm font-normal text-slate-400">/ 5 Durchschnitt</span>
          </div>
          {[5, 4, 3, 2, 1].map((n) => (
            <Bar
              key={n}
              label={`${n} Sterne`}
              count={result.ratingDistribution![n] ?? 0}
              total={result.totalAnswers}
              color="bg-amber-500"
            />
          ))}
        </div>
      )}

      {result.textAnswers && (
        <div className="mt-4 space-y-2">
          {result.textAnswers.length === 0 && (
            <p className="text-sm text-slate-400">Noch keine Antworten.</p>
          )}
          {result.textAnswers.map((answer, i) => (
            <p key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {answer}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultsView({ surveyId, token }: { surveyId: string; token: string }) {
  const [data, setData] = useState<SurveyResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedResultsLink, setCopiedResultsLink] = useState(false);

  function copyResultsLink() {
    navigator.clipboard.writeText(resultsLink).then(() => {
      setCopiedResultsLink(true);
      setTimeout(() => setCopiedResultsLink(false), 2000);
    });
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/surveys/${surveyId}/results?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Zugriff nicht möglich.");
          return;
        }
        setData(json as SurveyResults);
      })
      .catch(() => {
        if (!cancelled) setError("Verbindung fehlgeschlagen.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [surveyId, token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-center text-slate-500">Ergebnisse werden geladen …</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error ?? "Ergebnisse nicht verfügbar."}
        </div>
      </div>
    );
  }

  const voteLink =
    typeof window !== "undefined" ? `${window.location.origin}/u/${surveyId}` : `/u/${surveyId}`;
  const resultsLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/u/${surveyId}/ergebnisse?token=${encodeURIComponent(token)}`
      : `/u/${surveyId}/ergebnisse?token=${encodeURIComponent(token)}`;

  return (
    <>
    <SurveyThemeBanner theme={data.survey.theme} showBackLink />
    <div className="mx-auto max-w-3xl px-4 py-12" style={themeStyle(data.survey.theme)}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{data.survey.title}</h1>
          {data.survey.description && <p className="mt-1 text-slate-600">{data.survey.description}</p>}
          <p className="mt-2 text-sm text-slate-500">
            {data.totalResponses} Teilnehmer:in{data.totalResponses === 1 ? "" : "nen"} insgesamt
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={`/api/surveys/${surveyId}/export/xlsx?token=${encodeURIComponent(token)}`}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Excel herunterladen
          </a>
          <a
            href={`/api/surveys/${surveyId}/export/pdf?token=${encodeURIComponent(token)}`}
            className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            PDF herunterladen
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          Umfrage-Link zum Teilen:{" "}
          <a href={voteLink} className="text-[var(--accent)] hover:underline">
            {voteLink}
          </a>
        </div>
        <QrCode
          value={voteLink}
          title={data.survey.title}
          size={120}
          filename={`umfrage-qr-${surveyId}.png`}
        />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="break-all">
            Ergebnis-Link (privat, nicht teilen!): {resultsLink}
          </span>
          <button
            type="button"
            onClick={copyResultsLink}
            className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            {copiedResultsLink ? "Kopiert!" : "Kopieren"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {data.questionResults.map((qr) => (
          <QuestionResultCard key={qr.question.id} result={qr} />
        ))}
      </div>

      {data.responses && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Antworten nach Person</h2>
          <div className="space-y-3">
            {data.responses.length === 0 && (
              <p className="text-sm text-slate-400">Noch keine Antworten.</p>
            )}
            {data.responses.map((r) => (
              <ResponseCard key={r.id} response={r} questions={data.survey.questions} />
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
    </>
  );
}
