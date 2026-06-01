"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getMobilePrimary,
  isNavItemActive,
  type NavSection,
} from "@/lib/shell/nav";
import { IconMenu } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Bottom-nav for phones (02 §5). Carries the primary tabs from the shared nav
 * model; everything else lives behind the "More" tab which opens the drawer.
 */
export function MobileTabBar({
  sections,
  hasAudits,
  onMore,
}: {
  sections: NavSection[];
  hasAudits: boolean;
  onMore: () => void;
}) {
  const pathname = usePathname() ?? "";
  const tNav = useTranslations("nav");
  const primary = getMobilePrimary(sections);
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const isActive = (href: string) => isNavItemActive(pathname, href, allHrefs);

  return (
    <nav className="shell-tabbar" aria-label={tNav("sectionOrg")}>
      {primary.map((item) => {
        const Icon = item.icon;
        const disabled = Boolean(item.needsAudits && !hasAudits);
        const active = isActive(item.href) && !disabled;
        const inner = (
          <>
            <Icon size={20} />
            <span className="shell-tabbar__label">{tNav(item.id)}</span>
          </>
        );
        if (disabled) {
          return (
            <span
              key={item.id}
              className="shell-tabbar__item is-disabled"
              aria-disabled="true"
            >
              {inner}
            </span>
          );
        }
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn("shell-tabbar__item", active && "is-active")}
            aria-current={active ? "page" : undefined}
          >
            {inner}
          </Link>
        );
      })}
      <button
        type="button"
        className="shell-tabbar__item"
        onClick={onMore}
        aria-label={tNav("more")}
      >
        <IconMenu size={20} />
        <span className="shell-tabbar__label">{tNav("more")}</span>
      </button>
    </nav>
  );
}
