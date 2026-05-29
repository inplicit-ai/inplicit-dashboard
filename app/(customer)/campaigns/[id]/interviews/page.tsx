import Link from "next/link";
import { ArrowRight, MessagesSquare } from "lucide-react";
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
      <PageHeader
        title="Interviews"
        meta={`${interviews.length} ${interviews.length === 1 ? "Gespräch" : "Gespräche"} in dieser Kampagne.`}
      />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {interviews.length === 0 ? (
        <div className="card card--flush">
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-fg-muted">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-fg">
                Noch keine Interviews durchgeführt.
              </p>
              <p className="text-sm text-fg-muted">
                Lade Teilnehmer ein, um zu starten.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="surface-bleed card card--flush">
          <div className="w-full overflow-x-auto">
            <table className="table min-w-[820px]">
              <thead>
                <tr>
                  <th>Anonyme ID</th>
                  <th>Abteilung</th>
                  <th>Modus</th>
                  <th>Status</th>
                  <th>Auswertung</th>
                  <th>Gestartet</th>
                  <th className="text-right" aria-label="" />
                </tr>
              </thead>
              <tbody>
                {interviews.map((i) => {
                  const href = `/campaigns/${id}/interviews/${i.id}`;
                  return (
                    <tr key={i.id} className="group">
                      <td>
                        <Link
                          href={href}
                          className="font-mono text-xs font-medium text-fg hover:text-accent"
                        >
                          {i.anon_id}
                        </Link>
                      </td>
                      <td className="text-fg-muted">{i.department ?? "—"}</td>
                      <td className="capitalize text-fg-muted">{i.mode}</td>
                      <td>
                        <StatusBadge status={i.status} />
                      </td>
                      <td>
                        {i.processing_status && i.status === "COMPLETED" ? (
                          <StatusBadge status={i.processing_status} />
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </td>
                      <td className="font-mono text-xs tabular-nums text-fg-muted">
                        {i.started_at
                          ? new Date(i.started_at).toLocaleString("de-DE")
                          : "—"}
                      </td>
                      <td className="text-right">
                        <Link
                          href={href}
                          aria-label={`Interview ${i.anon_id} öffnen`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-ui text-fg-subtle transition-colors group-hover:text-fg hover:bg-surface-2"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
