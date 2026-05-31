import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { makeApi, type OrgInterviewRow, type OrgStats } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { Folio } from "@/components/ui/folio";
import { InstrumentBand } from "@/components/ui/instrument-band";
import { Ledger } from "@/components/ui/ledger";
import { LedgerRow } from "@/components/ui/ledger-row";
import { DataChip } from "@/components/ui/data-chip";
import { SpecBlock } from "@/components/ui/spec-block";
import { StatusDisc, toStatusState } from "@/components/ui/status-disc";

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
      <Folio index="§" label={t("title")} count={rows.length} />

      {error && (
        <div className="mt-6">
          <ErrorState error={error} />
        </div>
      )}

      {stats && (
        <div className="mt-6">
          <InstrumentBand
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
        <div className="mt-8 max-w-[68ch] overflow-hidden rounded-card border border-dashed border-line-strong bg-surface">
          <div className="flex flex-col gap-4 px-8 py-12">
            <span className="flex items-center gap-2.5">
              <StatusDisc state="idle" />
              <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                {t("emptyTitle")}
              </span>
            </span>
            <p className="body-lg max-w-[52ch] text-fg-muted">{t("emptyBody")}</p>
          </div>
        </div>
      ) : (
        rows.length > 0 && (
          <Ledger framed className="mt-8">
            {rows.map((i) => {
              const href = `/campaigns/${i.campaign_id}/interviews/${i.id}`;
              return (
                <LedgerRow
                  key={i.id}
                  status={toStatusState(i.status)}
                  index={i.anon_id}
                  title={i.campaign_label}
                  expandable
                  metric={
                    <span className="font-mono tabular-nums text-fg-muted">
                      {fmtDuration(i.duration_seconds)}
                    </span>
                  }
                >
                  <div className="flex flex-col gap-3 py-1">
                    <div className="cluster">
                      <DataChip tone="neutral">{i.status}</DataChip>
                      <DataChip mono>{(i.language ?? "—").toUpperCase()}</DataChip>
                      <DataChip mono>{fmtDuration(i.duration_seconds)}</DataChip>
                    </div>
                    <SpecBlock
                      rows={[
                        { label: t("colAnon"), value: i.anon_id },
                        { label: t("colStatus"), value: i.status },
                        {
                          label: t("colDuration"),
                          value: fmtDuration(i.duration_seconds),
                        },
                        {
                          label: t("colLanguage"),
                          value: (i.language ?? "—").toUpperCase(),
                        },
                        {
                          label: t("colDate"),
                          value: i.created_at
                            ? new Date(i.created_at).toLocaleString()
                            : "—",
                        },
                      ]}
                    />
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <Link
                        href={href}
                        aria-label={t("open", { anon: i.anon_id })}
                        className="inline-flex items-center gap-1.5 text-meta text-accent-strong hover:underline"
                      >
                        {t("colAnon")} {i.anon_id}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href={`/campaigns/${i.campaign_id}`}
                        className="inline-flex items-center gap-1.5 text-meta text-fg-muted hover:text-fg"
                      >
                        {i.campaign_label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </LedgerRow>
              );
            })}
          </Ledger>
        )
      )}
    </>
  );
}
