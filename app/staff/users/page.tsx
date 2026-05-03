import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, Plus, Trash2, Users } from "lucide-react";
import { ApiError, makeApi, type StaffUserSummary } from "@/lib/api";
import { requireAdmin, requestCookie } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageChrome";
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
        eyebrow="Inplicit Staff"
        title="Team"
        muted={`${users.length} aktiv`}
        actions={
          <Button asChild size="sm">
            <Link href="/staff/users/new">
              <Plus className="h-4 w-4" />
              Staff hinzufügen
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
              ? " Email an den Staff-User wurde verschickt."
              : ""}
          </p>
          <div className="mt-3 break-all rounded-ui border border-line bg-canvas p-3 font-mono text-xs">
            <a className="text-accent-strong hover:underline" href={sp.magic_link}>
              {sp.magic_link}
            </a>
          </div>
          {sp.email_error && (
            <p className="mt-3 text-xs text-fg-muted">
              <strong className="text-pain">Email konnte nicht versendet werden:</strong>{" "}
              <span className="font-mono">{sp.email_error}</span>
            </p>
          )}
        </Card>
      )}

      {!error && users.length === 0 && (
        <Card className="rounded-card border-dashed bg-surface/40 p-10">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-fg">
                Noch kein zusätzliches Staff-Mitglied.
              </p>
              <p className="max-w-[52ch] text-sm text-fg-muted">
                Du bist aktuell der einzige Account mit Zugriff aufs Back-Office.
                Lege weitere Staff-User an, damit Kollegen Customer-Orgs verwalten
                können.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/staff/users/new">
                <Plus className="h-4 w-4" />
                Erstes Staff-Mitglied hinzufügen
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {users.length > 0 && (
        <Card className="overflow-hidden p-0">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-surface/40 hover:bg-surface/40">
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Letzter Login</TableHead>
                <TableHead>Verifiziert</TableHead>
                <TableHead className="w-[260px] text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-fg-muted">
                      {u.email}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-fg-muted">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleString("de-DE")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {u.email_verified_at ? (
                      <Badge className="bg-success-soft text-success border-transparent">
                        Verifiziert
                      </Badge>
                    ) : (
                      <Badge className="bg-accent-soft text-accent-strong border-accent-muted">
                        Eingeladen
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
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
                          className="text-fg-muted hover:bg-pain-soft hover:text-pain"
                          aria-label={`${u.email} löschen`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
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
