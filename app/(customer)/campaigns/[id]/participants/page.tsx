import { makeApi, type Participant } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
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
    <div className="surface-bleed">
      <header className="masthead mb-8">
        <div className="masthead__metric">
          <span className="flex items-baseline gap-3">
            <span className="masthead__num" aria-hidden>
              §
            </span>
            <h1 className="masthead__title">Teilnehmer</h1>
          </span>
          <span className="flex flex-col items-end">
            <span className="masthead__metric-value">{participants.length}</span>
            <span className="masthead__metric-label">Roster</span>
          </span>
        </div>
        <p className="masthead__dek">
          Der Roster dieser Kampagne — Einladungs- und Interview-Status auf der
          Status-Spine. Anonyme IDs sind GDPR-konform; E-Mails verlassen den
          Roster nicht.
        </p>
      </header>

      {error ? (
        <ErrorState error={error} />
      ) : (
        <ParticipantsTable campaignId={id} initial={participants} />
      )}
    </div>
  );
}
