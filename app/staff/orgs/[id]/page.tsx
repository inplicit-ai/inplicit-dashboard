import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Pencil,
  TriangleAlert,
} from "lucide-react";
import {
  ApiError,
  makeApi,
  type Organization,
  type UpdateOrgInput,
} from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, makeDurationOptions } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/ErrorState";
import { OrgAvatar } from "@/components/OrgAvatar";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

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

  // Org-level locale supports DE/EN only (not the FR interview option).
  const LOCALE_OPTIONS = [
    { value: "de", label: "Deutsch" },
    { value: "en", label: "English" },
  ];
  // Interview duration on the 5-min grid, 10–60 min.
  const DURATION_OPTIONS = makeDurationOptions(10, 60, 5);

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
    // logo_url: only forward when the field was present in the form; an
    // empty string is meaningful — it clears the existing logo.
    const logoRaw = formData.get("logo_url");
    const patch: UpdateOrgInput = {
      name: get("name") || undefined,
      company_context: get("company_context") || undefined,
      industry: get("industry") || undefined,
      default_locale: get("default_locale") || undefined,
      default_voice_id: parseIntOr(get("default_voice_id")),
      default_interview_length_min: parseIntOr(
        get("default_interview_length_min"),
      ),
      logo_url: typeof logoRaw === "string" ? logoRaw.trim() : undefined,
    };
    const api = makeApi(await requestCookie());
    let redirectTo: string;
    try {
      await api.staff.orgs.update(id, patch);
      redirectTo = `/staff/orgs/${id}?updated=1`;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirectTo = `/staff/orgs/${id}?edit=1&error=${encodeURIComponent(msg)}`;
    }
    redirect(redirectTo);
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
        <BackLink />
        {error && <ErrorState error={error} />}
      </>
    );
  }

  const editing = sp.edit === "1";

  return (
    <>
      <BackLink />

      {sp.error && (
        <div className="mb-6">
          <ErrorState error={new Error(sp.error)} />
        </div>
      )}

      {!editing && (
        <div className="grid gap-8 lg:grid-cols-[minmax(240px,300px)_1fr]">
          {/* ── Left rail: sticky identity card + actions ─────────────────── */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
            <Card className="gap-5 p-6">
              <div className="flex items-start gap-3">
                <OrgAvatar name={org.name} logoUrl={org.logo_url} size={44} />
                <div className="min-w-0">
                  <h1 className="text-[length:var(--text-title)] font-semibold leading-tight tracking-[-0.015em] text-fg">
                    {org.name}
                  </h1>
                  <p className="mt-1 font-mono text-[length:var(--text-mono)] text-fg-muted">
                    {org.slug}
                  </p>
                </div>
              </div>

              <StatusBadge status={org.status} withIcon className="self-start" />

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-subtle pt-5 text-[length:var(--text-caption)]">
                <InfoRow label="Sprache" value={(org.default_locale ?? "de").toUpperCase()} />
                <InfoRow
                  label="Interviewdauer"
                  value={`${org.default_interview_length_min ?? "—"} min`}
                />
                <InfoRow label="Voice-ID" value={String(org.default_voice_id ?? "—")} />
                <InfoRow
                  label="Erstellt"
                  value={
                    org.created_at
                      ? new Date(org.created_at).toLocaleDateString("de-DE")
                      : "—"
                  }
                />
              </dl>
            </Card>

            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/staff/orgs/${org.id}?edit=1`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Bearbeiten
                </Link>
              </Button>
              <form action={issueMagicLinkAction}>
                <Button type="submit" size="sm" className="w-full">
                  <KeyRound className="h-3.5 w-3.5" />
                  Magic-Link ausgeben
                </Button>
              </form>
            </div>
          </aside>

          {/* ── Right track: detail sections ──────────────────────────────── */}
          <div className="min-w-0 space-y-8">
            {sp.updated === "1" && (
              <Flash type="ok" message="Organisation aktualisiert." />
            )}
            {sp.suspended === "1" && (
              <Flash type="ok" message="Organisation suspendiert." />
            )}

            {sp.magic_link && (
              <Card className="gap-0 bg-surface-2 p-5">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-accent" />
                  <p className="text-[length:var(--text-body-sm)] font-semibold text-fg">
                    Magic-Link bereit
                    {sp.reissued_for && (
                      <span className="ml-2 font-normal text-fg-muted">
                        für {sp.reissued_for}
                      </span>
                    )}
                  </p>
                </div>
                <p className="mt-2 text-[length:var(--text-caption)] text-fg-muted">
                  15 Minuten gültig, single-use.
                  {sp.email_sent === "1"
                    ? " Eine Email mit dem Link wurde an den Owner verschickt."
                    : ""}
                </p>
                <div className="mt-4 break-all rounded-ui border border-line bg-surface p-3">
                  <a
                    className="font-mono text-[length:var(--text-mono)] text-accent-strong hover:underline"
                    href={sp.magic_link}
                  >
                    {sp.magic_link}
                  </a>
                </div>
                <p className="mt-3 text-[length:var(--text-caption)] text-fg-subtle">
                  Tipp: in einem Inkognito-Tab öffnen, um nicht deine
                  Staff-Session zu überschreiben.
                </p>
              </Card>
            )}

            {sp.email_error && (
              <Card className="gap-0 border-danger/22 bg-danger-soft p-5">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4 text-danger" />
                  <p className="text-[length:var(--text-body-sm)] font-semibold text-danger">
                    Welcome-Email konnte nicht versendet werden
                  </p>
                </div>
                <p className="mt-2 break-all font-mono text-[length:var(--text-mono)] text-fg-muted">
                  {sp.email_error}
                </p>
                <p className="mt-3 text-[length:var(--text-caption)] text-fg-subtle">
                  Häufige Ursachen: <Mono>RESEND_API_KEY</Mono> fehlt,{" "}
                  <Mono>FROM_EMAIL</Mono> nicht domain-verifiziert, oder die
                  Resend-Sandbox erlaubt nur Versand an die Account-Email.
                </p>
              </Card>
            )}

            <Card className="p-6">
              <SectionHeading title="Unternehmenskontext" />
              <p className="text-[length:var(--text-caption)] text-fg-muted">
                Wird in jeden Interview-System-Prompt der Org eingespeist.
                Kampagnes können das pro Kampagne überschreiben.
              </p>
              <p className="mt-4 whitespace-pre-wrap text-[length:var(--text-body-lg)] leading-relaxed text-fg">
                {org.company_context}
              </p>
              {org.industry && (
                <p className="mt-3 text-[length:var(--text-caption)] text-fg-muted">
                  Branche: <Mono>{org.industry}</Mono>
                </p>
              )}
            </Card>

            <Card className="p-6">
              <SectionHeading title="Defaults für neue Kampagnes" />
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <InfoRow label="Sprache" value={(org.default_locale ?? "de").toUpperCase()} />
                <InfoRow
                  label="Interviewdauer"
                  value={`${org.default_interview_length_min ?? "—"} min`}
                />
                <InfoRow label="Voice-ID" value={String(org.default_voice_id ?? "—")} />
                <InfoRow label="Status" value={org.status} />
              </dl>
            </Card>

            <Card className="p-6">
              <SectionHeading title="Metadaten" />
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoRow label="Org-ID" value={org.id} mono />
                <InfoRow label="Slug" value={org.slug} mono />
                <InfoRow
                  label="Erstellt"
                  value={
                    org.created_at
                      ? new Date(org.created_at).toLocaleString("de-DE")
                      : "—"
                  }
                />
                <InfoRow
                  label="Aktualisiert"
                  value={
                    org.updated_at
                      ? new Date(org.updated_at).toLocaleString("de-DE")
                      : "—"
                  }
                />
              </dl>
            </Card>

            <Card className="gap-5 border-danger/22 bg-danger-soft p-6">
              <header className="flex items-start gap-3">
                <span className="grid size-8 place-items-center rounded-ui bg-danger/10 text-danger">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[length:var(--text-subtitle)] font-semibold text-fg">
                    Danger Zone
                  </h2>
                  <p className="text-[length:var(--text-caption)] text-fg-muted">
                    Aktionen mit weitreichenden Folgen. Lesen, dann bewusst
                    ausführen.
                  </p>
                </div>
              </header>

              <DangerRow
                title="Suspendieren"
                description={
                  <>
                    Org-Status auf <Mono>SUSPENDED</Mono>. Bestehende Kampagnes
                    bleiben, aber der Customer kann sich nicht einloggen, bis du
                    sie reaktivierst.
                  </>
                }
              >
                <form action={suspendOrgAction}>
                  <Button type="submit" variant="outline" size="sm">
                    Suspendieren
                  </Button>
                </form>
              </DangerRow>

              <Separator className="bg-danger/20" />

              <DangerRow
                title="Löschen"
                description={
                  <>
                    Soft-Delete. Org wird auf <Mono>DELETED</Mono> markiert und
                    aus den Listen verborgen.
                    <br />
                    <span className="mt-2 block">
                      Zur Bestätigung den Org-Namen exakt eintippen:{" "}
                      <Mono>{org.name}</Mono>
                    </span>
                  </>
                }
              >
                <form
                  action={deleteOrgAction}
                  className="flex min-w-[240px] flex-col gap-2"
                >
                  <Input
                    type="text"
                    name="confirm_name"
                    required
                    placeholder={org.name}
                    autoComplete="off"
                  />
                  <Button type="submit" variant="destructive" size="sm">
                    Endgültig löschen
                  </Button>
                </form>
              </DangerRow>
            </Card>
          </div>
        </div>
      )}

      {editing && (
        <div className="mx-auto max-w-[680px]">
          <PageHeader title={`${org.name} bearbeiten`} />

          <Card className="p-6">
            <form action={updateOrgAction} className="flex flex-col gap-5">
              <Field id="edit-name" label="Name" required>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={org.name}
                  required
                />
              </Field>

              <Field
                id="edit-logo"
                label="Profilbild (URL)"
                hint="Hosted-Image-URL. Leer lassen, um das Logo zu entfernen."
              >
                <div className="flex items-start gap-3">
                  <OrgAvatar name={org.name} logoUrl={org.logo_url} size={56} />
                  <Input
                    id="edit-logo"
                    name="logo_url"
                    type="url"
                    inputMode="url"
                    defaultValue={org.logo_url ?? ""}
                    placeholder="https://cdn.example.com/logo.png"
                    className="flex-1"
                  />
                </div>
              </Field>

              <Field
                id="edit-context"
                label="Unternehmenskontext"
                hint="Wird in jeden Interview-System-Prompt eingespeist."
              >
                <Textarea
                  id="edit-context"
                  name="company_context"
                  rows={6}
                  defaultValue={org.company_context}
                  className="min-h-[150px]"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="edit-industry" label="Branche">
                  <Input
                    id="edit-industry"
                    name="industry"
                    defaultValue={org.industry ?? ""}
                    placeholder="Logistik-SaaS"
                  />
                </Field>
                <Field id="edit-locale" label="Standardsprache">
                  <Select
                    id="edit-locale"
                    name="default_locale"
                    defaultValue={org.default_locale}
                    options={LOCALE_OPTIONS}
                    size="md"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="edit-voice" label="Voice-ID">
                  <Input
                    id="edit-voice"
                    name="default_voice_id"
                    type="number"
                    min={1}
                    defaultValue={String(org.default_voice_id)}
                  />
                </Field>
                <Field id="edit-length" label="Interviewdauer">
                  <Select
                    id="edit-length"
                    name="default_interview_length_min"
                    defaultValue={String(org.default_interview_length_min)}
                    options={DURATION_OPTIONS}
                    size="md"
                  />
                </Field>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Button asChild variant="outline">
                  <Link href={`/staff/orgs/${org.id}`}>Abbrechen</Link>
                </Button>
                <Button type="submit">Speichern</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function BackLink() {
  return (
    <Button asChild variant="link" size="sm" className="mb-4 px-0 text-fg-muted">
      <Link href="/staff/orgs">
        <ArrowLeft className="h-3.5 w-3.5" />
        Organisationen
      </Link>
    </Button>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[length:var(--text-caption)] text-fg-subtle">{label}</dt>
      <dd
        className={cn(
          "break-all text-[length:var(--text-body-sm)] font-medium text-fg",
          mono ? "font-mono text-[length:var(--text-mono)]" : "tabular-nums",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Flash({ type, message }: { type: "ok" | "err"; message: string }) {
  const Icon = type === "ok" ? CheckCircle2 : TriangleAlert;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-ui border px-3.5 py-3 text-[length:var(--text-meta)]",
        type === "ok"
          ? "border-success/20 bg-success-soft text-fg"
          : "border-danger/22 bg-danger-soft text-danger",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          type === "ok" ? "text-success" : "text-danger",
        )}
      />
      <p className="leading-snug">{message}</p>
    </div>
  );
}

function DangerRow({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[1fr_auto]">
      <div>
        <p className="text-[length:var(--text-body-sm)] font-semibold text-fg">
          {title}
        </p>
        <p className="mt-1 text-[length:var(--text-caption)] leading-relaxed text-fg-muted">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-danger">*</span>}
      </Label>
      {hint && (
        <p className="text-[length:var(--text-caption)] text-fg-subtle">{hint}</p>
      )}
      {children}
    </div>
  );
}

function Mono({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <code
      className={cn(
        "rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[length:var(--text-mono)] text-fg",
        className,
      )}
    >
      {children}
    </code>
  );
}

function parseIntOr(s: string): number | undefined {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
