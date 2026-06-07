import { Inbox } from "lucide-react";
import { makeApi, type Interview } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/PageChrome";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatBand } from "@/components/ui/stat-band";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

  const columns: DataTableColumn<Interview>[] = [
    {
      key: "disc",
      header: "",
      headClassName: "w-[28px]",
      cell: (i) => {
        const state = toStatusState(i.status);
        return <StatusDisc state={state} pulse={state === "live"} size="sm" />;
      },
    },
    {
      key: "anon",
      header: "Anonyme ID",
      mono: true,
      cell: (i) => <span className="font-medium text-fg">{i.anon_id}</span>,
    },
    // WHY-95: Abteilung & Rolle hidden in the Interviews tab for anonymity.
    {
      key: "mode",
      header: "Modus",
      cell: (i) => <span className="capitalize text-fg-muted">{i.mode}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (i) => <StatusBadge status={i.status} />,
    },
    {
      key: "processing",
      header: "Auswertung",
      cell: (i) =>
        i.processing_status && i.status === "COMPLETED" ? (
          <StatusBadge status={i.processing_status} />
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: "started",
      header: "Gestartet",
      numeric: true,
      cell: (i) => (
        <span className="text-fg-muted">
          {i.started_at
            ? new Date(i.started_at).toLocaleString("de-DE")
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="surface-bleed">
      {/* WHY-95: subtitle removed to declutter the tab. */}
      <PageHeader title="Interviews" />

      {error ? (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      ) : null}

      <StatBand
        className="mb-8"
        cells={[
          { label: "Gesamt", value: interviews.length },
          { label: "Abgeschlossen", value: completed },
          { label: "Läuft", value: running },
        ]}
      />

      {interviews.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Noch keine Interviews"
          hint="Lade Teilnehmer ein, um zu starten."
        />
      ) : (
        <>
          <SectionHeading title="Gespräche" count={interviews.length} />
          <Card variant="ledger" className="overflow-hidden">
            <div className="w-full overflow-x-auto">
              <DataTable
                className="min-w-[820px]"
                columns={columns}
                rows={interviews}
                rowKey={(i) => i.id}
                rowHref={(i) => `/campaigns/${id}/interviews/${i.id}`}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
