import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  CheckCircle2,
  AlertCircle,
  Users,
  CheckCheck,
  Lightbulb,
  FlaskConical,
  Gauge,
} from "lucide-react";
import {
  makeApi,
  type Campaign,
  type CampaignStats,
  type LaunchResult,
} from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/PageChrome";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { MetricCard } from "@/components/ui/metric-card";
import { Card } from "@/components/ui/card";
import { EvidenceTree, type EvidenceNode } from "@/components/ui/agent-list";
import { StatusDisc } from "@/components/ui/status-disc";
import { RefineButton } from "@/components/campaign-chat/RefineButton";
import { cn } from "@/lib/utils";

interface CampaignPageSearchParams {
  flash?: string;
  flashType?: "success" | "error";
}

export default async function CampaignOverview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<CampaignPageSearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const api = makeApi(await requestCookie());

  let campaign: Campaign | null = null;
  let stats: CampaignStats | null = null;
  let error: unknown = null;
  try {
    [campaign, stats] = await Promise.all([
      api.campaigns.get(id),
      api.stats(id),
    ]);
  } catch (e) {
    error = e;
  }

  async function launchCampaign() {
    "use server";
    const api = makeApi(await requestCookie());
    let result: LaunchResult | null = null;
    let flashType: "success" | "error" = "success";
    let flash = "";
    try {
      result = await api.campaigns.launch(id);
    } catch (e) {
      flashType = "error";
      flash = e instanceof Error ? e.message : "Launch fehlgeschlagen";
    }
    if (result) {
      const { sent, skipped, failed, errors } = result;
      if (sent + skipped > 0 && failed === 0) {
        flash =
          sent > 0
            ? `${sent} Einladung${sent === 1 ? "" : "en"} verschickt.`
            : `${skipped} Link${skipped === 1 ? "" : "s"} geloggt (Resend nicht konfiguriert).`;
      } else if (sent + skipped === 0 && failed === 0) {
        flash = result.message ?? "Bereits versendet.";
      } else {
        flashType = "error";
        flash =
          errors && errors.length > 0
            ? errors[0]
            : `Gesendet: ${sent}, übersprungen: ${skipped}, fehlgeschlagen: ${failed}`;
      }
    }
    revalidatePath(`/campaigns/${id}`);
    const params = new URLSearchParams({ flash, flashType });
    const { redirect } = await import("next/navigation");
    redirect(`/campaigns/${id}?${params.toString()}`);
  }

  if (error || !campaign) {
    return <ErrorState error={error ?? new Error("Kampagne nicht gefunden.")} />;
  }

  const completionRate =
    stats && stats.participants > 0
      ? Math.round((stats.interviews_completed / stats.participants) * 100)
      : 0;

  const inProgress = stats?.interviews_in_progress ?? 0;
  const isLive = inProgress > 0;
  const isDraft = campaign.status === "DRAFT";
  const launchLabel = isDraft
    ? "Kampagne starten — alle einladen"
    : "Ausstehende Einladungen versenden";

  // The synthesis pipeline as a vertical agent-plan ledger. The running stage
  // carries the lone amber pulse; everything before it is done, after pending.
  const pipeline = buildPipeline({
    completed: stats?.interviews_completed ?? 0,
    insights: stats?.insights ?? 0,
    hypotheses: stats?.hypotheses ?? 0,
    live: isLive,
  });

  const created = new Date(campaign.created_at).toLocaleDateString("de-DE");

  return (
    <div>
      <PageHeader
        title={campaign.org_name}
        subtitle={`${campaign.language.toUpperCase()} · ${campaign.interview_length_min} min · erstellt ${created}`}
        actions={
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[length:var(--text-caption)] font-medium text-accent">
                <StatusDisc state="live" size="sm" pulse />
                Live
              </span>
            )}
            <StatusBadge status={campaign.status} />
            <RefineButton campaignId={id} />
          </div>
        }
      />

      <div className="space-y-8">
        {sp.flash && (
          <FlashBanner
            type={sp.flashType === "error" ? "err" : "ok"}
            message={sp.flash}
          />
        )}

        {/* Metric grid — the white-modernist readout, deep-linking branches. */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <MetricCard
            label="Teilnehmer"
            value={stats?.participants ?? 0}
            icon={Users}
            href={`/campaigns/${id}/participants`}
          />
          <MetricCard
            label="Abgeschlossen"
            value={stats?.interviews_completed ?? 0}
            icon={CheckCheck}
            trend={{ dir: "up", value: `${completionRate}%` }}
            href={`/campaigns/${id}/interviews`}
          />
          <MetricCard
            label="Insights"
            value={stats?.insights ?? 0}
            icon={Lightbulb}
            href={`/campaigns/${id}/insights`}
          />
          <MetricCard
            label="Hypothesen"
            value={stats?.hypotheses ?? 0}
            icon={FlaskConical}
            href={`/campaigns/${id}/hypotheses`}
          />
          <MetricCard label="Abdeckung" value={`${completionRate}%`} icon={Gauge} />
        </div>

        {/* Synthesis pipeline — agent-plan ledger. */}
        <section>
          <SectionHeading
            title="Synthese-Pipeline"
            count={pipeline.filter((p) => p.status === "done").length}
          />
          <Card variant="ledger" className="px-5 py-4">
            <EvidenceTree nodes={pipeline} defaultExpandedDepth={0} />
          </Card>
        </section>

        {/* Activation — the one primary action. */}
        <Card className="p-6">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-[52ch] space-y-2">
              <h2 className="text-[length:var(--text-title)] font-semibold tracking-[-0.015em] text-fg">
                Teilnehmer aktivieren
              </h2>
              <p className="text-[length:var(--text-body)] leading-relaxed text-fg-muted">
                Bulk-Versand an alle, die noch nicht eingeladen wurden. Bereits
                versendete werden übersprungen.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <form action={launchCampaign}>
                <Button type="submit">{launchLabel}</Button>
              </form>
              <Button
                asChild
                variant="link"
                size="sm"
                className="px-0 text-fg-muted"
              >
                <Link href={`/campaigns/${id}/participants`}>
                  Einzeln verwalten
                </Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* Company context — reading register. */}
        <section>
          <SectionHeading title="Unternehmenskontext" />
          <Card variant="reading" className="px-6">
            <p className="whitespace-pre-wrap text-[length:var(--text-body-lg)] leading-relaxed text-fg-muted">
              {campaign.company_context}
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}

/**
 * Map the coarse campaign signals onto the four-stage synthesis pipeline,
 * carrying the lone amber pulse on the first stage that is still working.
 */
function buildPipeline(input: {
  completed: number;
  insights: number;
  hypotheses: number;
  live: boolean;
}): EvidenceNode[] {
  const { completed, insights, hypotheses, live } = input;

  const extractDone = insights > 0;
  const clusterDone = insights > 0;
  const hypoDone = hypotheses > 0;

  const frontier = live
    ? completed === 0
      ? "ingest"
      : !extractDone
        ? "extract"
        : !hypoDone
          ? "hypothesis"
          : "falsify"
    : null;

  function state(
    key: string,
    done: boolean,
  ): { status: EvidenceNode["status"]; pulse?: boolean; active?: boolean } {
    if (frontier === key) return { status: "live", pulse: true, active: true };
    if (done) return { status: "done" };
    return { status: "pending" };
  }

  const ingest = state("ingest", completed > 0);
  const extract = state("extract", extractDone);
  const cluster = state("cluster", clusterDone);
  const hypothesis = state("hypothesis", hypoDone);

  return [
    {
      id: "ingest",
      kind: "step",
      status: ingest.status,
      pulse: ingest.pulse,
      activeConnector: ingest.active,
      label: "Interviews aufnehmen",
      meta: <span className="tabular-nums">{completed} Interviews</span>,
    },
    {
      id: "extract",
      kind: "step",
      status: extract.status,
      pulse: extract.pulse,
      activeConnector: extract.active,
      label: "VSE-Extraktion · Mistral",
      meta: <span className="tabular-nums">{insights} Insights</span>,
    },
    {
      id: "cluster",
      kind: "step",
      status: cluster.status,
      pulse: cluster.pulse,
      activeConnector: cluster.active,
      label: "Embedding · Clustering · Qdrant",
      meta: <span className="tabular-nums">cos&gt;0.82</span>,
    },
    {
      id: "hypothesis",
      kind: "step",
      status: hypothesis.status,
      pulse: hypothesis.pulse,
      activeConnector: hypothesis.active,
      label: "Hypothesen · Falsifikation",
      meta: <span className="tabular-nums">{hypotheses} Hypothesen</span>,
    },
  ];
}

function FlashBanner({
  type,
  message,
}: {
  type: "ok" | "err";
  message: string;
}) {
  const Icon = type === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-ui border px-4 py-3 text-sm",
        type === "ok"
          ? "border-success/22 bg-success-soft text-success"
          : "border-pain-muted bg-pain-soft text-pain",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-snug">{message}</p>
    </div>
  );
}
