import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout, PageHeader } from "../../../components/Layout.tsx";

const API_BASE = Deno.env.get("API_URL") ?? "http://localhost:8080";

interface Data {
  error?: string;
}

export const handler: Handlers<Data> = {
  GET(_req, ctx) {
    return ctx.render({});
  },
  async POST(req, ctx) {
    const cookie = req.headers.get("cookie") ?? "";
    const contentType = req.headers.get("content-type") ?? "";
    const body = await req.arrayBuffer();

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/campaigns/upload`, {
        method: "POST",
        headers: { "Content-Type": contentType, Cookie: cookie },
        body,
      });
    } catch (e) {
      console.error("[create-campaign] backend unreachable:", (e as Error).message);
      return ctx.render({
        error:
          `Backend nicht erreichbar (${API_BASE}). Bitte "cargo run" im inplicit-backend Verzeichnis starten.`,
      });
    }

    if (!res.ok) {
      const text = await res.text();
      let errMsg = text;
      try {
        const j = JSON.parse(text);
        errMsg = j.error ?? text;
      } catch {
        // ignore
      }
      return ctx.render({ error: `Fehler ${res.status}: ${errMsg}` });
    }

    const result = await res.json();
    const campaignId = result.campaign?.id;
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin/campaigns/${campaignId}` },
    });
  },
};

export default function NewCampaign({ data }: PageProps<Data>) {
  return (
    <Layout title="Neuer Audit">
      <div class="new-campaign">
        <a href="/admin/campaigns" class="btn btn--link new-campaign__back">
          ← Audits
        </a>

        <PageHeader title="Neuer Audit" />

        {data.error && <div class="flash flash--err section">{data.error}</div>}

        <form method="POST" encType="multipart/form-data" class="card new-campaign__form">
          <label class="field">
            <span class="field__label">Organisation</span>
            <input
              name="org_name"
              required
              class="input"
              placeholder="HHLA, Acme GmbH, …"
            />
          </label>

          <label class="field">
            <span class="field__label">Unternehmenskontext</span>
            <p class="caption new-campaign__hint">
              Beschreibe Unternehmen, Branche und Forschungsziel. Wird in jeden System-Prompt eingebettet.
            </p>
            <textarea name="company_context" required rows={6} class="textarea" />
          </label>

          <div class="new-campaign__row">
            <label class="field">
              <span class="field__label">Sprache</span>
              <select name="language" class="select">
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">Dauer (Min)</span>
              <input
                name="interview_length_min"
                type="number"
                min="10"
                max="60"
                value="25"
                class="input"
              />
            </label>
          </div>

          <label class="field">
            <span class="field__label">Teilnehmer-CSV (optional)</span>
            <p class="caption new-campaign__hint">
              Spalten: <code>email</code> (Pflicht), <code>name, department, role</code>{" "}
              (optional). Du kannst Teilnehmer auch später einzeln hinzufügen.
            </p>
            <input name="participants" type="file" accept=".csv" class="input" />
          </label>

          <button type="submit" class="btn btn--primary btn--lg new-campaign__submit">
            Audit anlegen
          </button>
        </form>
      </div>

      <style>{`
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
      `}</style>
    </Layout>
  );
}
