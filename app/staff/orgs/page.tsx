import Link from "next/link";
import { makeApi, type Organization } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge } from "@/components/PageChrome";

export default async function StaffOrgsPage() {
  const api = makeApi(await requestCookie());
  let orgs: Organization[] = [];
  let error: unknown = null;
  try {
    orgs = await api.staff.orgs.list();
  } catch (e) {
    error = e;
  }

  return (
    <>
      <PageHeader
        eyebrow="Inplicit Staff"
        title="Organisationen"
        muted={`${orgs.length} aktiv`}
        actions={
          <Link href="/staff/orgs/new" className="btn btn--primary">
            Neue Organisation
          </Link>
        }
      />

      {error && (
        <div className="section">
          <ErrorState error={error} />
        </div>
      )}

      {!error && orgs.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">Noch keine Kunden-Organisation.</p>
            <p>
              Lege die erste an. Pro Org genau ein Customer-User, das Inplicit-Team
              behält Cross-Org-Zugriff.
            </p>
            <Link
              href="/staff/orgs/new"
              className="btn btn--primary"
              style={{ marginTop: "var(--space-6)" }}
            >
              Erste Organisation anlegen
            </Link>
          </div>
        </div>
      )}

      {orgs.length > 0 && (
        <div className="list-stack">
          {orgs.map((o) => (
            <Link key={o.id} href={`/staff/orgs/${o.id}`} className="org-row">
              <div>
                <p className="org-row__title">{o.name}</p>
                <p className="caption" style={{ marginTop: "var(--space-1)" }}>
                  <span className="mono">{o.slug}</span>
                  {o.industry && <> · {o.industry}</>}
                  {" "}
                  · {o.default_locale.toUpperCase()}
                  {" "}
                  · {o.default_interview_length_min} Min
                  {o.created_at && (
                    <> · seit {new Date(o.created_at).toLocaleDateString("de-DE")}</>
                  )}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </Link>
          ))}
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
      `,
        }}
      />
    </>
  );
}
