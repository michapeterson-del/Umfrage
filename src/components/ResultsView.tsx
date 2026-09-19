"use client";

import { useEffect, useState } from "react";
import type { QuestionResult, SurveyResults } from "@/lib/types";

function Bar({ label, count, total, color = "bg-green-600" }: { label: string; count: number; total: number; color?: string }) {
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
          <div className="text-2xl font-bold text-green-700">
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

  if (loading) return <p className="text-center text-slate-500">Ergebnisse werden geladen …</p>;

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error ?? "Ergebnisse nicht verfügbar."}
      </div>
    );
  }

  const voteLink =
    typeof window !== "undefined" ? `${window.location.origin}/u/${surveyId}` : `/u/${surveyId}`;

  return (
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

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
        Umfrage-Link zum Teilen:{" "}
        <a href={voteLink} className="text-green-600 hover:underline">
          {voteLink}
        </a>
      </div>

      <div className="space-y-4">
        {data.questionResults.map((qr) => (
          <QuestionResultCard key={qr.question.id} result={qr} />
        ))}
      </div>
    </div>
  );
}
