import VoteForm from "@/components/VoteForm";

export default async function VotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <VoteForm surveyId={id} />
      </div>
    </main>
  );
}
