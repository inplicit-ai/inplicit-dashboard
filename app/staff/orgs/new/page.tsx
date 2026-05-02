import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ApiError,
  makeApi,
  type ProvisionOrgInput,
} from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { PageHeader } from "@/components/PageChrome";

export default async function NewOrgPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sticky?: string }>;
}) {
  const sp = await searchParams;
  const sticky: Partial<ProvisionOrgInput> = sp.sticky
    ? JSON.parse(decodeURIComponent(sp.sticky))
    : {};

  async function createOrg(formData: FormData) {
    "use server";
    const get = (k: string) => String(formData.get(k) ?? "").trim();

    const body: ProvisionOrgInput = {
      name: get("name"),
      slug: get("slug"),
      company_context: get("company_context"),
      industry: get("industry") || undefined,
      default_locale: get("default_locale") || "de",
      default_voice_id: parseIntOr(get("default_voice_id"), 438),
      default_interview_length_min: parseIntOr(get("default_interview_length_min"), 25),
      owner_email: get("owner_email"),
      owner_name: get("owner_name"),
      issue_magic_link: formData.get("issue_magic_link") === "on",
    };

    if (!body.name || !body.slug || !body.company_context || !body.owner_email || !body.owner_name) {
      const stickyParam = encodeURIComponent(JSON.stringify(body));
      redirect(
        `/staff/orgs/new?error=${encodeURIComponent("Bitte alle Pflichtfelder ausfüllen.")}&sticky=${stickyParam}`,
      );
    }

    const api = makeApi(await requestCookie());
    let redirectTo: string;
    try {
      const result = await api.staff.orgs.create(body);
      const params = new URLSearchParams();
      if (result.magic_link) params.set("magic_link", result.magic_link);
      if (result.email_sent === true) params.set("email_sent", "1");
      if (result.email_error) params.set("email_error", result.email_error);
      const qs = params.toString();
      redirectTo = `/staff/orgs/${result.org.id}${qs ? "?" + qs : ""}`;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      const stickyParam = encodeURIComponent(JSON.stringify(body));
      redirectTo = `/staff/orgs/new?error=${encodeURIComponent(msg)}&sticky=${stickyParam}`;
    }
    redirect(redirectTo);
  }

  return (
    <div className="new-org">
      <Link href="/staff/orgs" className="btn btn--link new-org__back">
        ← Organisationen
      </Link>

      <PageHeader
        eyebrow="Inplicit Staff"
        title="Organisation anlegen"
        muted="ein Kunde, ein Account"
      />

      {sp.error && <div className="flash flash--err section">{sp.error}</div>}

      <form action={createOrg} className="card new-org__form">
        <div className="new-org__group">
          <h2 className="subtitle">Unternehmen</h2>
          <p className="caption">Daten zum Kunden. Sind später bearbeitbar.</p>
        </div>

        <label className="field">
          <span className="field__label">Name *</span>
          <input name="name" required className="input" placeholder="Acme GmbH" defaultValue={sticky.name} />
        </label>

        <label className="field">
          <span className="field__label">Slug *</span>
          <p className="caption new-org__hint">
            URL-tauglich, eindeutig, klein-buchstaben + Bindestrich (z.B. <span className="mono">acme-gmbh</span>).
          </p>
          <input
            name="slug"
            required
            className="input mono"
            pattern="[a-z0-9\-]+"
            placeholder="acme-gmbh"
            defaultValue={sticky.slug}
          />
        </label>

        <label className="field">
          <span className="field__label">Unternehmenskontext *</span>
          <p className="caption new-org__hint">
            2–4 Sätze. Branche, Größe, Produkt, Zielgruppe. Wird in jeden Interview-System-Prompt eingespeist.
          </p>
          <textarea
            name="company_context"
            required
            rows={6}
            className="textarea"
            placeholder="Acme GmbH ist ein B2B-SaaS für Logistikfirmen mit Sitz in Berlin..."
            defaultValue={sticky.company_context}
          />
        </label>

        <div className="new-org__row">
          <label className="field">
            <span className="field__label">Branche</span>
            <input
              name="industry"
              className="input"
              placeholder="Logistik-SaaS"
              defaultValue={sticky.industry}
            />
          </label>
          <label className="field">
            <span className="field__label">Standardsprache</span>
            <select name="default_locale" className="select" defaultValue={sticky.default_locale ?? "de"}>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>

        <div className="new-org__row">
          <label className="field">
            <span className="field__label">Standard-Voice-ID</span>
            <input
              name="default_voice_id"
              type="number"
              min="1"
              className="input"
              defaultValue={String(sticky.default_voice_id ?? 438)}
            />
          </label>
          <label className="field">
            <span className="field__label">Standard-Interviewdauer (Min)</span>
            <input
              name="default_interview_length_min"
              type="number"
              min="10"
              max="60"
              className="input"
              defaultValue={String(sticky.default_interview_length_min ?? 25)}
            />
          </label>
        </div>

        <div className="new-org__divider" />

        <div className="new-org__group">
          <h2 className="subtitle">Customer-Account</h2>
          <p className="caption">
            Genau ein User pro Org. Die Person, die das Dashboard sieht.
          </p>
        </div>

        <div className="new-org__row">
          <label className="field">
            <span className="field__label">Owner-Email *</span>
            <input
              name="owner_email"
              type="email"
              required
              className="input"
              placeholder="max@acme.de"
              defaultValue={sticky.owner_email}
            />
          </label>
          <label className="field">
            <span className="field__label">Owner-Name *</span>
            <input
              name="owner_name"
              required
              className="input"
              placeholder="Max Mustermann"
              defaultValue={sticky.owner_name}
            />
          </label>
        </div>

        <label className="field new-org__check">
          <input type="checkbox" name="issue_magic_link" defaultChecked />
          <span>
            Magic-Link sofort ausgeben{" "}
            <span className="caption">
              Der Owner bekommt eine Welcome-Email mit dem Login-Link (15 Min gültig, single-use).
            </span>
          </span>
        </label>

        <button type="submit" className="btn btn--primary btn--lg new-org__submit">
          Organisation anlegen
        </button>
      </form>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .new-org { max-width: 680px; margin: 0 auto; }
        .new-org__back { margin-bottom: var(--space-6); display: inline-block; }
        .new-org__form { display: flex; flex-direction: column; gap: var(--space-5); }
        .new-org__group { display: flex; flex-direction: column; gap: var(--space-1); }
        .new-org__hint { margin-bottom: var(--space-2); }
        .new-org__row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
        .new-org__divider { height: 1px; background: var(--color-border); margin: var(--space-3) 0; }
        .new-org__check { flex-direction: row; align-items: flex-start; gap: var(--space-3); }
        .new-org__check input { margin-top: 4px; }
        .new-org__submit { width: 100%; margin-top: var(--space-3); }
      `,
        }}
      />
    </div>
  );
}

function parseIntOr(s: string, fallback: number): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
