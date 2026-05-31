import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { ApiError, makeApi } from "@/lib/api";
import { requireAdmin, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="grid gap-8 lg:grid-cols-[minmax(220px,260px)_1fr]">
      {/* ── Left rail: intent + spec ──────────────────────────────────────── */}
      <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
        <Button asChild variant="link" size="sm" className="px-0 text-fg-muted">
          <Link href="/staff/users">
            <ArrowLeft className="h-3.5 w-3.5" />
            Team
          </Link>
        </Button>

        <div>
          <h1 className="text-[length:var(--text-display)] font-semibold leading-[1.15] tracking-[-0.02em] text-fg">
            Staff hinzufügen
          </h1>
          <p className="mt-2 text-[length:var(--text-body-lg)] text-fg-muted">
            Login per Magic-Link.
          </p>
        </div>

        <Card className="gap-0 p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[length:var(--text-caption)]">
            <InfoRow label="Login" value="Magic-Link" />
            <InfoRow label="Gültig" value="15 min" />
            <InfoRow label="Passwort" value="nur Admin" />
          </dl>
        </Card>
      </aside>

      {/* ── Right track: the form ─────────────────────────────────────────── */}
      <div className="min-w-0 max-w-[540px]">
        {sp.error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-ui border border-danger/22 bg-danger-soft px-3.5 py-3 text-[length:var(--text-meta)] text-danger"
          >
            <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="leading-snug">{sp.error}</p>
          </div>
        )}

        <Card className="p-8">
          <form action={createStaff} className="flex flex-col gap-5">
            <p className="text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted">
              Neuer Staff-User bekommt einen Magic-Link per Email (15 Min
              gültig). Die Person loggt sich damit ein und nutzt für jeden
              weiteren Login ebenfalls den Magic-Link-Flow. Passwort gibt&apos;s
              nur für dich als Admin.
            </p>

            <Field id="staff-name" label="Name" required>
            <Input
              id="staff-name"
              name="name"
              required
              placeholder="Max Mustermann"
              defaultValue={sticky.name ?? ""}
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
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-ui border border-line bg-surface p-4 text-[length:var(--text-body-sm)] text-fg transition-colors hover:border-line-strong hover:bg-surface-2">
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
              <span className="block text-[length:var(--text-caption)] text-fg-muted">
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
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="font-medium tabular-nums text-fg">{value}</dd>
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
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-danger">*</span>}
      </Label>
      {children}
    </div>
  );
}
