import { Handlers, PageProps } from "$fresh/server.ts";
import { Campaign, CampaignStats, LaunchResult, makeApi } from "../../../../lib/api.ts";
import { Eyebrow, Layout, PageHeader, StatusBadge } from "../../../../components/Layout.tsx";
import { ErrorState } from "../../../../components/ErrorState.tsx";

interface Data {
  campaign: Campaign | null;
  stats: CampaignStats | null;
  error: unknown;
  flash: { type: "success" | "error"; message: string } | null;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const id = ctx.params.id;
    const api = makeApi(req.headers.get("cookie") ?? undefined);
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

    return ctx.render({ campaign, stats, error, flash: null });
  },

  async POST(req, ctx) {
    const id = ctx.params.id;
    const api = makeApi(req.headers.get("cookie") ?? undefined);
    let campaign: Campaign | null = null;
    let stats: CampaignStats | null = null;
    let flash: Data["flash"] = null;
    let result: LaunchResult | null = null;

    try {
      result = await api.campaigns.launch(id);
    } catch (e) {
      flash = {
        type: "error",
        message: e instanceof Error ? e.message : "Launch fehlgeschlagen",
      };
    }

    if (result) {
      const { sent, skipped, failed, errors } = result;
      if (sent + skipped > 0 && failed === 0) {
        flash = {
          type: "success",
          message: sent > 0
            ? `${sent} Einladung${sent === 1 ? "" : "en"} verschickt.`
            : `${skipped} Link${skipped === 1 ? "" : "s"} geloggt (Resend nicht konfiguriert).`,
        };
      } else if (sent + skipped === 0 && failed === 0) {
        flash = { type: "success", message: result.message ?? "Bereits versendet." };
      } else {
        flash = {
          type: "error",
          message: errors && errors.length > 0
            ? errors[0]
            : `Gesendet: ${sent}, übersprungen: ${skipped}, fehlgeschlagen: ${failed}`,
        };
      }
    }

    try {
      [campaign, stats] = await Promise.all([
        api.campaigns.get(id),
        api.stats(id),
      ]);
    } catch (e) {
      return ctx.render({ campaign: null, stats: null, error: e, flash });
    }
    return ctx.render({ campaign, stats, error: null, flash });
  },
};

export default function CampaignOverview({ data, params }: PageProps<Data>) {
  const id = params.id;
  const { campaign, stats, error, flash } = data;

  if (error || !campaign) {
    return (
      <Layout title="Kampagne">
        <ErrorState error={error ?? new Error("Kampagne nicht gefunden.")} />
      </Layout>
    );
  }

  const completionRate = stats && stats.participants > 0
    ? Math.round((stats.interviews_completed / stats.participants) * 100)
    : 0;

  const isDraft = campaign.status === "DRAFT";
  const launchLabel = isDraft
    ? "Kampagne starten — alle einladen"
    : "Ausstehende Einladungen versenden";

  return (
    <Layout title={campaign.org_name} campaignId={id} activeTab="overview">
      <PageHeader
        title={campaign.org_name}
        actions={<StatusBadge status={campaign.status} />}
      />

      {flash && (
        <div class={`flash ${flash.type === "success" ? "flash--ok" : "flash--err"} section`}>
          {flash.message}
        </div>
      )}

      <div class="stat-grid section">
        <Stat label="Teilnehmer" value={stats?.participants ?? 0} />
        <Stat
          label="Abgeschlossen"
          value={stats?.interviews_completed ?? 0}
          sub={`${completionRate}% Abdeckung`}
        />
        <Stat label="Insights" value={stats?.insights ?? 0} />
        <Stat label="Hypothesen" value={stats?.hypotheses ?? 0} />
      </div>

      <section class="card section ov-cta">
        <div class="ov-cta__copy">
          <Eyebrow>Step 01 · Einladen</Eyebrow>
          <h2 class="title ov-cta__title">Teilnehmer aktivieren.</h2>
          <p class="body-sm ov-cta__caption">
            Bulk-Versand an alle, die noch nicht eingeladen wurden. Bereits versendete werden übersprungen.
          </p>
        </div>
        <div class="ov-cta__actions">
          <form method="POST">
            <button type="submit" class="btn btn--primary">
              {launchLabel}
            </button>
          </form>
          <a href={`/admin/campaigns/${id}/participants`} class="btn btn--link">
            Einzeln verwalten →
          </a>
        </div>
      </section>

      <section class="card section">
        <Eyebrow>Unternehmenskontext</Eyebrow>
        <p class="body" style="margin-top: var(--space-3); white-space: pre-wrap; color: var(--color-text-secondary);">
          {campaign.company_context}
        </p>
      </section>

      <section class="card">
        <Eyebrow>Fortschritt</Eyebrow>
        <p class="body-sm" style="margin-top: var(--space-3); margin-bottom: var(--space-4)">
          {stats?.interviews_completed ?? 0} von {stats?.participants ?? 0} Interviews abgeschlossen
        </p>
        <div class="progress">
          <div class="progress__bar" style={`width: ${completionRate}%`} />
        </div>
      </section>

      <style>{`
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
      `}</style>
    </Layout>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div class="stat">
      <div class="stat__label">{label}</div>
      <div class="stat__value">{value}</div>
      {sub && <div class="stat__sub">{sub}</div>}
    </div>
  );
}
