import { defineRoute } from "$fresh/server.ts";
import { Interview, makeApi } from "../../../../lib/api.ts";
import { Layout, PageHeader, StatusBadge } from "../../../../components/Layout.tsx";
import { ErrorState } from "../../../../components/ErrorState.tsx";

export default defineRoute(async (req, ctx) => {
  const id = ctx.params.id;
  const api = makeApi(req.headers.get("cookie") ?? undefined);
  let interviews: Interview[] = [];
  let error: unknown = null;

  try {
    interviews = await api.interviews.list(id);
    console.log(`[interviews:${id.slice(0, 8)}] loaded ${interviews.length}`);
  } catch (e) {
    error = e;
  }

  return (
    <Layout title="Interviews" campaignId={id} activeTab="interviews">
      <PageHeader title="Interviews" />

      {error && <div class="section"><ErrorState error={error} /></div>}

      {interviews.length === 0
        ? (
          <div class="card">
            <div class="empty-state">
              <p class="empty-state__title">Noch keine Interviews durchgeführt.</p>
              <p>Lade Teilnehmer ein, um zu starten.</p>
            </div>
          </div>
        )
        : (
          <div class="card card--flush">
            <table class="table">
              <thead>
                <tr>
                  <th>Anonyme ID</th>
                  <th>Abteilung</th>
                  <th>Modus</th>
                  <th>Status</th>
                  <th>Auswertung</th>
                  <th>Gestartet</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((i) => (
                  <tr key={i.id}>
                    <td><span class="mono text-secondary">{i.anon_id}</span></td>
                    <td>{i.department ?? "—"}</td>
                    <td class="text-secondary" style="text-transform: capitalize">
                      {i.mode}
                    </td>
                    <td><StatusBadge status={i.status} /></td>
                    <td>
                      {i.processing_status && i.status === "COMPLETED"
                        ? <StatusBadge status={i.processing_status} />
                        : "—"}
                    </td>
                    <td class="caption">
                      {i.started_at
                        ? new Date(i.started_at).toLocaleString("de-DE")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Layout>
  );
});
