import Link from "next/link";
import type { Campaign } from "@/lib/api";
import { makeApi } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge } from "@/components/PageChrome";
import { RagSearch } from "@/components/RagSearch";

export default async function CampaignsPage() {
  const api = makeApi(await requestCookie());
  let campaigns: Campaign[] = [];
  let error: unknown = null;
  try {
    campaigns = await api.campaigns.list();
  } catch (e) {
    error = e;
  }

  return (
    <>
      <PageHeader
        title="Audits"
        actions={
          <Link href="/campaigns/new" className="btn btn--primary">
            Neuer Audit
          </Link>
        }
      />

      <section className="section">
        <RagSearch />
      </section>

      {error && (
        <div className="section">
          <ErrorState error={error} />
        </div>
      )}

      {!error && campaigns.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">Noch keine Audits.</p>
            <p>Lege deinen ersten an, lade Teilnehmer ein, sieh dir die Insights an.</p>
            <Link
              href="/campaigns/new"
              className="btn btn--primary"
              style={{ marginTop: "var(--space-6)" }}
            >
              Ersten Audit erstellen
            </Link>
          </div>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="list-stack">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`} className="campaign-row">
              <div>
                <p className="campaign-row__title">{c.org_name}</p>
                <p className="caption" style={{ marginTop: "var(--space-1)" }}>
                  {c.language.toUpperCase()} · {c.interview_length_min} Min ·{" "}
                  {new Date(c.created_at).toLocaleDateString("de-DE")}
                </p>
              </div>
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
