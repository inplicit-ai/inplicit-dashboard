import { makeApi, type Participant } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageChrome";
import { ParticipantsTable } from "@/components/ParticipantsTable";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = makeApi(await requestCookie());
  let participants: Participant[] = [];
  let error: unknown = null;
  try {
    participants = await api.participants.list(id);
  } catch (e) {
    error = e;
  }

  return (
    <>
      <PageHeader title="Teilnehmer" />
      {error ? (
        <ErrorState error={error} />
      ) : (
        <div className="surface-bleed">
          <ParticipantsTable campaignId={id} initial={participants} />
        </div>
      )}
    </>
  );
}
