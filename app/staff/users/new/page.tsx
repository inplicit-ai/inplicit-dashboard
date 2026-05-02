import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiError, makeApi } from "@/lib/api";
import { requireAdmin, requestCookie } from "@/lib/auth";
import { PageHeader } from "@/components/PageChrome";

interface SearchParams {
  error?: string;
  sticky?: string;
}

export default async function NewStaffUserPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const sticky: { email?: string; name?: string } = sp.sticky
    ? JSON.parse(decodeURIComponent(sp.sticky))
    : {};

  async function createStaff(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const name = String(formData.get("name") ?? "").trim();
    const issueLink = formData.get("issue_magic_link") === "on";

    if (!email || !email.includes("@") || !name) {
      const stickyParam = encodeURIComponent(JSON.stringify({ email, name }));
      redirect(
        `/staff/users/new?error=${encodeURIComponent("E-Mail und Name sind Pflicht.")}&sticky=${stickyParam}`,
      );
    }

    const api = makeApi(await requestCookie());
    let redirectTo: string;
    try {
      const result = await api.staff.users.create({
        email,
        name,
        issue_magic_link: issueLink,
      });
      const params = new URLSearchParams({
        flashType: "ok",
        flash: `Staff-User ${email} angelegt.`,
      });
      if (result.magic_link) params.set("magic_link", result.magic_link);
      if (result.user.email) params.set("reissued_for", result.user.email);
      if (result.email_sent) params.set("email_sent", "1");
      if (result.email_error) params.set("email_error", result.email_error);
      redirectTo = "/staff/users?" + params.toString();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      const stickyParam = encodeURIComponent(JSON.stringify({ email, name }));
      redirectTo = `/staff/users/new?error=${encodeURIComponent(msg)}&sticky=${stickyParam}`;
    }
    redirect(redirectTo);
  }

  return (
    <div className="new-org">
      <Link href="/staff/users" className="btn btn--link new-org__back">
        ← Team
      </Link>

      <PageHeader
        eyebrow="Inplicit Staff"
        title="Staff hinzufügen"
        muted="Magic-Link Login"
      />

      {sp.error && <div className="flash flash--err section">{sp.error}</div>}

      <form action={createStaff} className="card new-org__form">
        <p className="caption">
          Neuer Staff-User bekommt einen Magic-Link per Email (15 Min gültig). Die Person
          loggt sich damit ein und nutzt für jeden weiteren Login ebenfalls den
          Magic-Link-Flow. Passwort gibt's nur für dich als Admin.
        </p>

        <label className="field">
          <span className="field__label">Name *</span>
          <input
            name="name"
            required
            className="input"
            placeholder="Max Mustermann"
            defaultValue={sticky.name ?? ""}
          />
        </label>

        <label className="field">
          <span className="field__label">E-Mail *</span>
          <input
            name="email"
            type="email"
            required
            className="input"
            placeholder="max@inplicit.ai"
            defaultValue={sticky.email ?? ""}
            autoComplete="off"
          />
        </label>

        <label className="field new-org__check">
          <input type="checkbox" name="issue_magic_link" defaultChecked />
          <span>
            Magic-Link sofort ausgeben{" "}
            <span className="caption">
              Empfehlung. Wenn ausgeschaltet, kannst du den Link später aus der Liste
              ausstellen.
            </span>
          </span>
        </label>

        <button type="submit" className="btn btn--primary btn--lg new-org__submit">
          Staff anlegen
        </button>
      </form>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .new-org { max-width: 540px; margin: 0 auto; }
        .new-org__back { margin-bottom: var(--space-6); display: inline-block; }
        .new-org__form { display: flex; flex-direction: column; gap: var(--space-5); }
        .new-org__check { flex-direction: row; align-items: flex-start; gap: var(--space-3); }
        .new-org__check input { margin-top: 4px; }
        .new-org__submit { width: 100%; margin-top: var(--space-3); }
      `,
        }}
      />
    </div>
  );
}
