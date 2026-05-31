import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, UserPlus, Users } from "lucide-react";
import { makeApi, type OrgMember, ApiError } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatBand } from "@/components/ui/stat-band";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDisc } from "@/components/ui/status-disc";
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

  const activeCount = members.filter((m) => m.accepted_at).length;
  const pendingCount = members.length - activeCount;

  const columns: DataTableColumn<OrgMember>[] = [
    {
      key: "disc",
      header: "",
      headClassName: "w-[28px]",
      cell: (m) => (
        <StatusDisc state={m.accepted_at ? "done" : "pending"} size="sm" />
      ),
    },
    {
      key: "email",
      header: "E-Mail",
      mono: true,
      cell: (m) => <span className="text-fg-muted">{m.email}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (m) => (
        <StatusBadge
          status={m.accepted_at ? "ACTIVE" : "PENDING"}
          label={m.accepted_at ? "Aktiv" : "Eingeladen"}
        />
      ),
    },
    {
      key: "date",
      header: "Datum",
      numeric: true,
      cell: (m) => (
        <span className="text-fg-muted">
          {m.accepted_at
            ? new Date(m.accepted_at).toLocaleDateString("de-DE")
            : `läuft ab ${new Date(m.expires_at).toLocaleDateString("de-DE")}`}
        </span>
      ),
    },
    {
      key: "action",
      header: "Aktion",
      numeric: true,
      cell: (m) => (
        <form action={removeMember} className="flex justify-end">
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
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Workspace-Mitglieder. Eingeladene Kolleginnen können nur den Insights-Search nutzen, ohne Kampagnes zu verwalten."
      />

      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      {sp.magic_link && (
        <Card className="mb-6 gap-2 border-success/30 bg-success-soft p-5">
          <p className="text-sm font-semibold text-fg">
            Einladungs-Link
            {sp.invited_email && (
              <span className="ml-2 text-xs font-normal text-fg-muted">
                für {sp.invited_email}
              </span>
            )}
          </p>
          <p className="text-xs text-fg-muted">7 Tage gültig, single-use.</p>
          <div className="mt-1 break-all rounded-ui border border-line bg-canvas p-3 font-mono text-xs">
            <a className="text-accent-strong hover:underline" href={sp.magic_link}>
              {sp.magic_link}
            </a>
          </div>
        </Card>
      )}

      <StatBand
        className="mb-8"
        cells={[
          { label: "Mitglieder", value: members.length },
          { label: "Aktiv", value: activeCount },
          { label: "Eingeladen", value: pendingCount },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
        {/* Members track */}
        <div className="min-w-0">
          {listError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-ui border border-pain-muted bg-pain-soft px-3.5 py-2.5 text-sm text-pain">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{listError}</p>
            </div>
          )}

          {!listError && members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Noch keine Mitglieder"
              hint="Lade Kolleginnen ein — sie nutzen den Insights-Search."
            />
          ) : (
            members.length > 0 && (
              <>
                <SectionHeading title="Mitglieder" count={members.length} />
                <Card variant="ledger" className="overflow-hidden">
                  <div className="w-full overflow-x-auto">
                    <DataTable
                      className="min-w-[560px]"
                      columns={columns}
                      rows={members}
                      rowKey={(m) => m.id}
                    />
                  </div>
                </Card>
              </>
            )
          )}
        </div>

        {/* Invite rail */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="gap-4 p-5">
            <div className="space-y-1">
              <h2 className="text-[length:var(--text-subtitle)] font-semibold tracking-[-0.015em] text-fg">
                Mitglied einladen
              </h2>
              <p className="text-xs leading-relaxed text-fg-muted">
                Das Mitglied erhält einen Einladungs-Link per E-Mail und kann
                danach nur den Insights-Search nutzen.
              </p>
            </div>
            <form action={inviteMember} className="flex flex-col gap-3">
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
          </Card>
        </aside>
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
