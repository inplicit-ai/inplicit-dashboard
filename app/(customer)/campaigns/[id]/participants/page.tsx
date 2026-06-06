import { makeApi, type Participant } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { ParticipantsTable } from "@/components/ParticipantsTable";
import { PageHeader } from "@/components/ui/page-header";

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
    <div className="surface-bleed">
      {/* WHY-95: subtitle removed to declutter the tab. */}
      <PageHeader title="Teilnehmer" />

      {error ? (
        <ErrorState error={error} />
      ) : (
        <ParticipantsTable campaignId={id} initial={participants} />
      )}
    </div>
  );
}
