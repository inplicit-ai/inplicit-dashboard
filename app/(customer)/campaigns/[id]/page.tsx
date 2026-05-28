import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import {
  makeApi,
  type Campaign,
  type CampaignStats,
  type LaunchResult,
} from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ErrorState";
import { Eyebrow, PageHeader, StatusBadge } from "@/components/PageChrome";
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

  const isDraft = campaign.status === "DRAFT";
  const launchLabel = isDraft
    ? "Kampagne starten — alle einladen"
    : "Ausstehende Einladungen versenden";

  return (
    <>
      <PageHeader
        title={campaign.org_name}
        actions={
          <div className="flex items-center gap-3">
            <RefineButton campaignId={id} />
            <StatusBadge status={campaign.status} />
          </div>
        }
      />

      {sp.flash && (
        <FlashBanner
          type={sp.flashType === "error" ? "err" : "ok"}
          message={sp.flash}
        />
      )}

      {/* Stat grid */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Teilnehmer" value={stats?.participants ?? 0} />
        <Stat
          label="Abgeschlossen"
          value={stats?.interviews_completed ?? 0}
          sub={`${completionRate}% Abdeckung`}
        />
        <Stat label="Insights" value={stats?.insights ?? 0} />
        <Stat label="Hypothesen" value={stats?.hypotheses ?? 0} />
      </div>

      {/* CTA */}
      <Card className="mb-8 flex flex-col items-start justify-between gap-6 rounded-card border-line bg-surface p-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="max-w-[48ch] space-y-2">
          <Eyebrow>Step 01 · Einladen</Eyebrow>
          <h2 className="text-xl font-semibold tracking-tight text-fg">
            Teilnehmer aktivieren.
          </h2>
          <p className="text-sm text-fg-muted">
            Bulk-Versand an alle, die noch nicht eingeladen wurden. Bereits
            versendete werden übersprungen.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <form action={launchCampaign}>
            <Button type="submit">{launchLabel}</Button>
          </form>
          <Button asChild variant="link" size="sm" className="px-0 text-fg-muted">
            <Link href={`/campaigns/${id}/participants`}>
              Einzeln verwalten
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </Card>

      {/* Company context */}
      <Card className="mb-8 rounded-card border-line bg-surface p-6">
        <Eyebrow>Unternehmenskontext</Eyebrow>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
          {campaign.company_context}
        </p>
      </Card>

      {/* Progress */}
      <Card className="rounded-card border-line bg-surface p-6">
        <Eyebrow>Fortschritt</Eyebrow>
        <p className="mt-3 mb-4 text-sm text-fg-muted">
          {stats?.interviews_completed ?? 0} von {stats?.participants ?? 0}{" "}
          Interviews abgeschlossen
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </Card>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <Card className="rounded-card border-line bg-surface p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-medium tabular-nums tracking-tight text-fg">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-fg-muted">{sub}</p>}
    </Card>
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
        "mb-6 flex items-start gap-2.5 rounded-ui border px-3.5 py-2.5 text-sm",
        type === "ok"
          ? "border-success/30 bg-success-soft text-success"
          : "border-pain/30 bg-pain-soft text-pain",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-snug">{message}</p>
    </div>
  );
}
