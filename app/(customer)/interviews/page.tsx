import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { makeApi, type OrgInterviewRow, type OrgStats } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge } from "@/components/PageChrome";
import { StatsCard, StatsRow } from "@/components/StatsCard";

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

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        meta={t("count", { count: rows.length })}
      />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {stats && (
        <StatsRow>
          <StatsCard label={t("statCampaigns")} value={stats.campaigns} />
          <StatsCard label={t("statTotal")} value={stats.interviews_total} />
          <StatsCard
            label={t("statCompleted")}
            value={stats.interviews_completed}
          />
          <StatsCard label={t("statInsights")} value={stats.insights} />
          <StatsCard label={t("statHypotheses")} value={stats.hypotheses} />
        </StatsRow>
      )}

      {rows.length === 0 && !error ? (
        <div className="card card--flush">
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-fg-muted">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="subtitle text-fg">
                {t("emptyTitle")}
              </p>
              <p className="body-sm text-fg-muted">{t("emptyBody")}</p>
            </div>
          </div>
        </div>
      ) : (
        rows.length > 0 && (
          <div className="surface-bleed card card--flush">
            <div className="w-full overflow-x-auto">
              <table className="table min-w-[820px]">
                <thead>
                  <tr>
                    <th>{t("colCampaign")}</th>
                    <th>{t("colAnon")}</th>
                    <th>{t("colStatus")}</th>
                    <th>{t("colDuration")}</th>
                    <th>{t("colLanguage")}</th>
                    <th>{t("colDate")}</th>
                    <th className="text-right" aria-label="" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => {
                    const href = `/campaigns/${i.campaign_id}/interviews/${i.id}`;
                    return (
                      <tr key={i.id} className="group">
                        <td className="font-medium text-fg">
                          <Link
                            href={`/campaigns/${i.campaign_id}`}
                            className="hover:text-accent"
                          >
                            {i.campaign_label}
                          </Link>
                        </td>
                        <td>
                          <Link
                            href={href}
                            className="font-mono text-caption font-medium text-fg hover:text-accent"
                          >
                            {i.anon_id}
                          </Link>
                        </td>
                        <td>
                          <StatusBadge status={i.status} />
                        </td>
                        <td className="font-mono text-fg-muted tabular-nums">
                          {fmtDuration(i.duration_seconds)}
                        </td>
                        <td className="font-mono uppercase tabular-nums text-fg-muted">
                          {i.language ?? "—"}
                        </td>
                        <td className="font-mono text-caption tabular-nums text-fg-muted">
                          {i.created_at
                            ? new Date(i.created_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="text-right">
                          <Link
                            href={href}
                            aria-label={t("open", { anon: i.anon_id })}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle transition-colors group-hover:text-fg hover:bg-surface-2"
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
        )
      )}
    </>
  );
}
