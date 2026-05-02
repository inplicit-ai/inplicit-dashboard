import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiError, makeApi, type StaffUserSummary } from "@/lib/api";
import { requireAdmin, requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageChrome";

interface SearchParams {
  flash?: string;
  flashType?: "ok" | "err";
  magic_link?: string;
  reissued_for?: string;
  email_sent?: string;
  email_error?: string;
}

export default async function StaffUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const api = makeApi(await requestCookie());

  let users: StaffUserSummary[] = [];
  let error: unknown = null;
  try {
    users = await api.staff.users.list();
  } catch (e) {
    error = e;
  }

  async function issueMagicLinkAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const api = makeApi(await requestCookie());
    try {
      const result = await api.staff.users.issueMagicLink(id);
      const params = new URLSearchParams({
        magic_link: result.magic_link,
        reissued_for: result.owner_email,
      });
      if (result.email_sent) params.set("email_sent", "1");
      if (result.email_error) params.set("email_error", result.email_error);
      redirect("/staff/users?" + params.toString());
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(
        "/staff/users?flashType=err&flash=" + encodeURIComponent(msg),
      );
    }
  }

  async function deleteUserAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const api = makeApi(await requestCookie());
    try {
      await api.staff.users.remove(id);
      redirect(
        "/staff/users?flashType=ok&flash=" +
          encodeURIComponent("Staff-User gelöscht."),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(
        "/staff/users?flashType=err&flash=" + encodeURIComponent(msg),
      );
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Inplicit Staff"
        title="Team"
        muted={`${users.length} aktiv`}
        actions={
          <Link href="/staff/users/new" className="btn btn--primary">
            Staff hinzufügen
          </Link>
        }
      />

      {error && (
        <div className="section">
          <ErrorState error={error} />
        </div>
      )}

      {sp.flash && (
        <div
          className={`flash ${sp.flashType === "err" ? "flash--err" : "flash--ok"} section`}
        >
          {sp.flash}
        </div>
      )}

      {sp.magic_link && (
        <div className="card flash flash--ok section">
          <p className="subtitle" style={{ marginBottom: "var(--space-2)" }}>
            Magic-Link bereit
            {sp.reissued_for && <span className="caption"> für {sp.reissued_for}</span>}
          </p>
          <p className="caption" style={{ marginBottom: "var(--space-3)" }}>
            15 Minuten gültig, single-use.
            {sp.email_sent === "1" ? " Email an den Staff-User wurde verschickt." : ""}
          </p>
          <div className="org-magic-link">
            <a className="mono org-magic-link__a" href={sp.magic_link}>
              {sp.magic_link}
            </a>
          </div>
          {sp.email_error && (
            <p className="caption" style={{ marginTop: "var(--space-3)" }}>
              <strong>Email konnte nicht versendet werden:</strong>{" "}
              <span className="mono">{sp.email_error}</span>
            </p>
          )}
        </div>
      )}

      {!error && users.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">Noch kein zusätzliches Staff-Mitglied.</p>
            <p>
              Du bist aktuell der einzige Account mit Zugriff aufs Back-Office. Lege weitere
              Staff-User an, damit Kollegen Customer-Orgs verwalten können.
            </p>
            <Link
              href="/staff/users/new"
              className="btn btn--primary"
              style={{ marginTop: "var(--space-6)" }}
            >
              Erstes Staff-Mitglied hinzufügen
            </Link>
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="card card--flush">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>E-Mail</th>
                <th>Letzter Login</th>
                <th>Verifiziert</th>
                <th className="table__actions">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td>
                    <span className="mono text-secondary">{u.email}</span>
                  </td>
                  <td className="caption">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleString("de-DE")
                      : "—"}
                  </td>
                  <td>
                    {u.email_verified_at ? (
                      <span className="badge badge--success">Verifiziert</span>
                    ) : (
                      <span className="badge badge--opportunity">Eingeladen</span>
                    )}
                  </td>
                  <td className="table__actions">
                    <form action={issueMagicLinkAction} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        type="submit"
                        className="btn btn--ghost btn--sm"
                        title="Neuen Magic-Link ausgeben"
                      >
                        Magic-Link
                      </button>
                    </form>
                    <form action={deleteUserAction} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        type="submit"
                        className="btn btn--danger btn--sm"
                      >
                        Löschen
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .org-magic-link {
          padding: var(--space-3);
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-ui);
          word-break: break-all;
        }
        .org-magic-link__a { color: var(--color-accent-strong); }
        .org-magic-link__a:hover { text-decoration: underline; }
      `,
        }}
      />
    </>
  );
}
