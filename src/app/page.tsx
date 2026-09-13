import SurveyCreator from "@/components/SurveyCreator";

export default function Home() {
  return (
    <main className="flex-1 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Umfragen erstellen — mit KI
        </h1>
        <p className="mt-3 text-slate-600">
          Beschreibe, was du wissen willst. Die KI macht daraus eine Umfrage, die du per Link teilst.
          Teilnahme ist anonym — Ergebnisse siehst nur du, als Diagramm und zum Download als Excel oder PDF.
        </p>
      </div>
      <div className="mt-10">
        <SurveyCreator />
      </div>
    </main>
  );
}
