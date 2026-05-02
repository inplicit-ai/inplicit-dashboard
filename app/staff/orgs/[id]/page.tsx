import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ApiError,
  makeApi,
  type Organization,
  type UpdateOrgInput,
} from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge } from "@/components/PageChrome";

interface OrgDetailSearchParams {
  edit?: string;
  magic_link?: string;
  reissued_for?: string;
  email_sent?: string;
  email_error?: string;
  updated?: string;
  suspended?: string;
  error?: string;
}

export default async function OrgDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<OrgDetailSearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const api = makeApi(await requestCookie());

  let org: Organization | null = null;
  let error: unknown = null;
  try {
    org = await api.staff.orgs.get(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      redirect("/staff/orgs");
    }
    error = e;
  }

  // ── Server actions ──────────────────────────────────────────────────────

  async function issueMagicLinkAction() {
    "use server";
    const api = makeApi(await requestCookie());
    const result = await api.staff.orgs.issueMagicLink(id);
    const params = new URLSearchParams();
    if (result.magic_link) params.set("magic_link", result.magic_link);
    params.set("reissued_for", result.owner_email);
    if (result.email_sent) params.set("email_sent", "1");
    if (result.email_error) params.set("email_error", result.email_error);
    redirect(`/staff/orgs/${id}?${params.toString()}`);
  }

  async function updateOrgAction(formData: FormData) {
    "use server";
    const get = (k: string) => {
      const v = formData.get(k);
      return typeof v === "string" ? v.trim() : "";
    };
    const patch: UpdateOrgInput = {
      name: get("name") || undefined,
      company_context: get("company_context") || undefined,
      industry: get("industry") || undefined,
      default_locale: get("default_locale") || undefined,
      default_voice_id: parseIntOr(get("default_voice_id")),
      default_interview_length_min: parseIntOr(get("default_interview_length_min")),
    };
    const api = makeApi(await requestCookie());
    try {
      await api.staff.orgs.update(id, patch);
      redirect(`/staff/orgs/${id}?updated=1`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(`/staff/orgs/${id}?edit=1&error=${encodeURIComponent(msg)}`);
    }
  }

  async function suspendOrgAction() {
    "use server";
    const api = makeApi(await requestCookie());
    await api.staff.orgs.suspend(id);
    redirect(`/staff/orgs/${id}?suspended=1`);
  }

  async function deleteOrgAction(formData: FormData) {
    "use server";
    const confirmName = String(formData.get("confirm_name") ?? "").trim();
    const api = makeApi(await requestCookie());
    const fresh = await api.staff.orgs.get(id).catch(() => null);
    if (!fresh) redirect("/staff/orgs");
    if (confirmName !== fresh.name) {
      redirect(
        `/staff/orgs/${id}?error=${encodeURIComponent(
          `Bestätigung fehlgeschlagen: Tippe den Org-Namen exakt ("${fresh.name}").`,
        )}`,
      );
    }
    await api.staff.orgs.remove(id);
    redirect("/staff/orgs?deleted=1");
  }

  if (!org || error) {
    return (
      <>
        <Link
          href="/staff/orgs"
          className="btn btn--link"
          style={{ marginBottom: "var(--space-6)", display: "inline-block" }}
        >
          ← Organisationen
        </Link>
        {error && <ErrorState error={error} />}
      </>
    );
  }

  const editing = sp.edit === "1";

  return (
    <>
      <Link
        href="/staff/orgs"
        className="btn btn--link"
        style={{ marginBottom: "var(--space-6)", display: "inline-block" }}
      >
        ← Organisationen
      </Link>

      {sp.error && (
        <div className="section">
          <ErrorState error={new Error(sp.error)} />
        </div>
      )}

      {!editing && (
        <>
          <PageHeader
            eyebrow="Organisation"
            title={org.name}
            muted={org.slug}
            meta={
              <>
                <StatusBadge status={org.status} />{" "}
                <span className="caption">
                  {org.default_locale.toUpperCase()} · {org.default_interview_length_min} Min · Voice{" "}
                  {org.default_voice_id}
                </span>
              </>
            }
            actions={
              <div className="org-actions">
                <Link href={`/staff/orgs/${org.id}?edit=1`} className="btn btn--ghost">
                  Bearbeiten
                </Link>
                <form action={issueMagicLinkAction} style={{ display: "inline" }}>
                  <button type="submit" className="btn btn--primary">
                    Magic-Link ausgeben
                  </button>
                </form>
              </div>
            }
          />

          {sp.updated === "1" && <div className="card flash flash--ok">Organisation aktualisiert.</div>}
          {sp.suspended === "1" && <div className="card flash flash--ok">Organisation suspendiert.</div>}

          {sp.magic_link && (
            <div className="card flash flash--ok">
              <p className="subtitle" style={{ marginBottom: "var(--space-2)" }}>
                Magic-Link bereit{sp.reissued_for && <span className="caption"> für {sp.reissued_for}</span>}
              </p>
              <p className="caption" style={{ marginBottom: "var(--space-3)" }}>
                15 Minuten gültig, single-use.
                {sp.email_sent === "1" ? " Eine Email mit dem Link wurde an den Owner verschickt." : ""}
              </p>
              <div className="org-magic-link">
                <a className="mono org-magic-link__a" href={sp.magic_link}>
                  {sp.magic_link}
                </a>
              </div>
              <p className="caption" style={{ marginTop: "var(--space-3)" }}>
                Tipp: in einem Inkognito-Tab öffnen, um nicht deine Staff-Session zu überschreiben.
              </p>
            </div>
          )}

          {sp.email_error && (
            <div className="card flash flash--err">
              <p className="subtitle" style={{ marginBottom: "var(--space-2)" }}>
                Welcome-Email konnte nicht versendet werden
              </p>
              <p className="caption mono" style={{ wordBreak: "break-all" }}>
                {sp.email_error}
              </p>
              <p className="caption" style={{ marginTop: "var(--space-3)" }}>
                Häufige Ursachen: <span className="mono">RESEND_API_KEY</span> fehlt,{" "}
                <span className="mono">FROM_EMAIL</span> nicht domain-verifiziert, oder die
                Resend-Sandbox erlaubt nur Versand an die Account-Email.
              </p>
            </div>
          )}

          <section className="card section">
            <h2 className="subtitle">Unternehmenskontext</h2>
            <p className="caption" style={{ marginBottom: "var(--space-3)" }}>
              Wird in jeden Interview-System-Prompt der Org eingespeist. Audits können das pro Audit überschreiben.
            </p>
            <p className="org-context">{org.company_context}</p>
            {org.industry && (
              <p className="caption" style={{ marginTop: "var(--space-3)" }}>
                Branche: <span className="mono">{org.industry}</span>
              </p>
            )}
          </section>

          <section className="card section">
            <h2 className="subtitle">Defaults für neue Audits</h2>
            <dl className="org-defaults">
              <div>
                <dt className="caption">Sprache</dt>
                <dd>{org.default_locale.toUpperCase()}</dd>
              </div>
              <div>
                <dt className="caption">Interviewdauer</dt>
                <dd>{org.default_interview_length_min} Minuten</dd>
              </div>
              <div>
                <dt className="caption">ElevenLabs Voice-ID</dt>
                <dd className="mono">{org.default_voice_id}</dd>
              </div>
              <div>
                <dt className="caption">Status</dt>
                <dd>
                  <StatusBadge status={org.status} />
                </dd>
              </div>
            </dl>
          </section>

          <section className="card section">
            <h2 className="subtitle">Metadaten</h2>
            <dl className="org-defaults">
              <div>
                <dt className="caption">Org-ID</dt>
                <dd className="mono" style={{ fontSize: "0.85em" }}>
                  {org.id}
                </dd>
              </div>
              <div>
                <dt className="caption">Slug</dt>
                <dd className="mono">{org.slug}</dd>
              </div>
              <div>
                <dt className="caption">Erstellt</dt>
                <dd>{org.created_at ? new Date(org.created_at).toLocaleString("de-DE") : "-"}</dd>
              </div>
              <div>
                <dt className="caption">Aktualisiert</dt>
                <dd>{org.updated_at ? new Date(org.updated_at).toLocaleString("de-DE") : "-"}</dd>
              </div>
            </dl>
          </section>

          <section className="card section danger-zone">
            <header className="danger-zone__header">
              <h2 className="subtitle">Danger Zone</h2>
              <p className="caption">Aktionen mit weitreichenden Folgen. Lesen, dann bewusst ausführen.</p>
            </header>

            <div className="danger-zone__row">
              <div>
                <p className="danger-zone__title">Suspendieren</p>
                <p className="caption">
                  Org-Status auf <span className="mono">SUSPENDED</span>. Bestehende Audits bleiben, aber der
                  Customer kann sich nicht einloggen, bis du sie reaktivierst.
                </p>
              </div>
              <form action={suspendOrgAction} style={{ display: "inline" }}>
                <button type="submit" className="btn btn--ghost">
                  Suspendieren
                </button>
              </form>
            </div>

            <div className="danger-zone__row">
              <div>
                <p className="danger-zone__title">Löschen</p>
                <p className="caption">
                  Soft-Delete. Org wird auf <span className="mono">DELETED</span> markiert und aus den Listen
                  verborgen.
                </p>
                <p className="caption" style={{ marginTop: "var(--space-3)" }}>
                  Zur Bestätigung den Org-Namen exakt eintippen: <span className="mono">{org.name}</span>
                </p>
              </div>
              <form action={deleteOrgAction} className="danger-zone__delete">
                <input
                  type="text"
                  name="confirm_name"
                  required
                  className="input"
                  placeholder={org.name}
                  autoComplete="off"
                />
                <button type="submit" className="btn btn--danger">
                  Endgültig löschen
                </button>
              </form>
            </div>
          </section>
        </>
      )}

      {editing && (
        <>
          <PageHeader eyebrow="Bearbeiten" title={org.name} muted={org.slug} />

          <form action={updateOrgAction} className="card edit-form">
            <label className="field">
              <span className="field__label">Name</span>
              <input name="name" className="input" defaultValue={org.name} required />
            </label>

            <label className="field">
              <span className="field__label">Unternehmenskontext</span>
              <p className="caption" style={{ marginBottom: "var(--space-2)" }}>
                Wird in jeden Interview-System-Prompt eingespeist.
              </p>
              <textarea
                name="company_context"
                rows={6}
                className="textarea"
                defaultValue={org.company_context}
              />
            </label>

            <div className="edit-form__row">
              <label className="field">
                <span className="field__label">Branche</span>
                <input
                  name="industry"
                  className="input"
                  defaultValue={org.industry ?? ""}
                  placeholder="Logistik-SaaS"
                />
              </label>
              <label className="field">
                <span className="field__label">Standardsprache</span>
                <select
                  name="default_locale"
                  className="select"
                  defaultValue={org.default_locale}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>

            <div className="edit-form__row">
              <label className="field">
                <span className="field__label">Voice-ID</span>
                <input
                  name="default_voice_id"
                  type="number"
                  min="1"
                  className="input"
                  defaultValue={String(org.default_voice_id)}
                />
              </label>
              <label className="field">
                <span className="field__label">Interviewdauer (Min)</span>
                <input
                  name="default_interview_length_min"
                  type="number"
                  min="10"
                  max="60"
                  className="input"
                  defaultValue={String(org.default_interview_length_min)}
                />
              </label>
            </div>

            <div className="edit-form__actions">
              <Link href={`/staff/orgs/${org.id}`} className="btn btn--ghost">
                Abbrechen
              </Link>
              <button type="submit" className="btn btn--primary">
                Speichern
              </button>
            </div>
          </form>
        </>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .org-actions { display: flex; gap: var(--space-3); }
        .org-context { white-space: pre-wrap; font-size: var(--text-body); color: var(--color-text-primary); line-height: 1.6; }
        .org-defaults { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-4); margin: 0; }
        .org-defaults > div { display: flex; flex-direction: column; gap: var(--space-1); }
        .org-defaults dd { margin: 0; font-weight: 500; color: var(--color-text-primary); }
        .org-magic-link { padding: var(--space-3); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-ui); word-break: break-all; }
        .org-magic-link__a { color: var(--color-accent-strong); }
        .org-magic-link__a:hover { text-decoration: underline; }
        .danger-zone { border-color: var(--color-pain-muted); background: var(--color-pain-soft); }
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
        .danger-zone__title { font-size: var(--text-body); font-weight: 500; color: var(--color-text-primary); margin-bottom: var(--space-2); }
        .danger-zone__delete { display: flex; flex-direction: column; gap: var(--space-2); min-width: 240px; }
        .edit-form { display: flex; flex-direction: column; gap: var(--space-5); }
        .edit-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
        .edit-form__actions { display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-3); }
      `,
        }}
      />
    </>
  );
}

function parseIntOr(s: string): number | undefined {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
