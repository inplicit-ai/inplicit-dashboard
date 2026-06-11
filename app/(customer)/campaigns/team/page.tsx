import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertCircle, CheckCircle2, Crown, UserPlus, Users } from "lucide-react";
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
  const { me } = await requireOrgOwner();
  const sp = await searchParams;
  const api = makeApi(await requestCookie());
  const t = await getTranslations("team");

  let members: OrgMember[] = [];
  let listError: string | null = null;
  try {
    members = await api.orgMembers.list();
  } catch (e) {
    listError =
      e instanceof ApiError ? e.message : t("errorList");
  }

  async function inviteMember(formData: FormData) {
    "use server";
    const t2 = await getTranslations("team");
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      redirect(
        "/campaigns/team?flashType=err&flash=" +
          encodeURIComponent(t2("errorEmail")),
      );
    }
    const cookie = await requestCookie();
    const api2 = makeApi(cookie);
    try {
      const result = await api2.orgMembers.invite(email);
      const params = new URLSearchParams({
        flashType: "ok",
        flash: t2("flashInvited", { email }),
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
    const t2 = await getTranslations("team");
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const cookie = await requestCookie();
    const api2 = makeApi(cookie);
    try {
      await api2.orgMembers.remove(id);
      revalidatePath("/campaigns/team");
      redirect(
        "/campaigns/team?flashType=ok&flash=" +
          encodeURIComponent(t2("flashRemoved")),
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

  // Owner row rendered separately at the top of the table.
  // We re-use OrgMember shape with a sentinel id so the table key stays stable.
  const ownerRow: OrgMember = {
    id: "__owner__",
    email: me.email,
    accepted_at: me.last_login_at ?? new Date().toISOString(),
    expires_at: "",
    created_at: "",
  };

  const columns: DataTableColumn<OrgMember>[] = [
    {
      key: "disc",
      header: "",
      headClassName: "w-[28px]",
      cell: (m) =>
        m.id === "__owner__" ? (
          <Crown className="h-3.5 w-3.5 text-fg-muted" aria-hidden />
        ) : (
          <StatusDisc state={m.accepted_at ? "done" : "pending"} size="sm" />
        ),
    },
    {
      key: "email",
      header: t("colEmail"),
      mono: true,
      cell: (m) => (
        <span className={cn("text-fg-muted", m.id === "__owner__" && "font-medium text-fg")}>
          {m.email}
        </span>
      ),
    },
    {
      key: "status",
      header: t("colStatus"),
      cell: (m) =>
        m.id === "__owner__" ? (
          <StatusBadge status="ACTIVE" label={t("statusOwner")} />
        ) : (
          <StatusBadge
            status={m.accepted_at ? "ACTIVE" : "PENDING"}
            label={m.accepted_at ? t("statusActive") : t("statusInvited")}
          />
        ),
    },
    {
      key: "date",
      header: t("colDate"),
      numeric: true,
      cell: (m) => {
        if (m.id === "__owner__") return null;
        return (
          <span className="text-fg-muted">
            {m.accepted_at
              ? t("joinedAt", {
                  date: new Date(m.accepted_at).toLocaleDateString(),
                })
              : t("expiresAt", {
                  date: new Date(m.expires_at).toLocaleDateString(),
                })}
          </span>
        );
      },
    },
    {
      key: "action",
      header: t("colAction"),
      numeric: true,
      cell: (m) => {
        if (m.id === "__owner__") return null;
        return (
          <form action={removeMember} className="flex justify-end">
            <input type="hidden" name="id" value={m.id} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-xs text-fg-muted hover:bg-pain-soft hover:text-pain"
            >
              {t("btnRemove")}
            </Button>
          </form>
        );
      },
    },
  ];

  // Owner always first, then invited members.
  const allRows: OrgMember[] = [ownerRow, ...members];

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
      />

      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      {sp.magic_link && (
        <Card className="mb-6 gap-2 border-success/30 bg-success-soft p-5">
          <p className="text-sm font-semibold text-fg">
            {t("inviteLinkTitle")}
            {sp.invited_email && (
              <span className="ml-2 text-xs font-normal text-fg-muted">
                {t("inviteLinkFor", { email: sp.invited_email })}
              </span>
            )}
          </p>
          <p className="text-xs text-fg-muted">{t("inviteLinkValidity")}</p>
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
          { label: t("statMembers"), value: members.length + 1 /* +1 for owner */ },
          { label: t("statActive"), value: activeCount + 1 },
          { label: t("statInvited"), value: pendingCount },
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

          {!listError && (
            <>
              <SectionHeading title={t("sectionMembers")} count={allRows.length} />
              <Card variant="ledger" className="overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <DataTable
                    className="min-w-[560px]"
                    columns={columns}
                    rows={allRows}
                    rowKey={(m) => m.id}
                  />
                </div>
              </Card>
            </>
          )}

          {!listError && members.length === 0 && (
            <p className="mt-4 text-sm text-fg-muted">
              <Users className="mr-1.5 inline h-4 w-4 align-middle" />
              {t("emptyHint")}
            </p>
          )}
        </div>

        {/* Invite rail */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="gap-4 p-5">
            <div className="space-y-1">
              <h2 className="text-[length:var(--text-subtitle)] font-semibold tracking-[-0.015em] text-fg">
                {t("inviteTitle")}
              </h2>
              <p className="text-xs leading-relaxed text-fg-muted">
                {t("inviteHint")}
              </p>
            </div>
            <form action={inviteMember} className="flex flex-col gap-3">
              <Input
                name="email"
                type="email"
                required
                placeholder={t("invitePlaceholder")}
                className="text-sm"
              />
              <Button type="submit" size="sm" className="w-full">
                <UserPlus className="h-4 w-4" />
                {t("inviteBtn")}
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
