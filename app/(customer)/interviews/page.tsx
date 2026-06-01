import { getTranslations } from "next-intl/server";
import { Inbox } from "lucide-react";
import { makeApi, type OrgInterviewRow, type OrgStats } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { StatBand } from "@/components/ui/stat-band";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

function fmtDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// O-8: cross-campaign Interviews surface (doc 06 §3). PII-stripped — anon_id only.
export default async function OrgInterviewsPage() {
  const t = await getTranslations("orgInterviews");
  const api = makeApi(await requestCookie());

  let rows: OrgInterviewRow[] = [];
  let stats: OrgStats | null = null;
  let error: unknown = null;
  try {
    [rows, stats] = await Promise.all([api.org.interviews(), api.org.stats()]);
  } catch (e) {
    error = e;
  }

  const columns: DataTableColumn<OrgInterviewRow>[] = [
    {
      key: "anon",
      header: t("colAnon"),
      mono: true,
      cell: (i) => i.anon_id,
    },
    {
      key: "campaign",
      header: t("colCampaign"),
      cell: (i) => <span className="font-medium text-fg">{i.campaign_label}</span>,
    },
    {
      key: "status",
      header: t("colStatus"),
      cell: (i) => <StatusBadge status={i.status} label={t(`status.${i.status}` as never, { defaultValue: i.status })} withIcon />,
    },
    {
      key: "language",
      header: t("colLanguage"),
      cell: (i) => (i.language ?? "—").toUpperCase(),
    },
    {
      key: "duration",
      header: t("colDuration"),
      numeric: true,
      cell: (i) => fmtDuration(i.duration_seconds),
    },
    {
      key: "date",
      header: t("colDate"),
      numeric: true,
      cell: (i) =>
        i.created_at ? new Date(i.created_at).toLocaleDateString() : "—",
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("count", { count: rows.length })} />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {stats && (
        <div className="mb-8">
          <StatBand
            cells={[
              { label: t("statCampaigns"), value: stats.campaigns },
              { label: t("statTotal"), value: stats.interviews_total },
              { label: t("statCompleted"), value: stats.interviews_completed },
              { label: t("statInsights"), value: stats.insights },
              { label: t("statHypotheses"), value: stats.hypotheses },
            ]}
          />
        </div>
      )}

      {rows.length === 0 && !error ? (
        <EmptyState icon={Inbox} title={t("emptyTitle")} hint={t("emptyBody")} />
      ) : (
        rows.length > 0 && (
          <Card variant="ledger" className="overflow-hidden">
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(i) => i.id}
              rowHref={(i) =>
                `/campaigns/${i.campaign_id}/interviews/${i.id}`
              }
            />
          </Card>
        )
      )}
    </>
  );
}
