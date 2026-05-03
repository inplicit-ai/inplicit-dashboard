import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { ApiError, makeApi } from "@/lib/api";
import { requireAdmin, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <div className="mx-auto max-w-[540px]">
      <Button asChild variant="link" size="sm" className="mb-4 px-0 text-fg-muted">
        <Link href="/staff/users">
          <ArrowLeft className="h-3.5 w-3.5" />
          Team
        </Link>
      </Button>

      <PageHeader
        eyebrow="Inplicit Staff"
        title="Staff hinzufügen"
        muted="Magic-Link Login"
      />

      {sp.error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-ui border border-pain/30 bg-pain-soft px-3.5 py-2.5 text-sm text-pain"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-snug">{sp.error}</p>
        </div>
      )}

      <Card className="rounded-card border-line bg-surface p-6">
        <form action={createStaff} className="flex flex-col gap-5">
          <p className="text-sm text-fg-muted">
            Neuer Staff-User bekommt einen Magic-Link per Email (15 Min gültig).
            Die Person loggt sich damit ein und nutzt für jeden weiteren Login
            ebenfalls den Magic-Link-Flow. Passwort gibt&apos;s nur für dich als
            Admin.
          </p>

          <Field id="staff-name" label="Name" required>
            <Input
              id="staff-name"
              name="name"
              required
              placeholder="Max Mustermann"
              defaultValue={sticky.name ?? ""}
              className="h-11 text-base md:text-sm"
            />
          </Field>

          <Field id="staff-email" label="E-Mail" required>
            <Input
              id="staff-email"
              name="email"
              type="email"
              required
              placeholder="max@inplicit.ai"
              defaultValue={sticky.email ?? ""}
              autoComplete="off"
              className="h-11 text-base md:text-sm"
            />
          </Field>

          <label className="flex items-start gap-3 rounded-ui border border-line bg-canvas p-3.5 text-sm text-fg">
            <input
              type="checkbox"
              name="issue_magic_link"
              defaultChecked
              className="mt-0.5 size-4 cursor-pointer rounded-sm border-line accent-accent"
            />
            <span className="space-y-0.5">
              <span className="block font-medium">
                Magic-Link sofort ausgeben
              </span>
              <span className="block text-xs text-fg-muted">
                Empfehlung. Wenn ausgeschaltet, kannst du den Link später aus
                der Liste ausstellen.
              </span>
            </span>
          </label>

          <Button type="submit" size="lg" className="w-full">
            Staff anlegen
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium text-fg-muted"
      >
        {label}
        {required && <span className="text-pain">*</span>}
      </label>
      {children}
    </div>
  );
}
