import Link from "next/link";
import { revalidatePath } from "next/cache";
import { makeApi, type Campaign, type CampaignStats, type LaunchResult } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { Eyebrow, PageHeader, StatusBadge } from "@/components/PageChrome";

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
    [campaign, stats] = await Promise.all([api.campaigns.get(id), api.stats(id)]);
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
    return <ErrorState error={error ?? new Error("Audit nicht gefunden.")} />;
  }

  const completionRate =
    stats && stats.participants > 0
      ? Math.round((stats.interviews_completed / stats.participants) * 100)
      : 0;

  const isDraft = campaign.status === "DRAFT";
  const launchLabel = isDraft
    ? "Audit starten — alle einladen"
    : "Ausstehende Einladungen versenden";

  return (
    <>
      <PageHeader
        title={campaign.org_name}
        actions={<StatusBadge status={campaign.status} />}
      />

      {sp.flash && (
        <div
          className={`flash ${sp.flashType === "error" ? "flash--err" : "flash--ok"} section`}
        >
          {sp.flash}
        </div>
      )}

      <div className="stat-grid section">
        <Stat label="Teilnehmer" value={stats?.participants ?? 0} />
        <Stat
          label="Abgeschlossen"
          value={stats?.interviews_completed ?? 0}
          sub={`${completionRate}% Abdeckung`}
        />
        <Stat label="Insights" value={stats?.insights ?? 0} />
        <Stat label="Hypothesen" value={stats?.hypotheses ?? 0} />
      </div>

      <section className="card section ov-cta">
        <div className="ov-cta__copy">
          <Eyebrow>Step 01 · Einladen</Eyebrow>
          <h2 className="title ov-cta__title">Teilnehmer aktivieren.</h2>
          <p className="body-sm ov-cta__caption">
            Bulk-Versand an alle, die noch nicht eingeladen wurden. Bereits versendete werden übersprungen.
          </p>
        </div>
        <div className="ov-cta__actions">
          <form action={launchCampaign}>
            <button type="submit" className="btn btn--primary">
              {launchLabel}
            </button>
          </form>
          <Link href={`/campaigns/${id}/participants`} className="btn btn--link">
            Einzeln verwalten →
          </Link>
        </div>
      </section>

      <section className="card section">
        <Eyebrow>Unternehmenskontext</Eyebrow>
        <p
          className="body"
          style={{
            marginTop: "var(--space-3)",
            whiteSpace: "pre-wrap",
            color: "var(--color-text-secondary)",
          }}
        >
          {campaign.company_context}
        </p>
      </section>

      <section className="card">
        <Eyebrow>Fortschritt</Eyebrow>
        <p
          className="body-sm"
          style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-4)" }}
        >
          {stats?.interviews_completed ?? 0} von {stats?.participants ?? 0} Interviews abgeschlossen
        </p>
        <div className="progress">
          <div className="progress__bar" style={{ width: `${completionRate}%` }} />
        </div>
      </section>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .ov-cta {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-8);
        }
        .ov-cta__copy { max-width: 48ch; }
        .ov-cta__title { margin-top: var(--space-3); }
        .ov-cta__caption { margin-top: var(--space-2); }
        .ov-cta__actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: var(--space-2);
          flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .ov-cta { flex-direction: column; }
          .ov-cta__actions { align-items: stretch; }
        }
      `,
        }}
      />
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {sub && <div className="stat__sub">{sub}</div>}
    </div>
  );
}
