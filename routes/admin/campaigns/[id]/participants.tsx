import { defineRoute } from "$fresh/server.ts";
import { makeApi, Participant } from "../../../../lib/api.ts";
import { Layout, PageHeader } from "../../../../components/Layout.tsx";
import { ErrorState } from "../../../../components/ErrorState.tsx";
import ParticipantsTable from "../../../../islands/ParticipantsTable.tsx";

export default defineRoute(async (req, ctx) => {
  const id = ctx.params.id;
  const api = makeApi(req.headers.get("cookie") ?? undefined);

  let participants: Participant[] = [];
  let error: unknown = null;

  try {
    participants = await api.participants.list(id);
    console.log(`[participants:${id.slice(0, 8)}] loaded ${participants.length}`);
  } catch (e) {
    error = e;
  }

  return (
    <Layout title="Teilnehmer" campaignId={id} activeTab="participants">
      <PageHeader title="Teilnehmer" />

      {error
        ? <ErrorState error={error} />
        : <ParticipantsTable campaignId={id} initial={participants} />}
    </Layout>
  );
});
