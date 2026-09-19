import ResultsView from "@/components/ResultsView";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
            Es fehlt ein gültiger Zugriffs-Link. Bitte verwende den privaten Ergebnis-Link, den du beim
            Veröffentlichen der Umfrage erhalten hast.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <ResultsView surveyId={id} token={token} />
    </main>
  );
}
