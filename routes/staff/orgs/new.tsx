import { Handlers, PageProps } from "$fresh/server.ts";
import { ApiError, makeApi, Me, ProvisionOrgInput } from "../../../lib/api.ts";
import { Layout, PageHeader } from "../../../components/Layout.tsx";
import { requireStaff } from "../../../lib/staff-guard.ts";

interface Data {
  me?: Me;
  error?: string;
  /** Sticky form values when validation fails. */
  form?: Partial<Record<keyof ProvisionOrgInput, string>>;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const guard = await requireStaff(req);
    if (!guard.ok) return guard.redirect;
    return ctx.render({ me: guard.me });
  },

  async POST(req, ctx) {
    const guard = await requireStaff(req);
    if (!guard.ok) return guard.redirect;

    const form = await req.formData();
    const get = (k: string) => String(form.get(k) ?? "").trim();

    const body: ProvisionOrgInput = {
      name: get("name"),
      slug: get("slug"),
      company_context: get("company_context"),
      industry: get("industry") || undefined,
      default_locale: get("default_locale") || "de",
      default_voice_id: parseIntOr(get("default_voice_id"), 438),
      default_interview_length_min: parseIntOr(
        get("default_interview_length_min"),
        25,
      ),
      owner_email: get("owner_email"),
      owner_name: get("owner_name"),
      issue_magic_link: form.get("issue_magic_link") === "on",
    };

    if (
      !body.name || !body.slug || !body.company_context ||
      !body.owner_email || !body.owner_name
    ) {
      return ctx.render({
        me: guard.me,
        error: "Bitte alle Pflichtfelder ausfüllen.",
        form: bodyToForm(body),
      });
    }

    const api = makeApi(guard.cookie);
    try {
      const result = await api.staff.orgs.create(body);
      const params = new URLSearchParams();
      if (result.magic_link) {
        params.set("magic_link", result.magic_link);
      }
      if (result.email_sent === true) {
        params.set("email_sent", "1");
      }
      if (result.email_error) {
        params.set("email_error", result.email_error);
      }
      const qs = params.toString();
      const target = `/staff/orgs/${result.org.id}${qs ? "?" + qs : ""}`;
      return new Response(null, { status: 303, headers: { Location: target } });
    } catch (e) {
      // 409 carries field-specific guidance from the backend; surface it
      // verbatim so the staff member can correct slug or email immediately.
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      return ctx.render({ me: guard.me, error: msg, form: bodyToForm(body) });
    }
  },
};

function parseIntOr(s: string, fallback: number): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function bodyToForm(body: ProvisionOrgInput): Data["form"] {
  return {
    name: body.name,
    slug: body.slug,
    company_context: body.company_context,
    industry: body.industry,
    default_locale: body.default_locale,
    default_voice_id: String(body.default_voice_id ?? ""),
    default_interview_length_min: String(body.default_interview_length_min ?? ""),
    owner_email: body.owner_email,
    owner_name: body.owner_name,
  };
}

export default function NewOrg({ data }: PageProps<Data>) {
  const f = data.form ?? {};
  return (
    <Layout title="Neue Organisation" mode="staff" me={data.me}>
      <div class="new-org">
        <a href="/staff/orgs" class="btn btn--link new-org__back">← Organisationen</a>

        <PageHeader
          eyebrow="Inplicit Staff"
          title="Organisation anlegen"
          muted="ein Kunde, ein Account"
        />

        {data.error && <div class="flash flash--err section">{data.error}</div>}

        <form method="POST" class="card new-org__form">
          <div class="new-org__group">
            <h2 class="subtitle">Unternehmen</h2>
            <p class="caption">Daten zum Kunden. Sind später bearbeitbar.</p>
          </div>

          <label class="field">
            <span class="field__label">Name *</span>
            <input
              name="name"
              required
              class="input"
              placeholder="Acme GmbH"
              defaultValue={f.name}
            />
          </label>

          <label class="field">
            <span class="field__label">Slug *</span>
            <p class="caption new-org__hint">
              URL-tauglich, eindeutig, klein-buchstaben + Bindestrich (z.B.{" "}
              <span class="mono">acme-gmbh</span>).
            </p>
            <input
              name="slug"
              required
              class="input mono"
              pattern="[a-z0-9\-]+"
              placeholder="acme-gmbh"
              defaultValue={f.slug}
            />
          </label>

          <label class="field">
            <span class="field__label">Unternehmenskontext *</span>
            <p class="caption new-org__hint">
              2–4 Sätze. Branche, Größe, Produkt, Zielgruppe. Wird in jeden
              Interview-System-Prompt eingespeist.
            </p>
            <textarea
              name="company_context"
              required
              rows={6}
              class="textarea"
              placeholder="Acme GmbH ist ein B2B-SaaS für Logistikfirmen mit Sitz in Berlin. Seit 2019 am Markt, ~80 Mitarbeitende, hauptsächlich DACH-Kunden..."
              defaultValue={f.company_context}
            />
          </label>

          <div class="new-org__row">
            <label class="field">
              <span class="field__label">Branche</span>
              <input
                name="industry"
                class="input"
                placeholder="Logistik-SaaS"
                defaultValue={f.industry}
              />
            </label>
            <label class="field">
              <span class="field__label">Standardsprache</span>
              <select name="default_locale" class="select">
                <option value="de" selected={f.default_locale !== "en"}>Deutsch</option>
                <option value="en" selected={f.default_locale === "en"}>English</option>
              </select>
            </label>
          </div>

          <div class="new-org__row">
            <label class="field">
              <span class="field__label">Standard-Voice-ID</span>
              <input
                name="default_voice_id"
                type="number"
                min="1"
                class="input"
                defaultValue={f.default_voice_id ?? "438"}
              />
            </label>
            <label class="field">
              <span class="field__label">Standard-Interviewdauer (Min)</span>
              <input
                name="default_interview_length_min"
                type="number"
                min="10"
                max="60"
                class="input"
                defaultValue={f.default_interview_length_min ?? "25"}
              />
            </label>
          </div>

          <div class="new-org__divider" />

          <div class="new-org__group">
            <h2 class="subtitle">Customer-Account</h2>
            <p class="caption">
              Genau ein User pro Org. Die Person, die das Dashboard sieht.
              Muss eine andere Email sein als die Inplicit-Team-Email,
              da User-Emails unique sind.
            </p>
          </div>

          <div class="new-org__row">
            <label class="field">
              <span class="field__label">Owner-Email *</span>
              <input
                name="owner_email"
                type="email"
                required
                class="input"
                placeholder="max@acme.de"
                defaultValue={f.owner_email}
              />
            </label>
            <label class="field">
              <span class="field__label">Owner-Name *</span>
              <input
                name="owner_name"
                required
                class="input"
                placeholder="Max Mustermann"
                defaultValue={f.owner_name}
              />
            </label>
          </div>

          <label class="field new-org__check">
            <input type="checkbox" name="issue_magic_link" defaultChecked />
            <span>
              Magic-Link sofort ausgeben{" "}
              <span class="caption">
                Der Owner bekommt eine Welcome-Email mit dem Login-Link
                (15 Min gültig, single-use).
              </span>
            </span>
          </label>

          <button type="submit" class="btn btn--primary btn--lg new-org__submit">
            Organisation anlegen
          </button>
        </form>
      </div>

      <style>{`
        .new-org { max-width: 680px; margin: 0 auto; }
        .new-org__back { margin-bottom: var(--space-6); display: inline-block; }
        .new-org__form {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }
        .new-org__group { display: flex; flex-direction: column; gap: var(--space-1); }
        .new-org__hint { margin-bottom: var(--space-2); }
        .new-org__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        .new-org__divider {
          height: 1px;
          background: var(--color-border);
          margin: var(--space-3) 0;
        }
        .new-org__check {
          flex-direction: row;
          align-items: flex-start;
          gap: var(--space-3);
        }
        .new-org__check input { margin-top: 4px; }
        .new-org__submit { width: 100%; margin-top: var(--space-3); }
      `}</style>
    </Layout>
  );
}
