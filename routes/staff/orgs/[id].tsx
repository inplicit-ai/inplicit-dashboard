import { Handlers, PageProps } from "$fresh/server.ts";
import {
  ApiError,
  makeApi,
  Me,
  Organization,
  UpdateOrgInput,
} from "../../../lib/api.ts";
import { Layout, PageHeader, StatusBadge } from "../../../components/Layout.tsx";
import { ErrorState } from "../../../components/ErrorState.tsx";
import { requireStaff } from "../../../lib/staff-guard.ts";

interface Data {
  me: Me;
  org?: Organization;
  error?: string;
  /** Sticky form values when an update validation fails. */
  editing?: boolean;
  patch?: UpdateOrgInput;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const guard = await requireStaff(req);
    if (!guard.ok) return guard.redirect;

    const api = makeApi(guard.cookie);
    try {
      const org = await api.staff.orgs.get(ctx.params.id);
      const url = new URL(req.url);
      const editing = url.searchParams.get("edit") === "1";
      return ctx.render({ me: guard.me, org, editing });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/staff/orgs" },
        });
      }
      return ctx.render({ me: guard.me, error: (e as Error).message });
    }
  },

  async POST(req, ctx) {
    const guard = await requireStaff(req);
    if (!guard.ok) return guard.redirect;

    const form = await req.formData();
    const action = String(form.get("action") ?? "");
    const api = makeApi(guard.cookie);

    try {
      if (action === "issue_magic_link") {
        const result = await api.staff.orgs.issueMagicLink(ctx.params.id);
        const params = new URLSearchParams();
        if (result.magic_link) params.set("magic_link", result.magic_link);
        params.set("reissued_for", result.owner_email);
        if (result.email_sent) params.set("email_sent", "1");
        if (result.email_error) params.set("email_error", result.email_error);
        return new Response(null, {
          status: 303,
          headers: { Location: `/staff/orgs/${ctx.params.id}?${params}` },
        });
      }

      if (action === "update") {
        const get = (k: string) => {
          const v = form.get(k);
          return typeof v === "string" ? v.trim() : "";
        };
        const patch: UpdateOrgInput = {
          name: get("name") || undefined,
          company_context: get("company_context") || undefined,
          industry: get("industry") || undefined,
          default_locale: get("default_locale") || undefined,
          default_voice_id: parseIntOr(get("default_voice_id")),
          default_interview_length_min: parseIntOr(
            get("default_interview_length_min"),
          ),
        };
        await api.staff.orgs.update(ctx.params.id, patch);
        return new Response(null, {
          status: 303,
          headers: { Location: `/staff/orgs/${ctx.params.id}?updated=1` },
        });
      }

      if (action === "suspend") {
        await api.staff.orgs.suspend(ctx.params.id);
        return new Response(null, {
          status: 303,
          headers: { Location: `/staff/orgs/${ctx.params.id}?suspended=1` },
        });
      }

      if (action === "delete") {
        // Confirmation token check so accidental form replays can't wipe an org.
        const confirmName = String(form.get("confirm_name") ?? "").trim();
        const org = await api.staff.orgs.get(ctx.params.id).catch(() => null);
        if (!org) {
          return new Response(null, {
            status: 303,
            headers: { Location: "/staff/orgs" },
          });
        }
        if (confirmName !== org.name) {
          return ctx.render({
            me: guard.me,
            org,
            editing: false,
            error:
              `Bestätigung fehlgeschlagen: Tippe den Org-Namen exakt ("${org.name}").`,
          });
        }
        await api.staff.orgs.remove(ctx.params.id);
        return new Response(null, {
          status: 303,
          headers: { Location: "/staff/orgs?deleted=1" },
        });
      }

      return new Response(null, {
        status: 303,
        headers: { Location: `/staff/orgs/${ctx.params.id}` },
      });
    } catch (e) {
      console.error(`[staff] action=${action} failed:`, e);
      const org = await api.staff.orgs.get(ctx.params.id).catch(() => undefined);
      return ctx.render({
        me: guard.me,
        org,
        error: (e as Error).message,
      });
    }
  },
};

function parseIntOr(s: string): number | undefined {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default function OrgDetail({ data, url }: PageProps<Data>) {
  const sp = url.searchParams;
  const magicLink = sp.get("magic_link");
  const reissuedFor = sp.get("reissued_for");
  const emailSent = sp.get("email_sent") === "1";
  const emailError = sp.get("email_error");
  const updated = sp.get("updated") === "1";
  const suspended = sp.get("suspended") === "1";
  const editing = data.editing ?? false;

  const org = data.org;

  return (
    <Layout
      title={org?.name ?? "Organisation"}
      mode="staff"
      me={data.me}
    >
      <a
        href="/staff/orgs"
        class="btn btn--link"
        style="margin-bottom: var(--space-6); display: inline-block;"
      >
        ← Organisationen
      </a>

      {data.error && <div class="section"><ErrorState error={data.error} /></div>}

      {org && !editing && (
        <>
          <PageHeader
            eyebrow="Organisation"
            title={org.name}
            muted={org.slug}
            meta={
              <>
                <StatusBadge status={org.status} /> {" "}
                <span class="caption">
                  {org.default_locale.toUpperCase()} ·{" "}
                  {org.default_interview_length_min} Min · Voice{" "}
                  {org.default_voice_id}
                </span>
              </>
            }
            actions={
              <div class="org-actions">
                <a
                  href={`/staff/orgs/${org.id}?edit=1`}
                  class="btn btn--ghost"
                >
                  Bearbeiten
                </a>
                <form method="POST" style="display: inline">
                  <input type="hidden" name="action" value="issue_magic_link" />
                  <button type="submit" class="btn btn--primary">
                    Magic-Link ausgeben
                  </button>
                </form>
              </div>
            }
          />

          {/* ── Flashes ────────────────────────────────────────────── */}
          {updated && (
            <div class="card flash flash--ok">Organisation aktualisiert.</div>
          )}
          {suspended && (
            <div class="card flash flash--ok">Organisation suspendiert.</div>
          )}

          {magicLink && (
            <div class="card flash flash--ok">
              <p class="subtitle" style="margin-bottom: var(--space-2)">
                Magic-Link bereit
                {reissuedFor && (
                  <span class="caption"> für {reissuedFor}</span>
                )}
              </p>
              <p class="caption" style="margin-bottom: var(--space-3)">
                15 Minuten gültig, single-use.
                {emailSent
                  ? " Eine Email mit dem Link wurde an den Owner verschickt."
                  : ""}
              </p>
              <div class="org-magic-link">
                <a class="mono org-magic-link__a" href={magicLink}>
                  {magicLink}
                </a>
              </div>
              <p class="caption" style="margin-top: var(--space-3)">
                Tipp: in einem Inkognito-Tab öffnen, um nicht deine
                Staff-Session zu überschreiben.
              </p>
            </div>
          )}

          {emailError && (
            <div class="card flash flash--err">
              <p class="subtitle" style="margin-bottom: var(--space-2)">
                Welcome-Email konnte nicht versendet werden
              </p>
              <p class="caption mono" style="word-break: break-all">{emailError}</p>
              <p class="caption" style="margin-top: var(--space-3)">
                Häufige Ursachen: <span class="mono">RESEND_API_KEY</span>{" "}
                fehlt, <span class="mono">FROM_EMAIL</span> nicht
                domain-verifiziert, oder die Resend-Sandbox erlaubt nur Versand
                an die Account-Email. Den Magic-Link kannst du oben manuell
                kopieren.
              </p>
            </div>
          )}

          {/* ── Cards ──────────────────────────────────────────────── */}
          <section class="card section">
            <h2 class="subtitle">Unternehmenskontext</h2>
            <p class="caption" style="margin-bottom: var(--space-3)">
              Wird in jeden Interview-System-Prompt der Org eingespeist.
              Audits können das pro Audit überschreiben.
            </p>
            <p class="org-context">{org.company_context}</p>
            {org.industry && (
              <p class="caption" style="margin-top: var(--space-3)">
                Branche: <span class="mono">{org.industry}</span>
              </p>
            )}
          </section>

          <section class="card section">
            <h2 class="subtitle">Defaults für neue Audits</h2>
            <dl class="org-defaults">
              <div>
                <dt class="caption">Sprache</dt>
                <dd>{org.default_locale.toUpperCase()}</dd>
              </div>
              <div>
                <dt class="caption">Interviewdauer</dt>
                <dd>{org.default_interview_length_min} Minuten</dd>
              </div>
              <div>
                <dt class="caption">ElevenLabs Voice-ID</dt>
                <dd class="mono">{org.default_voice_id}</dd>
              </div>
              <div>
                <dt class="caption">Status</dt>
                <dd><StatusBadge status={org.status} /></dd>
              </div>
            </dl>
          </section>

          <section class="card section">
            <h2 class="subtitle">Metadaten</h2>
            <dl class="org-defaults">
              <div>
                <dt class="caption">Org-ID</dt>
                <dd class="mono" style="font-size: 0.85em">{org.id}</dd>
              </div>
              <div>
                <dt class="caption">Slug</dt>
                <dd class="mono">{org.slug}</dd>
              </div>
              <div>
                <dt class="caption">Erstellt</dt>
                <dd>
                  {org.created_at
                    ? new Date(org.created_at).toLocaleString("de-DE")
                    : "-"}
                </dd>
              </div>
              <div>
                <dt class="caption">Aktualisiert</dt>
                <dd>
                  {org.updated_at
                    ? new Date(org.updated_at).toLocaleString("de-DE")
                    : "-"}
                </dd>
              </div>
            </dl>
          </section>

          {/* ── Danger zone ────────────────────────────────────────── */}
          <section class="card section danger-zone">
            <header class="danger-zone__header">
              <h2 class="subtitle">Danger Zone</h2>
              <p class="caption">
                Aktionen mit weitreichenden Folgen. Lesen, dann bewusst
                ausführen.
              </p>
            </header>

            <div class="danger-zone__row">
              <div>
                <p class="danger-zone__title">Suspendieren</p>
                <p class="caption">
                  Org-Status auf <span class="mono">SUSPENDED</span>. Bestehende
                  Audits bleiben, aber der Customer kann sich nicht
                  einloggen, bis du sie reaktivierst.
                </p>
              </div>
              <form method="POST" style="display: inline">
                <input type="hidden" name="action" value="suspend" />
                <button type="submit" class="btn btn--ghost">
                  Suspendieren
                </button>
              </form>
            </div>

            <div class="danger-zone__row">
              <div>
                <p class="danger-zone__title">Löschen</p>
                <p class="caption">
                  Soft-Delete. Org wird auf <span class="mono">DELETED</span>{" "}
                  markiert und aus den Listen verborgen. Audits,
                  Teilnehmer und S3-Audio bleiben aktuell bestehen
                  (Cascade-Delete folgt in Phase 11).
                </p>
                <p class="caption" style="margin-top: var(--space-3)">
                  Zur Bestätigung den Org-Namen exakt eintippen:{" "}
                  <span class="mono">{org.name}</span>
                </p>
              </div>
              <form method="POST" class="danger-zone__delete">
                <input type="hidden" name="action" value="delete" />
                <input
                  type="text"
                  name="confirm_name"
                  required
                  class="input"
                  placeholder={org.name}
                  autocomplete="off"
                />
                <button type="submit" class="btn btn--danger">
                  Endgültig löschen
                </button>
              </form>
            </div>
          </section>
        </>
      )}

      {/* ── Edit form ────────────────────────────────────────────── */}
      {org && editing && (
        <>
          <PageHeader
            eyebrow="Bearbeiten"
            title={org.name}
            muted={org.slug}
          />

          <form method="POST" class="card edit-form">
            <input type="hidden" name="action" value="update" />

            <label class="field">
              <span class="field__label">Name</span>
              <input
                name="name"
                class="input"
                defaultValue={org.name}
                required
              />
            </label>

            <label class="field">
              <span class="field__label">Unternehmenskontext</span>
              <p class="caption" style="margin-bottom: var(--space-2)">
                Wird in jeden Interview-System-Prompt eingespeist.
              </p>
              <textarea
                name="company_context"
                rows={6}
                class="textarea"
                defaultValue={org.company_context}
              />
            </label>

            <div class="edit-form__row">
              <label class="field">
                <span class="field__label">Branche</span>
                <input
                  name="industry"
                  class="input"
                  defaultValue={org.industry ?? ""}
                  placeholder="Logistik-SaaS"
                />
              </label>
              <label class="field">
                <span class="field__label">Standardsprache</span>
                <select name="default_locale" class="select">
                  <option
                    value="de"
                    selected={org.default_locale === "de"}
                  >
                    Deutsch
                  </option>
                  <option
                    value="en"
                    selected={org.default_locale === "en"}
                  >
                    English
                  </option>
                </select>
              </label>
            </div>

            <div class="edit-form__row">
              <label class="field">
                <span class="field__label">Voice-ID</span>
                <input
                  name="default_voice_id"
                  type="number"
                  min="1"
                  class="input"
                  defaultValue={String(org.default_voice_id)}
                />
              </label>
              <label class="field">
                <span class="field__label">Interviewdauer (Min)</span>
                <input
                  name="default_interview_length_min"
                  type="number"
                  min="10"
                  max="60"
                  class="input"
                  defaultValue={String(org.default_interview_length_min)}
                />
              </label>
            </div>

            <div class="edit-form__actions">
              <a href={`/staff/orgs/${org.id}`} class="btn btn--ghost">
                Abbrechen
              </a>
              <button type="submit" class="btn btn--primary">
                Speichern
              </button>
            </div>
          </form>
        </>
      )}

      <style>{`
        .org-actions { display: flex; gap: var(--space-3); }
        .org-context {
          white-space: pre-wrap;
          font-size: var(--text-body);
          color: var(--color-text-primary);
          line-height: 1.6;
        }
        .org-defaults {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--space-4);
          margin: 0;
        }
        .org-defaults > div { display: flex; flex-direction: column; gap: var(--space-1); }
        .org-defaults dd { margin: 0; font-weight: 500; color: var(--color-text-primary); }
        .org-magic-link {
          padding: var(--space-3);
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-ui);
          word-break: break-all;
        }
        .org-magic-link__a { color: var(--color-accent-strong); }
        .org-magic-link__a:hover { text-decoration: underline; }

        .danger-zone {
          border-color: var(--color-pain-muted);
          background: var(--color-pain-soft);
        }
        .danger-zone__header { margin-bottom: var(--space-5); }
        .danger-zone__row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--space-4);
          align-items: start;
          padding: var(--space-5) 0;
          border-top: 1px solid var(--color-pain-muted);
        }
        .danger-zone__row:first-of-type { border-top: 0; padding-top: 0; }
        .danger-zone__title {
          font-size: var(--text-body);
          font-weight: 500;
          color: var(--color-text-primary);
          margin-bottom: var(--space-2);
        }
        .danger-zone__delete {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          min-width: 240px;
        }

        .edit-form { display: flex; flex-direction: column; gap: var(--space-5); }
        .edit-form__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        .edit-form__actions {
          display: flex;
          gap: var(--space-3);
          justify-content: flex-end;
          margin-top: var(--space-3);
        }
      `}</style>
    </Layout>
  );
}
