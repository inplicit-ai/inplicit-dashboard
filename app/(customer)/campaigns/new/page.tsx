import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/PageChrome";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";

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
          encodeURIComponent(
            `Backend nicht erreichbar (${API_BASE}).`,
          ),
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
    <div className="new-campaign">
      <Link href="/campaigns" className="btn btn--link new-campaign__back">
        ← Audits
      </Link>

      <PageHeader title="Neuer Audit" />

      {sp.error && <div className="flash flash--err section">{sp.error}</div>}

      <form action={createCampaign} className="card new-campaign__form">
        <label className="field">
          <span className="field__label">Organisation</span>
          <input
            name="org_name"
            required
            className="input"
            placeholder="HHLA, Acme GmbH, …"
          />
        </label>

        <label className="field">
          <span className="field__label">Unternehmenskontext</span>
          <p className="caption new-campaign__hint">
            Beschreibe Unternehmen, Branche und Forschungsziel. Wird in jeden System-Prompt eingebettet.
          </p>
          <textarea name="company_context" required rows={6} className="textarea" />
        </label>

        <div className="new-campaign__row">
          <label className="field">
            <span className="field__label">Sprache</span>
            <select name="language" className="select" defaultValue="de">
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Dauer (Min)</span>
            <input
              name="interview_length_min"
              type="number"
              min="10"
              max="60"
              defaultValue="25"
              className="input"
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Teilnehmer-CSV (optional)</span>
          <p className="caption new-campaign__hint">
            Spalten: <code>email</code> (Pflicht), <code>name, department, role</code> (optional).
            Du kannst Teilnehmer auch später einzeln hinzufügen.
          </p>
          <input name="participants" type="file" accept=".csv" className="input" />
        </label>

        <button type="submit" className="btn btn--primary btn--lg new-campaign__submit">
          Audit anlegen
        </button>
      </form>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .new-campaign { max-width: 640px; margin: 0 auto; }
        .new-campaign__back { margin-bottom: var(--space-6); display: inline-block; }
        .new-campaign__form { display: flex; flex-direction: column; gap: var(--space-6); }
        .new-campaign__hint { margin-bottom: var(--space-2); }
        .new-campaign__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        .new-campaign__submit { width: 100%; margin-top: var(--space-2); }
      `,
        }}
      />
    </div>
  );
}
