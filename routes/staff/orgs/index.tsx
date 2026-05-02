import { defineRoute } from "$fresh/server.ts";
import { makeApi, Organization } from "../../../lib/api.ts";
import { Layout, PageHeader, StatusBadge } from "../../../components/Layout.tsx";
import { ErrorState } from "../../../components/ErrorState.tsx";
import { requireStaff } from "../../../lib/staff-guard.ts";

export default defineRoute(async (req) => {
  const guard = await requireStaff(req);
  if (!guard.ok) return guard.redirect;

  const api = makeApi(guard.cookie);
  let orgs: Organization[] = [];
  let error: unknown = null;

  try {
    orgs = await api.staff.orgs.list();
  } catch (e) {
    error = e;
  }

  return (
    <Layout title="Orgs (Staff)" mode="staff" me={guard.me}>
      <PageHeader
        eyebrow="Inplicit Staff"
        title="Organisationen"
        muted={`${orgs.length} aktiv`}
        actions={
          <a href="/staff/orgs/new" class="btn btn--primary">
            Neue Organisation
          </a>
        }
      />

      {error && <div class="section"><ErrorState error={error} /></div>}

      {!error && orgs.length === 0 && (
        <div class="card">
          <div class="empty-state">
            <p class="empty-state__title">Noch keine Kunden-Organisation.</p>
            <p>
              Lege die erste an. Pro Org genau ein Customer-User, das Inplicit-Team
              behält Cross-Org-Zugriff.
            </p>
            <a
              href="/staff/orgs/new"
              class="btn btn--primary"
              style="margin-top: var(--space-6)"
            >
              Erste Organisation anlegen
            </a>
          </div>
        </div>
      )}

      {orgs.length > 0 && (
        <div class="list-stack">
          {orgs.map((o) => (
            <a key={o.id} href={`/staff/orgs/${o.id}`} class="org-row">
              <div>
                <p class="org-row__title">{o.name}</p>
                <p class="caption" style="margin-top: var(--space-1)">
                  <span class="mono">{o.slug}</span>
                  {o.industry && <> · {o.industry}</>}
                   · {o.default_locale.toUpperCase()}
                   · {o.default_interview_length_min} Min
                  {o.created_at && (
                    <> · seit {new Date(o.created_at).toLocaleDateString("de-DE")}</>
                  )}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </a>
          ))}
        </div>
      )}

      <style>{`
        .org-row {
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
        .org-row:hover {
          border-color: var(--color-text-tertiary);
          background: var(--color-surface);
        }
        .org-row__title {
          font-size: var(--text-body-lg);
          font-weight: 500;
          color: var(--color-text-primary);
          letter-spacing: -0.01em;
        }
      `}</style>
    </Layout>
  );
});
