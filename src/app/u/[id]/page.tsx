import VoteForm from "@/components/VoteForm";

export default async function VotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex-1">
      <VoteForm surveyId={id} />
    </main>
  );
}
