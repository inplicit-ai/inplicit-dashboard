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
 * Sticky, step-aware topbar (02 §4). Always answers "where am I?":
 * [trigger] · breadcrumb · stepper (flow only) · locale + user.
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
        <Breadcrumb data-tour="topbar-breadcrumb">
          <BreadcrumbList>
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span
                  key={`${crumb.key}-${i}`}
                  className="contents"
                >
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage>
                        {label(crumb.key, crumb.isLiteral)}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>
                          {label(crumb.key, crumb.isLiteral)}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
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
