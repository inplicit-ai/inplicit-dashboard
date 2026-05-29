import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, UserPlus, Users } from "lucide-react";
import { makeApi, type OrgMember, ApiError } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageChrome";
import { cn } from "@/lib/utils";

interface SearchParams {
  flash?: string;
  flashType?: "ok" | "err";
  magic_link?: string;
  invited_email?: string;
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOrgOwner();
  const sp = await searchParams;
  const api = makeApi(await requestCookie());

  let members: OrgMember[] = [];
  let listError: string | null = null;
  try {
    members = await api.orgMembers.list();
  } catch (e) {
    listError =
      e instanceof ApiError
        ? e.message
        : "Mitgliederliste konnte nicht geladen werden.";
  }

  async function inviteMember(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      redirect(
        "/campaigns/team?flashType=err&flash=" +
          encodeURIComponent("Bitte eine gültige E-Mail-Adresse eingeben."),
      );
    }
    const cookie = await requestCookie();
    const api = makeApi(cookie);
    try {
      const result = await api.orgMembers.invite(email);
      const params = new URLSearchParams({
        flashType: "ok",
        flash: `Einladung an ${email} verschickt.`,
        invited_email: email,
      });
      if (result.magic_link) params.set("magic_link", result.magic_link);
      revalidatePath("/campaigns/team");
      redirect("/campaigns/team?" + params.toString());
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(
        "/campaigns/team?flashType=err&flash=" + encodeURIComponent(msg),
      );
    }
  }

  async function removeMember(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const cookie = await requestCookie();
    const api = makeApi(cookie);
    try {
      await api.orgMembers.remove(id);
      revalidatePath("/campaigns/team");
      redirect(
        "/campaigns/team?flashType=ok&flash=" +
          encodeURIComponent("Mitglied entfernt."),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(
        "/campaigns/team?flashType=err&flash=" + encodeURIComponent(msg),
      );
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Team"
        muted={`${members.length} Mitglied${members.length === 1 ? "" : "er"}`}
      />

      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      {sp.magic_link && (
        <div className="mb-6 rounded-card border border-success/30 bg-success-soft p-5">
          <p className="text-sm font-semibold text-fg">
            Einladungs-Link
            {sp.invited_email && (
              <span className="ml-2 text-xs font-normal text-fg-muted">
                für {sp.invited_email}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-fg-muted">7 Tage gültig, single-use.</p>
          <div className="mt-3 break-all rounded-ui border border-line bg-canvas p-3 font-mono text-xs">
            <a
              className="text-accent-strong hover:underline"
              href={sp.magic_link}
            >
              {sp.magic_link}
            </a>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card card--compact lg:col-span-1">
          <p className="text-sm font-semibold text-fg">Mitglied einladen</p>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">
            Das Mitglied erhält einen Einladungs-Link per E-Mail und kann
            danach nur den Insights-Search nutzen.
          </p>
          <form action={inviteMember} className="mt-4 flex flex-col gap-3">
            <Input
              name="email"
              type="email"
              required
              placeholder="kollegin@firma.de"
              className="text-sm"
            />
            <Button type="submit" size="sm" className="w-full">
              <UserPlus className="h-4 w-4" />
              Einladen
            </Button>
          </form>
        </div>

        <div className="lg:col-span-2">
          {listError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-ui border border-pain-muted bg-pain-soft px-3.5 py-2.5 text-sm text-pain">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{listError}</p>
            </div>
          )}

          {!listError && members.length === 0 && (
            <div className="card border-dashed">
              <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
                  <Users className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-fg">
                    Noch keine Mitglieder eingeladen.
                  </p>
                  <p className="max-w-[44ch] text-xs leading-relaxed text-fg-muted">
                    Lade Kolleginnen ein — sie können den Insights-Search
                    nutzen, ohne Kampagnes verwalten zu müssen.
                  </p>
                </div>
              </div>
            </div>
          )}

          {members.length > 0 && (
            <div className="card card--flush">
              <Table>
                <TableHeader>
                  <TableRow className="border-line-subtle bg-surface-2 hover:bg-surface-2">
                    <TableHead className="px-4 py-3 text-fg-muted">
                      E-Mail
                    </TableHead>
                    <TableHead className="px-4 py-3 text-fg-muted">
                      Status
                    </TableHead>
                    <TableHead className="px-4 py-3 text-fg-muted">
                      Datum
                    </TableHead>
                    <TableHead className="w-[88px] px-4 py-3 text-right text-fg-muted">
                      Aktion
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow
                      key={m.id}
                      className="border-line-subtle hover:bg-surface-2"
                    >
                      <TableCell className="px-4 py-3 font-mono text-xs text-fg-muted">
                        {m.email}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <StatusBadge
                          status={m.accepted_at ? "ACTIVE" : "PENDING"}
                          label={m.accepted_at ? "Aktiv" : "Eingeladen"}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-fg-muted">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="font-mono tabular-nums">
                            {m.accepted_at
                              ? new Date(m.accepted_at).toLocaleDateString(
                                  "de-DE",
                                )
                              : `läuft ab ${new Date(m.expires_at).toLocaleDateString("de-DE")}`}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <form action={removeMember}>
                          <input type="hidden" name="id" value={m.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-fg-muted hover:bg-pain-soft hover:text-pain"
                          >
                            Entfernen
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
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
          : "border-pain-muted bg-pain-soft text-pain",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-snug">{message}</p>
    </div>
  );
}
