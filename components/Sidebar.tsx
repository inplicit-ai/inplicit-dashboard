"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import type { Me } from "@/lib/api";
import {
  IconBuilding,
  IconFileText,
  IconFolderKanban,
  IconLayoutGrid,
  IconLogOut,
  IconMap,
  IconScale,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@/components/icons";
import { SettingsDialog } from "@/components/SettingsDialog";

type Mode = "customer" | "staff";
type IconCmp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

interface SidebarProps {
  mode: Mode;
  me?: Me;
  orgLabel?: string;
  /** When false, org-level sections (Insights, Knowledge Map, …) render
   *  as disabled placeholders — they need at least one audit before they
   *  hold meaningful data. */
  hasAudits?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: IconCmp;
  badge?: string;
  /** True → render as a non-clickable, dimmed row with an explanation. */
  disabled?: boolean;
  /** Hint shown via title attribute when disabled. */
  disabledHint?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function Sidebar({ mode, me, orgLabel, hasAudits = false }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const params = useParams();

  const campaignId = typeof params?.id === "string" ? params.id : null;

  const navSections =
    mode === "staff"
      ? staffNav(me?.role === "INPLICIT_ADMIN")
      : customerNav(campaignId, hasAudits);

  const avatarLetter =
    mode === "staff" ? "I" : (orgLabel?.[0]?.toUpperCase() ?? "·");
  const orgName = orgLabel ?? (mode === "staff" ? "Inplicit Staff" : "Workspace");
  const roleLabel = mode === "staff" ? "Back-Office" : "Workspace";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sidebar" aria-label="Hauptnavigation">
      <div className="sidebar__inner">
        <div className="sidebar__brand">
          <Link
            href={mode === "staff" ? "/staff/orgs" : "/campaigns"}
            className="sidebar__brand-mark"
            aria-label="Inplicit"
          >
            <Image
              src="/logo.svg"
              alt="Inplicit"
              width={120}
              height={24}
              className="sidebar__brand-logo"
              priority
            />
          </Link>
        </div>

        <div className="sidebar__org">
          <span className="sidebar__avatar" aria-hidden="true">{avatarLetter}</span>
          <span className="sidebar__org-text">
            <span className="sidebar__org-name">{orgName}</span>
            <span className="sidebar__org-role">{roleLabel}</span>
          </span>
        </div>

        <nav
          className="sidebar__nav"
          aria-label={mode === "staff" ? "Staff" : "Workspace"}
        >
          {navSections.map((section) => (
            <div className="sidebar__section" key={section.label}>
              <span className="sidebar__section-label">{section.label}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                const className = `sidebar__item${
                  isActive(item.href) && !item.disabled ? " is-active" : ""
                }${item.disabled ? " is-disabled" : ""}`;
                if (item.disabled) {
                  return (
                    <span
                      key={item.href + item.label}
                      className={className}
                      title={item.disabledHint}
                      aria-disabled="true"
                    >
                      <span className="sidebar__item-icon" aria-hidden="true">
                        <Icon size={16} />
                      </span>
                      <span className="sidebar__item-label">{item.label}</span>
                      {item.badge && (
                        <span className="sidebar__item-badge">{item.badge}</span>
                      )}
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={className}
                  >
                    <span className="sidebar__item-icon" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <span className="sidebar__item-label">{item.label}</span>
                    {item.badge && (
                      <span className="sidebar__item-badge">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__bottom">
          <SettingsDialog
            me={me}
            trigger={
              <button type="button" className="sidebar__item sidebar__item--bottom">
                <span className="sidebar__item-icon" aria-hidden="true">
                  <IconSettings size={16} />
                </span>
                <span className="sidebar__item-label">Einstellungen</span>
              </button>
            }
          />
          <form method="POST" action="/logout" className="sidebar__bottom-form">
            <button
              type="submit"
              className="sidebar__item sidebar__item--bottom sidebar__item--logout"
            >
              <span className="sidebar__item-icon" aria-hidden="true">
                <IconLogOut size={16} />
              </span>
              <span className="sidebar__item-label">Log Out</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function staffNav(isAdmin: boolean): NavSection[] {
  const items: NavItem[] = [
    { href: "/staff/orgs", label: "Organisationen", icon: IconBuilding },
  ];
  if (isAdmin) {
    items.push({ href: "/staff/users", label: "Team", icon: IconUsers });
  }
  return [{ label: "Back-Office", items }];
}

function customerNav(campaignId: string | null, hasAudits: boolean): NavSection[] {
  const sections: NavSection[] = [
    {
      label: "Workspace",
      items: [
        { href: "/campaigns", label: "Überblick", icon: IconLayoutGrid },
        { href: "/campaigns", label: "Audits", icon: IconFolderKanban },
      ],
    },
  ];

  // Per-campaign sections. Until Phase 7 promotes these to dedicated
  // org-level routes, they only have a meaningful destination when a
  // specific audit is open. With no campaignId in the URL, the old code
  // sent every link back to `/campaigns`, which made the sidebar feel
  // frozen ("clicked Insights, now nothing else navigates"). The right
  // call: render them as disabled placeholders explaining the
  // requirement.
  const noCampaignHint = "Öffne zuerst ein Audit, um diesen Bereich zu nutzen.";
  const noAuditsHint = "Verfügbar, sobald der erste Audit angelegt ist.";
  const perCampaignDisabled = !hasAudits || !campaignId;
  const perCampaignHint = !hasAudits ? noAuditsHint : noCampaignHint;

  const orgItems: NavItem[] = [
    {
      href: campaignId ? `/campaigns/${campaignId}/interviews` : "/campaigns",
      label: "Interviews",
      icon: IconFileText,
      disabled: perCampaignDisabled,
      disabledHint: perCampaignHint,
    },
    {
      href: campaignId ? `/campaigns/${campaignId}/participants` : "/campaigns",
      label: "Teilnehmer",
      icon: IconUsers,
      disabled: perCampaignDisabled,
      disabledHint: perCampaignHint,
    },
    {
      href: campaignId ? `/campaigns/${campaignId}/map` : "/campaigns",
      label: "Knowledge Map",
      icon: IconMap,
      disabled: perCampaignDisabled,
      disabledHint: perCampaignHint,
    },
    {
      href: campaignId ? `/campaigns/${campaignId}/hypotheses` : "/campaigns",
      label: "Cross-Validation",
      icon: IconScale,
      disabled: perCampaignDisabled,
      disabledHint: perCampaignHint,
    },
  ];

  sections.push({ label: "Wissen", items: orgItems });

  // Insights is org-level (RAG searches across every audit in the org),
  // so it stays enabled whenever at least one audit exists — even from
  // /campaigns, where it lives.
  sections.push({
    label: "Ask",
    items: [
      {
        href: "/campaigns",
        label: "Insights",
        icon: IconSearch,
        badge: "RAG",
        disabled: !hasAudits,
        disabledHint: !hasAudits ? noAuditsHint : undefined,
      },
    ],
  });

  return sections;
}
