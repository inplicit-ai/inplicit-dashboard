import { getTranslations } from "next-intl/server";
import { Users, Vault as VaultIcon } from "lucide-react";
import { makeApi, type OrgMember } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatBand } from "@/components/ui/stat-band";
import { CardGrid, EntityCard } from "@/components/ui/card-grid";

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
  ];

  return (
    <>
      <PageHeader title={t("title")} subtitle={me.email} />

      <StatBand
        className="mb-8"
        cells={[
          { label: t("statSeats"), value: members.length },
          { label: t("statRole"), value: t("roleOwner") },
        ]}
      />

      <SectionHeading title={t("eyebrow")} count={tiles.length} />

      <CardGrid>
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <EntityCard
              key={tile.href}
              href={tile.href}
              title={
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                  {tile.title}
                </span>
              }
              meta={tile.body}
            />
          );
        })}
      </CardGrid>
    </>
  );
}
