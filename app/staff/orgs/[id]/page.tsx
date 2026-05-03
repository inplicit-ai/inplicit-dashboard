import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Pencil,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/ErrorState";
import { Eyebrow, PageHeader, StatusBadge } from "@/components/PageChrome";
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
      default_interview_length_min: parseIntOr(
        get("default_interview_length_min"),
      ),
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
        <>
          <PageHeader
            eyebrow="Organisation"
            title={org.name}
            muted={org.slug}
            meta={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <StatusBadge status={org.status} />
                <span className="text-xs text-fg-muted">
                  {org.default_locale.toUpperCase()} ·{" "}
                  {org.default_interview_length_min} Min · Voice{" "}
                  {org.default_voice_id}
                </span>
              </span>
            }
            actions={
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/staff/orgs/${org.id}?edit=1`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Bearbeiten
                  </Link>
                </Button>
                <form action={issueMagicLinkAction}>
                  <Button type="submit" size="sm">
                    <KeyRound className="h-3.5 w-3.5" />
                    Magic-Link ausgeben
                  </Button>
                </form>
              </>
            }
          />

          {sp.updated === "1" && (
            <Flash type="ok" message="Organisation aktualisiert." />
          )}
          {sp.suspended === "1" && (
            <Flash type="ok" message="Organisation suspendiert." />
          )}

          {sp.magic_link && (
            <Card className="mb-6 rounded-card border-success/30 bg-success-soft/40 p-5">
              <p className="text-base font-semibold text-fg">
                Magic-Link bereit
                {sp.reissued_for && (
                  <span className="ml-2 text-xs font-normal text-fg-muted">
                    für {sp.reissued_for}
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                15 Minuten gültig, single-use.
                {sp.email_sent === "1"
                  ? " Eine Email mit dem Link wurde an den Owner verschickt."
                  : ""}
              </p>
              <div className="mt-3 break-all rounded-ui border border-line bg-canvas p-3 font-mono text-xs">
                <a
                  className="text-accent-strong hover:underline"
                  href={sp.magic_link}
                >
                  {sp.magic_link}
                </a>
              </div>
              <p className="mt-3 text-xs text-fg-subtle">
                Tipp: in einem Inkognito-Tab öffnen, um nicht deine
                Staff-Session zu überschreiben.
              </p>
            </Card>
          )}

          {sp.email_error && (
            <Card className="mb-6 rounded-card border-pain/30 bg-pain-soft/40 p-5">
              <p className="text-base font-semibold text-pain">
                Welcome-Email konnte nicht versendet werden
              </p>
              <p className="mt-2 break-all font-mono text-xs text-fg-muted">
                {sp.email_error}
              </p>
              <p className="mt-3 text-xs text-fg-subtle">
                Häufige Ursachen: <Mono>RESEND_API_KEY</Mono> fehlt,{" "}
                <Mono>FROM_EMAIL</Mono> nicht domain-verifiziert, oder die
                Resend-Sandbox erlaubt nur Versand an die Account-Email.
              </p>
            </Card>
          )}

          <Card className="mb-6 rounded-card border-line bg-surface p-6">
            <Eyebrow>Unternehmenskontext</Eyebrow>
            <p className="mt-3 text-xs text-fg-muted">
              Wird in jeden Interview-System-Prompt der Org eingespeist. Audits
              können das pro Audit überschreiben.
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg">
              {org.company_context}
            </p>
            {org.industry && (
              <p className="mt-3 text-xs text-fg-muted">
                Branche: <Mono>{org.industry}</Mono>
              </p>
            )}
          </Card>

          <Card className="mb-6 rounded-card border-line bg-surface p-6">
            <Eyebrow>Defaults für neue Audits</Eyebrow>
            <DefList className="mt-4">
              <DefRow label="Sprache" value={org.default_locale.toUpperCase()} />
              <DefRow
                label="Interviewdauer"
                value={`${org.default_interview_length_min} Minuten`}
              />
              <DefRow
                label="ElevenLabs Voice-ID"
                value={<Mono>{org.default_voice_id}</Mono>}
              />
              <DefRow label="Status" value={<StatusBadge status={org.status} />} />
            </DefList>
          </Card>

          <Card className="mb-6 rounded-card border-line bg-surface p-6">
            <Eyebrow>Metadaten</Eyebrow>
            <DefList className="mt-4">
              <DefRow
                label="Org-ID"
                value={<Mono className="text-[10px]">{org.id}</Mono>}
              />
              <DefRow label="Slug" value={<Mono>{org.slug}</Mono>} />
              <DefRow
                label="Erstellt"
                value={
                  org.created_at
                    ? new Date(org.created_at).toLocaleString("de-DE")
                    : "—"
                }
              />
              <DefRow
                label="Aktualisiert"
                value={
                  org.updated_at
                    ? new Date(org.updated_at).toLocaleString("de-DE")
                    : "—"
                }
              />
            </DefList>
          </Card>

          <Card className="rounded-card border-pain/30 bg-pain-soft/30 p-6">
            <header className="mb-5 flex items-start gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-pain/15 text-pain">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-fg">
                  Danger Zone
                </h2>
                <p className="text-xs text-fg-muted">
                  Aktionen mit weitreichenden Folgen. Lesen, dann bewusst
                  ausführen.
                </p>
              </div>
            </header>

            <DangerRow
              title="Suspendieren"
              description={
                <>
                  Org-Status auf <Mono>SUSPENDED</Mono>. Bestehende Audits
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

            <Separator className="my-5 bg-pain/20" />

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
                  className="h-10"
                />
                <Button type="submit" variant="destructive" size="sm">
                  Endgültig löschen
                </Button>
              </form>
            </DangerRow>
          </Card>
        </>
      )}

      {editing && (
        <>
          <PageHeader
            eyebrow="Bearbeiten"
            title={org.name}
            muted={org.slug}
          />

          <Card className="rounded-card border-line bg-surface p-6">
            <form action={updateOrgAction} className="flex flex-col gap-5">
              <Field id="edit-name" label="Name" required>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={org.name}
                  required
                  className="h-11 text-base md:text-sm"
                />
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
                  className="min-h-[150px] text-base md:text-sm"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="edit-industry" label="Branche">
                  <Input
                    id="edit-industry"
                    name="industry"
                    defaultValue={org.industry ?? ""}
                    placeholder="Logistik-SaaS"
                    className="h-11 text-base md:text-sm"
                  />
                </Field>
                <Field id="edit-locale" label="Standardsprache">
                  <NativeSelect
                    id="edit-locale"
                    name="default_locale"
                    defaultValue={org.default_locale}
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                  </NativeSelect>
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
                    className="h-11 font-mono text-base md:text-sm"
                  />
                </Field>
                <Field id="edit-length" label="Interviewdauer (Min)">
                  <Input
                    id="edit-length"
                    name="default_interview_length_min"
                    type="number"
                    min={10}
                    max={60}
                    defaultValue={String(org.default_interview_length_min)}
                    className="h-11 text-base md:text-sm"
                  />
                </Field>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Button asChild variant="accent">
                  <Link href={`/staff/orgs/${org.id}`}>Abbrechen</Link>
                </Button>
                <Button type="submit">Speichern</Button>
              </div>
            </form>
          </Card>
        </>
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

function Flash({ type, message }: { type: "ok" | "err"; message: string }) {
  const Icon = type === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-2.5 rounded-ui border px-3.5 py-2.5 text-sm",
        type === "ok"
          ? "border-success/30 bg-success-soft text-success"
          : "border-pain/30 bg-pain-soft text-pain",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-snug">{message}</p>
    </div>
  );
}

function DefList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4",
        className,
      )}
    >
      {children}
    </dl>
  );
}

function DefRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </dt>
      <dd className="m-0 text-sm font-medium text-fg">{value}</dd>
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
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
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
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium text-fg-muted"
      >
        {label}
        {required && <span className="text-pain">*</span>}
      </label>
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
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
        "rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg",
        className,
      )}
    >
      {children}
    </code>
  );
}

function NativeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "flex h-11 w-full appearance-none rounded-ui border border-line bg-canvas px-3 py-2 pr-8 text-base text-fg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%221.75%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-[position:right_0.625rem_center] bg-[size:1rem] bg-no-repeat",
        className,
      )}
    />
  );
}

function parseIntOr(s: string): number | undefined {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
