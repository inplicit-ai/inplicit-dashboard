"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import type { Me } from "@/lib/api";
import {
  IconBuilding,
  IconChevrons,
  IconFolderKanban,
  IconLayoutGrid,
  IconLogOut,
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
}

interface NavItem {
  href: string;
  label: string;
  icon: IconCmp;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function Sidebar({ mode, me, orgLabel }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const navSections = mode === "staff" ? staffNav(me?.role === "INPLICIT_ADMIN") : CUSTOMER_NAV;

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
            href={mode === "staff" ? "/staff/orgs" : "/admin/campaigns"}
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
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={`sidebar__item${isActive(item.href) ? " is-active" : ""}`}
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
              <button type="button" className="sidebar__item">
                <span className="sidebar__item-icon" aria-hidden="true">
                  <IconSettings size={16} />
                </span>
                <span className="sidebar__item-label">Einstellungen</span>
              </button>
            }
          />
          <details className="sidebar__menu">
            <summary className="sidebar__item sidebar__item--menu">
              <span className="sidebar__avatar sidebar__avatar--sm" aria-hidden="true">
                {me?.name?.[0]?.toUpperCase() ?? me?.email?.[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="sidebar__item-label">
                {me?.name ?? me?.email ?? "Account"}
              </span>
              <span className="sidebar__menu-chev" aria-hidden="true">
                <IconChevrons size={14} />
              </span>
            </summary>
            <div className="sidebar__menu-panel" role="menu">
              {me && (
                <div className="sidebar__menu-meta">
                  <span className="sidebar__menu-name">{me.name ?? "-"}</span>
                  <span className="sidebar__menu-email">{me.email}</span>
                  <span className="sidebar__menu-role">
                    {me.role === "INPLICIT_ADMIN"
                      ? "Inplicit Admin"
                      : me.role === "INPLICIT_STAFF"
                        ? "Inplicit Staff"
                        : "Org Owner"}
                  </span>
                </div>
              )}
              <form method="POST" action="/admin/logout" className="sidebar__menu-form">
                <button
                  type="submit"
                  className="sidebar__menu-item sidebar__menu-item--button"
                  role="menuitem"
                >
                  <IconLogOut size={14} />
                  <span>Abmelden</span>
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </aside>
  );
}

function staffNav(isAdmin: boolean): NavSection[] {
  const items: NavItem[] = [
    { href: "/staff/orgs", label: "Organisationen", icon: IconBuilding },
  ];
  // The Team page is admin-only — regular staff can't manage other staff.
  // Backend enforces the same rule on /api/staff/users (require_admin).
  if (isAdmin) {
    items.push({ href: "/staff/users", label: "Team", icon: IconUsers });
  }
  return [{ label: "Back-Office", items }];
}

const CUSTOMER_NAV: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/admin/campaigns", label: "Übersicht", icon: IconLayoutGrid },
      { href: "/admin/campaigns", label: "Audits", icon: IconFolderKanban },
    ],
  },
  {
    label: "Wissen",
    items: [
      {
        href: "/admin/insights",
        label: "Insights",
        icon: IconSearch,
        badge: "RAG",
      },
    ],
  },
];
