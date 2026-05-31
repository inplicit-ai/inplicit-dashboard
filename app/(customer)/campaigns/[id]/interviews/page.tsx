import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { makeApi, type Interview } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/PageChrome";
import { SpecStrip } from "@/components/ui/spec-strip";
import { StatusDisc, toStatusState } from "@/components/ui/status-disc";

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

  const completed = interviews.filter((i) => i.status === "COMPLETED").length;
  const running = interviews.filter((i) => i.status === "IN_PROGRESS").length;

  return (
    <div className="surface-bleed">
      <header className="masthead mb-8">
        <div className="masthead__metric">
          <span className="flex items-baseline gap-3">
            <span className="masthead__num" aria-hidden>
              §
            </span>
            <h1 className="masthead__title">Interviews</h1>
          </span>
          <span className="flex flex-col items-end">
            <span className="masthead__metric-value">{interviews.length}</span>
            <span className="masthead__metric-label">
              {interviews.length === 1 ? "Gespräch" : "Gespräche"}
            </span>
          </span>
        </div>
        <p className="masthead__dek">
          {`${interviews.length} ${interviews.length === 1 ? "Gespräch" : "Gespräche"} in dieser Kampagne.`}
        </p>
      </header>

      {error ? (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      ) : null}

      <SpecStrip
        cells={[
          { label: "Gesamt", value: interviews.length },
          { label: "Abgeschlossen", value: completed },
          { label: "Läuft", value: running },
        ]}
      />

      <div className="mt-8">
        {interviews.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-strong bg-surface/40 px-6 py-14">
            <p className="text-center font-mono text-[length:var(--text-caps)] uppercase tracking-[0.06em] text-fg-subtle">
              KEINE INTERVIEWS AUF DER PLATTE — lade Teilnehmer ein, um zu
              starten.
            </p>
          </div>
        ) : (
          <>
            <header className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                § GESPRÄCHE
              </span>
              <span className="font-mono text-xs tabular-nums text-fg-muted">
                n={interviews.length}
              </span>
            </header>
            <div className="w-full overflow-x-auto">
              <table className="register min-w-[820px]">
                <thead>
                  <tr>
                    <th className="w-[28px]" aria-label="Status" />
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
                    const state = toStatusState(i.status);
                    return (
                      <tr key={i.id} className="group">
                        <td>
                          <StatusDisc
                            state={state}
                            pulse={state === "live"}
                            size="sm"
                          />
                        </td>
                        <td>
                          <Link
                            href={href}
                            className="register__id text-xs font-medium text-fg hover:text-accent"
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
                        <td className="register__id text-xs text-fg-muted">
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
          </>
        )}
      </div>
    </div>
  );
}
