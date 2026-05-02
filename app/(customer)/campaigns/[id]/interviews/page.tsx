import Link from "next/link";
import { makeApi, type Interview } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge } from "@/components/PageChrome";

export default async function InterviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = makeApi(await requestCookie());
  let interviews: Interview[] = [];
  let error: unknown = null;
  try {
    interviews = await api.interviews.list(id);
  } catch (e) {
    error = e;
  }

  return (
    <>
      <PageHeader title="Interviews" />
      {error && (
        <div className="section">
          <ErrorState error={error} />
        </div>
      )}

      {interviews.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">Noch keine Interviews durchgeführt.</p>
            <p>Lade Teilnehmer ein, um zu starten.</p>
          </div>
        </div>
      ) : (
        <div className="card card--flush">
          <table className="table">
            <thead>
              <tr>
                <th>Anonyme ID</th>
                <th>Abteilung</th>
                <th>Modus</th>
                <th>Status</th>
                <th>Auswertung</th>
                <th>Gestartet</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((i) => {
                const href = `/campaigns/${id}/interviews/${i.id}`;
                return (
                  <tr key={i.id}>
                    <td>
                      <Link href={href} className="mono row-link">
                        {i.anon_id}
                      </Link>
                    </td>
                    <td>{i.department ?? "—"}</td>
                    <td className="text-secondary" style={{ textTransform: "capitalize" }}>
                      {i.mode}
                    </td>
                    <td>
                      <StatusBadge status={i.status} />
                    </td>
                    <td>
                      {i.processing_status && i.status === "COMPLETED" ? (
                        <StatusBadge status={i.processing_status} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="caption">
                      {i.started_at ? new Date(i.started_at).toLocaleString("de-DE") : "—"}
                    </td>
                    <td className="text-right">
                      <Link href={href} className="row-link" aria-label="Details">
                        →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
