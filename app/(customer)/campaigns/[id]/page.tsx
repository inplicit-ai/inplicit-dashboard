import Link from "next/link";
import { revalidatePath } from "next/cache";
import { CheckCircle2, AlertCircle } from "lucide-react";
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
import { SpecStrip, type SpecCell } from "@/components/ui/spec-strip";
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

  // Instrument band — five readouts deep-linking into their branches.
  const cells: SpecCell[] = [
    {
      label: "Teilnehmer",
      value: stats?.participants ?? 0,
      href: `/campaigns/${id}/participants`,
    },
    {
      label: "Abgeschlossen",
      value: stats?.interviews_completed ?? 0,
      delta: { dir: "up", value: `${completionRate}%` },
      href: `/campaigns/${id}/interviews`,
    },
    {
      label: "Insights",
      value: stats?.insights ?? 0,
      href: `/campaigns/${id}/insights`,
    },
    {
      label: "Hypothesen",
      value: stats?.hypotheses ?? 0,
      href: `/campaigns/${id}/hypotheses`,
    },
    { label: "Abdeckung", value: `${completionRate}%` },
  ];

  // The synthesis pipeline as a vertical agent-plan ledger down the spine. The
  // running stage carries the lone amber pulse + active connector; everything
  // before it is done, everything after pending. The status is derived from the
  // coarse signals we already have (completed interviews / insights / hypotheses).
  const pipeline = buildPipeline({
    completed: stats?.interviews_completed ?? 0,
    insights: stats?.insights ?? 0,
    hypotheses: stats?.hypotheses ?? 0,
    live: isLive,
  });

  // Spec rows for the sticky masthead rail.
  const created = new Date(campaign.created_at).toLocaleDateString("de-DE");

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
      {/* ── Left rail — sticky masthead + spec readout ───────────────────── */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-start justify-between gap-3">
          <h1 className="masthead__title min-w-0 break-words">
            {campaign.org_name}
          </h1>
        </div>

        <dl className="mt-6">
          {isLive && (
            <div className="spec-row">
              <dt className="spec-row__label">Status</dt>
              <dd className="spec-row__value text-accent">
                <StatusDisc state="live" size="sm" />
                LIVE
              </dd>
            </div>
          )}
          <div className="spec-row">
            <dt className="spec-row__label">Status</dt>
            <dd className="spec-row__value">
              <StatusBadge status={campaign.status} />
            </dd>
          </div>
          <div className="spec-row">
            <dt className="spec-row__label">Sprache</dt>
            <dd className="spec-row__value">{campaign.language.toUpperCase()}</dd>
          </div>
          <div className="spec-row">
            <dt className="spec-row__label">Länge</dt>
            <dd className="spec-row__value">{campaign.interview_length_min} min</dd>
          </div>
          <div className="spec-row">
            <dt className="spec-row__label">n=</dt>
            <dd className="spec-row__value">{stats?.participants ?? 0}</dd>
          </div>
          <div className="spec-row">
            <dt className="spec-row__label">Läuft</dt>
            <dd className="spec-row__value">{inProgress}</dd>
          </div>
          <div className="spec-row">
            <dt className="spec-row__label">Erstellt</dt>
            <dd className="spec-row__value">{created}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <RefineButton campaignId={id} />
        </div>
      </aside>

      {/* ── Right track — instrument band + pipeline + activation + context ─ */}
      <div className="min-w-0 space-y-8">
        {sp.flash && (
          <FlashBanner
            type={sp.flashType === "error" ? "err" : "ok"}
            message={sp.flash}
          />
        )}

        <SpecStrip cells={cells} />

        {/* Synthesis pipeline — agent-plan ledger on the spine. */}
        <section>
          <header className="mb-1 flex items-baseline justify-between gap-4 border-b border-line pb-2">
            <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
              § SYNTHESE-PIPELINE
            </span>
            <span className="font-mono text-xs tabular-nums text-fg-muted">
              {pipeline.filter((p) => p.status === "done").length}/
              {pipeline.length}
            </span>
          </header>
          <EvidenceTree nodes={pipeline} defaultExpandedDepth={0} />
        </section>

        {/* Activation — the one primary action. */}
        <section className="border-t border-line pt-6">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-[52ch] space-y-2">
              <span className="eyebrow">Step 01 · Einladen</span>
              <h2 className="text-lg font-semibold tracking-tight text-fg">
                Teilnehmer aktivieren.
              </h2>
              <p className="text-sm leading-relaxed text-fg-muted">
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
        </section>

        {/* Company context — reading register. */}
        <section className="border-t border-line pt-6">
          <span className="eyebrow">Unternehmenskontext</span>
          <p className="card--reading mt-3 whitespace-pre-wrap text-fg-muted">
            {campaign.company_context}
          </p>
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

  // Each stage: done once its downstream output exists; live when it is the
  // current frontier and work is flowing; pending otherwise.
  const extractDone = insights > 0;
  const clusterDone = insights > 0;
  const hypoDone = hypotheses > 0;

  // The single running frontier (only when an interview is live OR there is
  // unprocessed-but-present material). Keep exactly one amber.
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
      meta: <span className="font-mono tabular-nums">n={completed}</span>,
    },
    {
      id: "extract",
      kind: "step",
      status: extract.status,
      pulse: extract.pulse,
      activeConnector: extract.active,
      label: "VSE-Extraktion · Mistral",
      meta: <span className="font-mono tabular-nums">{insights} insights</span>,
    },
    {
      id: "cluster",
      kind: "step",
      status: cluster.status,
      pulse: cluster.pulse,
      activeConnector: cluster.active,
      label: "Embedding · Clustering · Qdrant",
      meta: <span className="font-mono tabular-nums">cos&gt;0.82</span>,
    },
    {
      id: "hypothesis",
      kind: "step",
      status: hypothesis.status,
      pulse: hypothesis.pulse,
      activeConnector: hypothesis.active,
      label: "Hypothesen · Falsifikation",
      meta: <span className="font-mono tabular-nums">{hypotheses} hyp</span>,
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
