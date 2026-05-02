import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/PageChrome";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";

/**
 * "Neuer Audit" — conceptually the trigger to start a new round of interviews
 * for the *existing* organization. The org's `company_context`, `name`, and
 * defaults are inherited; the form only collects audit-specific knobs:
 *
 *  - optional goals (what we want to learn from this round)
 *  - optional duration override
 *  - optional participants CSV
 *
 * Backend defaults the audit name to `Audit KW{ISO_WEEK}-{YEAR}` so the
 * minimal flow is: open page → click "Audit anlegen" → done.
 */
export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  async function createCampaign(formData: FormData) {
    "use server";
    const cookie = (await cookies()).toString();

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/campaigns/upload`, {
        method: "POST",
        headers: { Cookie: cookie },
        body: formData,
        cache: "no-store",
      });
    } catch (e) {
      console.error("[create-campaign] backend unreachable:", (e as Error).message);
      redirect(
        "/campaigns/new?error=" +
          encodeURIComponent(`Backend nicht erreichbar (${API_BASE}).`),
      );
    }

    if (!res.ok) {
      const text = await res.text();
      let errMsg = text;
      try {
        const j = JSON.parse(text);
        errMsg = j.error ?? text;
      } catch {}
      redirect(
        "/campaigns/new?error=" + encodeURIComponent(`Fehler ${res.status}: ${errMsg}`),
      );
    }

    const result = (await res.json()) as { campaign?: { id: string } };
    redirect(`/campaigns/${result.campaign?.id ?? ""}`);
  }

  return (
    <div className="new-audit">
      <Link href="/campaigns" className="btn btn--link new-audit__back">
        ← Audits
      </Link>

      <PageHeader
        title="Neuer Audit"
      />

      <p className="new-audit__intro">
        Ein Audit triggert eine neue Runde anonymer Interviews für deine
        Organisation. Unternehmenskontext und Standard­einstellungen werden
        aus den Org-Settings übernommen.
      </p>

      {sp.error && <div className="flash flash--err new-audit__flash">{sp.error}</div>}

      <form action={createCampaign} className="new-audit__form">
        <div className="card new-audit__card">
          <div className="new-audit__card-head">
            <span className="eyebrow">Kontext</span>
            <h2 className="new-audit__card-title">Lernziele <span className="new-audit__optional">optional</span></h2>
            <p className="new-audit__card-sub">
              Was wollen wir mit diesem Audit lernen? Lass es leer für ein
              breites, offenes Audit.
            </p>
          </div>
          <textarea
            name="goals"
            rows={4}
            placeholder="z. B. Wie wirkt sich das neue CRM auf die Sales-Workflows aus?"
            className="textarea"
          />
        </div>

        <div className="card new-audit__card">
          <div className="new-audit__card-head">
            <span className="eyebrow">Format</span>
            <h2 className="new-audit__card-title">Interview-Dauer</h2>
            <p className="new-audit__card-sub">
              Voreinstellung: Standard deiner Organisation.
            </p>
          </div>
          <div className="new-audit__row">
            <label className="field">
              <span className="field__label">Dauer (Min)</span>
              <input
                name="interview_length_min"
                type="number"
                min="10"
                max="60"
                placeholder="25"
                className="input"
              />
            </label>
            <label className="field">
              <span className="field__label">Sprache</span>
              <select name="language" className="select" defaultValue="">
                <option value="">Standard der Org</option>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        </div>

        <div className="card new-audit__card">
          <div className="new-audit__card-head">
            <span className="eyebrow">Teilnehmer</span>
            <h2 className="new-audit__card-title">CSV-Import <span className="new-audit__optional">optional</span></h2>
            <p className="new-audit__card-sub">
              Spalten: <code>email</code> (Pflicht), <code>name, department, role</code>.
              Du kannst Teilnehmer auch später einzeln hinzufügen.
            </p>
          </div>
          <input name="participants" type="file" accept=".csv" className="input" />
        </div>

        <div className="new-audit__actions">
          <Link href="/campaigns" className="btn btn--ghost">
            Abbrechen
          </Link>
          <button type="submit" className="btn btn--primary btn--lg">
            Audit anlegen
          </button>
        </div>
      </form>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .new-audit { max-width: 720px; margin: 0 auto; }
        .new-audit__back { margin-bottom: var(--space-4); display: inline-block; }
        .new-audit__intro {
          color: var(--color-text-secondary);
          font-size: var(--text-body);
          line-height: 1.6;
          max-width: 56ch;
          margin-bottom: var(--space-8);
        }
        .new-audit__flash { margin-bottom: var(--space-6); }
        .new-audit__form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .new-audit__card {
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .new-audit__card-head {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .new-audit__card-title {
          font-size: var(--text-subtitle);
          font-weight: 500;
          color: var(--color-text-primary);
          letter-spacing: -0.01em;
          margin: 0;
        }
        .new-audit__card-sub {
          font-size: var(--text-body-sm);
          color: var(--color-text-secondary);
          max-width: 56ch;
        }
        .new-audit__optional {
          margin-left: var(--space-2);
          font-size: var(--text-caption);
          font-weight: 500;
          color: var(--color-text-tertiary);
          letter-spacing: 0;
        }
        .new-audit__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        .new-audit__actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          margin-top: var(--space-2);
        }
        @media (max-width: 560px) {
          .new-audit__row { grid-template-columns: 1fr; }
          .new-audit__actions { flex-direction: column-reverse; }
          .new-audit__actions .btn { width: 100%; }
        }
      `,
        }}
      />
    </div>
  );
}
