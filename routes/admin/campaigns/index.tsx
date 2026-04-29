import { defineRoute } from "$fresh/server.ts";
import { Campaign, makeApi } from "../../../lib/api.ts";
import { Layout, PageHeader, StatusBadge } from "../../../components/Layout.tsx";
import { ErrorState } from "../../../components/ErrorState.tsx";

export default defineRoute(async (req) => {
  const cookie = req.headers.get("cookie") ?? undefined;
  const api = makeApi(cookie);

  let campaigns: Campaign[] = [];
  let error: unknown = null;

  try {
    campaigns = await api.campaigns.list();
    console.log(`[campaigns] loaded ${campaigns.length}`);
  } catch (e) {
    error = e;
  }

  return (
    <Layout title="Kampagnen">
      <PageHeader
        title="Kampagnen"
        actions={
          <a href="/admin/campaigns/new" class="btn btn--primary">
            Neue Kampagne
          </a>
        }
      />

      {error && <div class="section"><ErrorState error={error} /></div>}

      {!error && campaigns.length === 0 && (
        <div class="card">
          <div class="empty-state">
            <p class="empty-state__title">Noch keine Kampagnen.</p>
            <p>Lege deine erste an, lade Teilnehmer ein, sieh dir die Insights an.</p>
            <a
              href="/admin/campaigns/new"
              class="btn btn--primary"
              style="margin-top: var(--space-6)"
            >
              Erste Kampagne erstellen
            </a>
          </div>
        </div>
      )}

      {campaigns.length > 0 && (
        <div class="list-stack">
          {campaigns.map((c) => (
            <a key={c.id} href={`/admin/campaigns/${c.id}`} class="campaign-row">
              <div>
                <p class="campaign-row__title">{c.org_name}</p>
                <p class="caption" style="margin-top: var(--space-1)">
                  {c.language.toUpperCase()} · {c.interview_length_min} Min ·{" "}
                  {new Date(c.created_at).toLocaleDateString("de-DE")}
                </p>
              </div>
              <StatusBadge status={c.status} />
            </a>
          ))}
        </div>
      )}

      <style>{`
        .campaign-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
          padding: var(--space-5) var(--space-6);
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          transition: border-color 0.15s var(--ease-smooth), background 0.15s var(--ease-smooth);
        }
        .campaign-row:hover {
          border-color: var(--color-text-tertiary);
          background: var(--color-surface);
        }
        .campaign-row__title {
          font-size: var(--text-body-lg);
          font-weight: 500;
          color: var(--color-text-primary);
          letter-spacing: -0.01em;
        }
      `}</style>
    </Layout>
  );
});
