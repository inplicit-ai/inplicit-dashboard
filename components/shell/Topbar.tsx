"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buildBreadcrumb, type CrumbContext } from "@/lib/shell/breadcrumb-map";
import { matchFlow } from "@/lib/shell/flows";
import type { SidebarState } from "@/lib/shell/sidebar-policy";
import { Stepper } from "@/components/shell/Stepper";
import { SidebarTrigger } from "@/components/shell/SidebarTrigger";
import { LocaleSwitcher } from "@/components/shell/LocaleSwitcher";

/**
 * Sticky, step-aware topbar (02 §4 / design-contract §9). Always answers
 * "where am I?": [trigger] · breadcrumb · stepper (flow only) · locale + user.
 *
 * When a multi-step flow is active the breadcrumb collapses to its trail and
 * the stepper takes the visual lead in the center — the two never compete for
 * attention. All chrome is token-driven (no raw palette colors).
 */
export function Topbar({
  pathname,
  sidebarState,
  onToggleSidebar,
  crumbContext,
  userSlot,
}: {
  pathname: string;
  sidebarState: SidebarState;
  onToggleSidebar: () => void;
  crumbContext?: CrumbContext;
  userSlot?: React.ReactNode;
}) {
  const tBreadcrumb = useTranslations("breadcrumb");
  const crumbs = buildBreadcrumb(pathname, crumbContext);
  const flow = matchFlow(pathname);

  const label = (key: string, isLiteral?: boolean) =>
    isLiteral ? key : tBreadcrumb(key);

  return (
    <header className="shell-topbar" data-tour="topbar">
      <div className="shell-topbar__lead">
        {sidebarState !== "expanded" && (
          <SidebarTrigger state={sidebarState} onToggle={onToggleSidebar} />
        )}
        <Breadcrumb
          data-tour="topbar-breadcrumb"
          className="min-w-0 overflow-hidden"
        >
          <BreadcrumbList className="flex-nowrap text-fg-muted">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={`${crumb.key}-${i}`} className="contents">
                  <BreadcrumbItem className="min-w-0">
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage className="truncate text-fg">
                        {label(crumb.key, crumb.isLiteral)}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          href={crumb.href}
                          className="truncate text-fg-muted transition-colors hover:text-fg"
                        >
                          {label(crumb.key, crumb.isLiteral)}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && (
                    <BreadcrumbSeparator className="text-fg-faint" />
                  )}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {flow && (
        <div className="shell-topbar__center">
          <Stepper flow={flow} pathname={pathname} />
        </div>
      )}

      <div className="shell-topbar__end">
        <LocaleSwitcher />
        {userSlot}
      </div>
    </header>
  );
}
