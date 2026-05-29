import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Users, Plug, Vault as VaultIcon } from "lucide-react";
import { makeApi, type OrgMember } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
import { PageHeader } from "@/components/PageChrome";
import { StatsCard, StatsRow } from "@/components/StatsCard";

// O-8: Org Admin (doc 06 §5). Consolidates org settings, members and RBAC into
// one surface. ORG_OWNER only. Most actions live on the linked surfaces (Team,
// Integrations, Settings dialog) — this is the hub.
export default async function AdminPage() {
  const { me } = await requireOrgOwner();
  const t = await getTranslations("orgAdmin");
  const api = makeApi(await requestCookie());

  let members: OrgMember[] = [];
  try {
    members = await api.orgMembers.list();
  } catch {
    members = [];
  }

  const tiles: Array<{
    href: string;
    icon: typeof Users;
    title: string;
    body: string;
  }> = [
    {
      href: "/campaigns/team",
      icon: Users,
      title: t("membersTitle"),
      body: t("membersBody"),
    },
    {
      href: "/vaults",
      icon: VaultIcon,
      title: t("vaultsTitle"),
      body: t("vaultsBody"),
    },
    {
      href: "/integrations",
      icon: Plug,
      title: t("integrationsTitle"),
      body: t("integrationsBody"),
    },
  ];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} meta={me.email} />

      <StatsRow>
        <StatsCard label={t("statSeats")} value={members.length} />
        <StatsCard label={t("statRole")} value={t("roleOwner")} />
      </StatsRow>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="card card--compact group flex h-full flex-col gap-4 transition-[border-color,background-color] hover:border-line-strong hover:bg-surface-2"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-ui border border-line bg-surface-2 text-fg-muted transition-colors group-hover:border-line-strong group-hover:text-fg">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-fg">{tile.title}</p>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {tile.body}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
