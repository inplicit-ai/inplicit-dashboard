/**
 * Single typed navigation definition. Drives the desktop rail, the mobile
 * drawer, and the bottom-nav — one model, three presentations (02 §6).
 *
 * Labels are i18n KEYS (resolved at render time via `useTranslations("nav")`),
 * never literal strings, per the no-hardcoded-strings rule.
 *
 * Pure data + pure helpers, no React — unit-testable without a DOM.
 */

import type { ComponentType, SVGProps } from "react";
import type { Role } from "@/lib/api";
import {
  IconBoxes,
  IconBuilding,
  IconFolderKanban,
  IconLayoutGrid,
  IconMessage,
  IconSparkles,
  IconUsers,
  IconVault,
} from "@/components/icons";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
export type NavMode = "customer" | "staff";

export interface NavItem {
  /** Stable id, also used as the i18n key under the `nav` namespace. */
  id: string;
  href: string;
  icon: NavIcon;
  badge?: string;
  /** When true, the item is gated until the org has ≥1 audit (campaign). */
  needsAudits?: boolean;
  /** Stable `data-tour` anchor id for the O-10 guided tour. */
  tourId?: string;
  /** Surface this item in the mobile bottom-nav (primary tabs). */
  mobilePrimary?: boolean;
  /** When true, the item renders disabled with a "coming soon" treatment. */
  comingSoon?: boolean;
}

export interface NavSection {
  /** i18n key under the `nav` namespace. */
  id: string;
  items: NavItem[];
}

const CUSTOMER_SECTIONS: NavSection[] = [
  {
    id: "sectionCreate",
    items: [
      {
        id: "create",
        href: "/campaigns/new",
        icon: IconSparkles,
        tourId: "nav-create",
        mobilePrimary: true,
      },
      {
        id: "campaigns",
        href: "/campaigns",
        icon: IconFolderKanban,
        tourId: "nav-campaigns",
        mobilePrimary: true,
      },
    ],
  },
  {
    id: "sectionOrg",
    items: [
      {
        id: "interviews",
        href: "/interviews",
        icon: IconLayoutGrid,
        needsAudits: true,
        tourId: "nav-interviews",
        mobilePrimary: true,
      },
      {
        id: "knowledgeChat",
        href: "/chat",
        icon: IconMessage,
        badge: "RAG",
        needsAudits: true,
        tourId: "nav-chat",
        mobilePrimary: true,
      },
      // WHY-115: /twin + /integrations are folded under the Kontext-Vault hub.
      // Their routes are kept; only the separate top-level nav entries are gone.
      { id: "vaults", href: "/vaults", icon: IconVault, tourId: "nav-vaults" },
      { id: "mcp", href: "/mcp", icon: IconBoxes, comingSoon: true },
      { id: "admin", href: "/admin", icon: IconBuilding },
    ],
  },
];

function staffSections(isAdmin: boolean): NavSection[] {
  const items: NavItem[] = [
    {
      id: "organizations",
      href: "/staff/orgs",
      icon: IconBuilding,
      mobilePrimary: true,
    },
  ];
  if (isAdmin) {
    items.push({
      id: "team",
      href: "/staff/users",
      icon: IconUsers,
      mobilePrimary: true,
    });
  }
  return [{ id: "sectionBackOffice", items }];
}

/** Resolve the nav model for a mode + role. Returns a fresh array (immutable). */
export function getNavSections(mode: NavMode, role?: Role): NavSection[] {
  if (mode === "staff") {
    return staffSections(role === "INPLICIT_ADMIN");
  }
  return CUSTOMER_SECTIONS;
}

/**
 * Active-state resolver shared by the rail, drawer, and bottom-nav. A naive
 * `startsWith` lights up BOTH `/campaigns` and `/campaigns/new` on the create
 * route; the active item is instead the one whose href is the LONGEST prefix of
 * the current path (so `/campaigns/new` wins over `/campaigns`). Pass the full
 * set of nav hrefs so the comparison is global, not per-item.
 */
export function isNavItemActive(
  pathname: string,
  href: string,
  allHrefs: string[],
): boolean {
  const matches = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
  if (!matches(href)) return false;
  const longest = allHrefs
    .filter(matches)
    .reduce((best, h) => (h.length > best.length ? h : best), "");
  return href === longest;
}

/** Flatten sections into the bottom-nav primary tabs (mobile). */
export function getMobilePrimary(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) => s.items).filter((i) => i.mobilePrimary);
}

/** Items not promoted to the bottom-nav — these live behind the "More" tab. */
export function getMobileOverflow(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) => s.items).filter((i) => !i.mobilePrimary);
}
