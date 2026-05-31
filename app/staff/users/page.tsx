import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { ApiError, makeApi, type StaffUserSummary } from "@/lib/api";
import { requireAdmin, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { Folio } from "@/components/ui/folio";
import { InstrumentBand } from "@/components/ui/instrument-band";
import { Ledger } from "@/components/ui/ledger";
import { LedgerRow } from "@/components/ui/ledger-row";
import { DataChip } from "@/components/ui/data-chip";
import { SpecBlock } from "@/components/ui/spec-block";
import { StatusDisc } from "@/components/ui/status-disc";
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

  const verified = users.filter((u) => u.email_verified_at).length;
  const invited = users.length - verified;

  return (
    <>
      <Folio
        index="§"
        label="Team"
        count={users.length}
        action={
          <Button asChild size="sm">
            <Link href="/staff/users/new">
              <Plus className="h-4 w-4" />
              Staff hinzufügen
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="mt-6">
          <ErrorState error={error} />
        </div>
      )}

      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      {sp.magic_link && (
        <div className="mt-6 rounded-card border border-line bg-surface-2 p-5">
          <div className="flex items-center gap-2.5">
            <StatusDisc state="live" />
            <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg">
              Magic-Link bereit
              {sp.reissued_for && (
                <span className="ml-2 lowercase tracking-normal text-fg-muted">
                  für {sp.reissued_for}
                </span>
              )}
            </p>
          </div>
          <p className="mt-2 text-caption text-fg-muted">
            15 Minuten gültig, single-use.
            {sp.email_sent === "1"
              ? " Email an den Staff-User wurde verschickt."
              : ""}
          </p>
          <div className="mt-4 break-all rounded-ui border border-line bg-canvas p-3 font-mono font-mono tabular-nums tabular-nums">
            <a className="text-accent-strong hover:underline" href={sp.magic_link}>
              {sp.magic_link}
            </a>
          </div>
          {sp.email_error && (
            <p className="mt-3 text-caption text-fg-muted">
              <strong className="text-danger">Email konnte nicht versendet werden:</strong>{" "}
              <span className="font-mono">{sp.email_error}</span>
            </p>
          )}
        </div>
      )}

      {users.length > 0 && (
        <div className="mt-6">
          <InstrumentBand
            cells={[
              { label: "Staff", value: users.length },
              { label: "Verifiziert", value: verified },
              { label: "Eingeladen", value: invited },
            ]}
          />
        </div>
      )}

      {!error && users.length === 0 && (
        <div className="mt-6 max-w-[68ch] overflow-hidden rounded-card border border-dashed border-line-strong bg-surface">
          <div className="flex flex-col gap-4 px-8 py-12">
            <span className="flex items-center gap-2.5">
              <StatusDisc state="idle" />
              <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                Kein zusätzliches Staff-Mitglied
              </span>
            </span>
            <p className="body-lg max-w-[52ch] text-fg-muted">
              Du bist aktuell der einzige Account mit Zugriff aufs Back-Office.
              Lege weitere Staff-User an, damit Kollegen Customer-Orgs verwalten
              können.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-1 self-start">
              <Link href="/staff/users/new">
                <Plus className="h-4 w-4" />
                Erstes Staff-Mitglied hinzufügen
              </Link>
            </Button>
          </div>
        </div>
      )}

      {users.length > 0 && (
        <Ledger framed className="mt-8">
          {users.map((u) => (
            <LedgerRow
              key={u.id}
              status={u.email_verified_at ? "verified" : "pending"}
              index={u.email}
              title={u.name}
              expandable
              metric={
                u.email_verified_at ? (
                  <DataChip tone="success">Verifiziert</DataChip>
                ) : (
                  <DataChip tone="warning">Eingeladen</DataChip>
                )
              }
            >
              <div className="flex flex-col gap-4 py-1">
                <SpecBlock
                  rows={[
                    { label: "E-Mail", value: u.email },
                    {
                      label: "Letzter Login",
                      value: u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString("de-DE")
                        : "—",
                    },
                    {
                      label: "Verifiziert",
                      value: u.email_verified_at ? "ja" : "nein",
                    },
                  ]}
                />
                <div className="flex items-center gap-2">
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
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              </div>
            </LedgerRow>
          ))}
        </Ledger>
      )}
    </>
  );
}

function Flash({ type, message }: { type: "ok" | "err"; message: string }) {
  return (
    <div
      role="status"
      className={cn(
        "mt-6 grid grid-cols-[20px_1fr] items-start gap-x-2.5 rounded-ui border px-3.5 py-2.5 text-meta",
        type === "ok"
          ? "border-line-subtle bg-surface-2 text-fg"
          : "border-danger/22 bg-danger-soft text-danger",
      )}
    >
      <span className="flex justify-center pt-0.5">
        <StatusDisc state={type === "ok" ? "done" : "error"} size="sm" />
      </span>
      <p className="leading-snug">{message}</p>
    </div>
  );
}
