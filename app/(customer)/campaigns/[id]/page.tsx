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
import { MetricCard } from "@/components/ui/metric-card";
import { Card } from "@/components/ui/card";
import { StatusDisc } from "@/components/ui/status-disc";
import { RefineButton } from "@/components/campaign-chat/RefineButton";
import { CampaignActionsMenu } from "@/components/campaign/CampaignActionsMenu";
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
  // Fetch independently: the overview must render even if the stats endpoint is
  // unavailable (a stats failure must NOT turn the whole page into an error /
  // "not found"). Only a missing campaign is a hard error.
  try {
    campaign = await api.campaigns.get(id);
  } catch (e) {
    error = e;
  }
  if (campaign) {
    try {
      stats = await api.stats(id);
    } catch {
      stats = null;
    }
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

  const created = new Date(campaign.created_at).toLocaleDateString("de-DE");

  const displayName = campaign.name || "Kampagne";

  return (
    <div>
      <PageHeader
        title={displayName}
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
            <CampaignActionsMenu
              campaignId={id}
              currentName={displayName}
              afterDeleteHref="/campaigns"
            />
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

        {/* WHY-95: "Synthese-Pipeline" section removed from the overview. */}

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
      </div>
    </div>
  );
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
