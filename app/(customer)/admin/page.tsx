import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Users, Plug, Vault as VaultIcon } from "lucide-react";
import { makeApi, type OrgMember } from "@/lib/api";
import { requireOrgOwner, requestCookie } from "@/lib/auth";
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
      <header className="masthead mb-8">
        <div className="masthead__metric">
          <span className="flex items-baseline gap-3">
            <span className="masthead__num" aria-hidden>
              §
            </span>
            <h1 className="masthead__title">{t("title")}</h1>
          </span>
          <span className="flex flex-col items-end">
            <span className="masthead__metric-value">{members.length}</span>
            <span className="masthead__metric-label">{t("statSeats")}</span>
          </span>
        </div>
        <p className="masthead__dek">{me.email}</p>
      </header>

      <StatsRow>
        <StatsCard label={t("statSeats")} value={members.length} />
        <StatsCard label={t("statRole")} value={t("roleOwner")} />
      </StatsRow>

      <header className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
          § {t("eyebrow")}
        </span>
        <span className="font-mono text-xs tabular-nums text-fg-muted">
          n={tiles.length}
        </span>
      </header>

      {/* Hub destinations as a ledger of selectable rows, not floating cards. */}
      <div className="evidence-tree">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div className="tree-node" key={tile.href}>
              <Link
                href={tile.href}
                className="tree-row tree-row--button tree-row--parent group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="tree-row__lead">
                  <Icon className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                  <span className="tree-row__label">{tile.title}</span>
                </div>
                <div className="tree-row__meta">
                  <span className="hidden max-w-[52ch] truncate text-sm text-fg-muted md:inline">
                    {tile.body}
                  </span>
                  <ArrowRight className="h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
