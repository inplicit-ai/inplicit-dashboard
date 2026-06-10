import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, KeyRound, Plus, TriangleAlert, Users } from "lucide-react";
import { ApiError, makeApi, type StaffUserSummary } from "@/lib/api";
import { requireAdmin, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { CardGrid, EntityCard } from "@/components/ui/card-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

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
    let redirectTo: string;
    try {
      const result = await api.staff.users.issueMagicLink(id);
      const params = new URLSearchParams({
        magic_link: result.magic_link,
        reissued_for: result.owner_email,
      });
      if (result.email_sent) params.set("email_sent", "1");
      if (result.email_error) params.set("email_error", result.email_error);
      redirectTo = "/staff/users?" + params.toString();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirectTo = "/staff/users?flashType=err&flash=" + encodeURIComponent(msg);
    }
    redirect(redirectTo);
  }

  async function deleteUserAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const api = makeApi(await requestCookie());
    let redirectTo: string;
    try {
      await api.staff.users.remove(id);
      redirectTo =
        "/staff/users?flashType=ok&flash=" +
        encodeURIComponent("Staff-User gelöscht.");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirectTo = "/staff/users?flashType=err&flash=" + encodeURIComponent(msg);
    }
    redirect(redirectTo);
  }

  return (
    <>
      <PageHeader
        title="Admins"
        subtitle="Inplicit-interne Accounts mit Zugriff auf alle Organisationen."
        actions={
          <Button asChild size="sm">
            <Link href="/staff/users/new">
              <Plus className="h-4 w-4" />
              Admin hinzufügen
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      {sp.magic_link && (
        <MagicLinkPanel
          link={sp.magic_link}
          reissuedFor={sp.reissued_for}
          emailSent={sp.email_sent === "1"}
          emailError={sp.email_error}
        />
      )}

      {!error && users.length === 0 && (
        <EmptyState
          icon={Users}
          title="Noch kein weiterer Admin"
          hint="Du bist aktuell der einzige Account mit Zugriff auf das Back-Office. Füge weitere Admins hinzu, damit Kollegen Organisationen verwalten können."
          action={
            <Button asChild size="sm">
              <Link href="/staff/users/new">
                <Plus className="h-4 w-4" />
                Ersten Admin hinzufügen
              </Link>
            </Button>
          }
        />
      )}

      {users.length > 0 && (
        <CardGrid>
          {users.map((u) => (
            <EntityCard
              key={u.id}
              title={u.name}
              status={
                <StatusBadge
                  status={u.email_verified_at ? "VERIFIED" : "PENDING"}
                  label={u.email_verified_at ? "Verifiziert" : "Eingeladen"}
                  withIcon
                />
              }
              meta={u.email}
              footer={
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="tabular-nums text-fg-subtle">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleDateString("de-DE")
                      : "Noch kein Login"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <form action={issueMagicLinkAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        title="Neuen Magic-Link ausgeben"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Magic-Link
                      </Button>
                    </form>
                    <form action={deleteUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-fg-muted hover:bg-danger-soft hover:text-danger"
                        aria-label={`${u.email} löschen`}
                      >
                        Löschen
                      </Button>
                    </form>
                  </span>
                </div>
              }
            />
          ))}
        </CardGrid>
      )}
    </>
  );
}

function Flash({ type, message }: { type: "ok" | "err"; message: string }) {
  const Icon = type === "ok" ? CheckCircle2 : TriangleAlert;
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-3 rounded-ui border px-3.5 py-3 text-[length:var(--text-meta)]",
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

function MagicLinkPanel({
  link,
  reissuedFor,
  emailSent,
  emailError,
}: {
  link: string;
  reissuedFor?: string;
  emailSent: boolean;
  emailError?: string;
}) {
  return (
    <div className="mb-6 rounded-card border border-line bg-surface-2 p-5 shadow-card">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-accent" />
        <p className="text-[length:var(--text-body-sm)] font-semibold text-fg">
          Magic-Link bereit
          {reissuedFor && (
            <span className="ml-2 font-normal text-fg-muted">für {reissuedFor}</span>
          )}
        </p>
      </div>
      <p className="mt-2 text-[length:var(--text-caption)] text-fg-muted">
        15 Minuten gültig, single-use.
        {emailSent ? " Email an den Staff-User wurde verschickt." : ""}
      </p>
      <div className="mt-4 break-all rounded-ui border border-line bg-surface p-3">
        <a
          className="font-mono text-[length:var(--text-mono)] text-accent-strong hover:underline"
          href={link}
        >
          {link}
        </a>
      </div>
      {emailError && (
        <p className="mt-3 text-[length:var(--text-caption)] text-fg-muted">
          <strong className="text-danger">Email konnte nicht versendet werden:</strong>{" "}
          <span className="font-mono">{emailError}</span>
        </p>
      )}
    </div>
  );
}
