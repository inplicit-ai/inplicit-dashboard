// Inplicit's left navigation rail.
//
// Always-expanded 248px column. Logo on top, then an org/workspace card,
// then sectioned navigation with eyebrow labels, finally the account
// dropdown at the bottom.
//
// Mode is mandatory and decides the navigation set entirely:
//   - "staff"    → Inplicit-internal back-office
//   - "customer" → ORG_OWNER's own dashboard
//
// Active-state highlighting is wired via a tiny inline script in Layout.tsx
// that adds `.is-active` to the link whose `data-href` matches the current
// `location.pathname` (longest-prefix wins).

import type { JSX } from "preact";
import { asset } from "$fresh/runtime.ts";
import type { Me } from "../lib/api.ts";
import {
  IconBuilding,
  IconChevrons,
  IconFolderKanban,
  IconLayoutGrid,
  IconLogOut,
  IconSearch,
} from "./icons.tsx";

type Mode = "customer" | "staff";

interface SidebarProps {
  mode: Mode;
  me?: Me;
  /** Display label for the org row. For customers this is their org's name;
   *  for staff it's literally "Inplicit Staff". */
  orgLabel?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: (p: { size?: number }) => JSX.Element;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function Sidebar({ mode, me, orgLabel }: SidebarProps) {
  const navSections = mode === "staff" ? STAFF_NAV : CUSTOMER_NAV;

  const avatarLetter = mode === "staff"
    ? "I"
    : (orgLabel?.[0]?.toUpperCase() ?? "·");

  const orgName = orgLabel ?? (mode === "staff" ? "Inplicit Staff" : "Workspace");
  const roleLabel = mode === "staff" ? "Back-Office" : "Workspace";

  return (
    <aside class="sidebar" aria-label="Hauptnavigation">
      <div class="sidebar__inner">
        {/* ── Brand ───────────────────────────────────────────────────── */}
        <div class="sidebar__brand">
          <a
            href={mode === "staff" ? "/staff/orgs" : "/admin/campaigns"}
            class="sidebar__brand-mark"
            aria-label="Inplicit"
          >
            <img
              src={asset("/logo.svg")}
              alt="Inplicit"
              class="sidebar__brand-logo"
            />
          </a>
        </div>

        {/* ── Org / workspace identifier ──────────────────────────────── */}
        <div class="sidebar__org">
          <span class="sidebar__avatar" aria-hidden="true">{avatarLetter}</span>
          <span class="sidebar__org-text">
            <span class="sidebar__org-name">{orgName}</span>
            <span class="sidebar__org-role">{roleLabel}</span>
          </span>
        </div>

        {/* ── Sections ────────────────────────────────────────────────── */}
        <nav
          class="sidebar__nav"
          aria-label={mode === "staff" ? "Staff" : "Workspace"}
        >
          {navSections.map((section) => (
            <div class="sidebar__section" key={section.label}>
              <span class="sidebar__section-label">{section.label}</span>
              {section.items.map((item) => (
                <a
                  key={item.href + item.label}
                  href={item.href}
                  data-href={item.href}
                  class="sidebar__item"
                >
                  <span class="sidebar__item-icon" aria-hidden="true">
                    <item.icon size={16} />
                  </span>
                  <span class="sidebar__item-label">{item.label}</span>
                  {item.badge && (
                    <span class="sidebar__item-badge">{item.badge}</span>
                  )}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Bottom: account ─────────────────────────────────────────── */}
        <div class="sidebar__bottom">
          <details class="sidebar__menu">
            <summary class="sidebar__item sidebar__item--menu">
              <span
                class="sidebar__avatar sidebar__avatar--sm"
                aria-hidden="true"
              >
                {me?.name?.[0]?.toUpperCase() ?? me?.email?.[0]?.toUpperCase() ??
                  "?"}
              </span>
              <span class="sidebar__item-label">
                {me?.name ?? me?.email ?? "Account"}
              </span>
              <span class="sidebar__menu-chev" aria-hidden="true">
                <IconChevrons size={14} />
              </span>
            </summary>
            <div class="sidebar__menu-panel" role="menu">
              {me && (
                <div class="sidebar__menu-meta">
                  <span class="sidebar__menu-name">{me.name ?? "-"}</span>
                  <span class="sidebar__menu-email">{me.email}</span>
                  <span class="sidebar__menu-role">
                    {me.role === "INPLICIT_STAFF" ? "Inplicit Staff" : "Org Owner"}
                  </span>
                </div>
              )}
              <form method="POST" action="/admin/logout" class="sidebar__menu-form">
                <button
                  type="submit"
                  class="sidebar__menu-item sidebar__menu-item--button"
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

// ── Nav sets ──────────────────────────────────────────────────────────────

const STAFF_NAV: NavSection[] = [
  {
    label: "Back-Office",
    items: [
      { href: "/staff/orgs", label: "Organisationen", icon: IconBuilding },
    ],
  },
];

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
