"use client";

import { useEffect, useReducer, useState } from "react";
import { usePathname } from "next/navigation";
import type { Me } from "@/lib/api";
import type { NavMode } from "@/lib/shell/nav";
import { getNavSections } from "@/lib/shell/nav";
import {
  effectiveSidebarState,
  initialPolicyState,
  nextToggleState,
  sidebarReducer,
} from "@/lib/shell/sidebar-policy";
import type { CrumbContext } from "@/lib/shell/breadcrumb-map";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { SidebarTrigger } from "@/components/shell/SidebarTrigger";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { NavDrawer } from "@/components/shell/NavDrawer";

/**
 * The app shell (02 §2/§3). Owns the sidebar reducer + route policy and renders
 * the grid (sidebar | topbar + main). Responsive recomposition: on phones the
 * rail is replaced by a bottom-nav + drawer.
 *
 * State is derived from the route via the reducer; a user override survives
 * only within the same route family (see sidebar-policy).
 */
export function ShellLayout({
  mode,
  me,
  orgLabel,
  orgLogoUrl,
  hasAudits = false,
  crumbContext,
  children,
}: {
  mode: NavMode;
  me?: Me;
  orgLabel?: string;
  orgLogoUrl?: string | null;
  hasAudits?: boolean;
  crumbContext?: CrumbContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [state, dispatch] = useReducer(sidebarReducer, undefined, initialPolicyState);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Route → state: re-resolve on every pathname change (drops stale overrides).
  useEffect(() => {
    dispatch({ type: "ROUTE_CHANGED", pathname });
  }, [pathname]);

  const sidebarState = effectiveSidebarState(state);
  const sections = getNavSections(mode, me?.role);

  const onToggle = () =>
    dispatch({ type: "USER_TOGGLED", next: nextToggleState(sidebarState) });

  return (
    <div className="shell shell--app" data-sidebar={sidebarState}>
      {/* Desktop rail — hidden on phone via CSS. */}
      <div className="shell__rail">
        <Sidebar
          mode={mode}
          me={me}
          orgLabel={orgLabel}
          orgLogoUrl={orgLogoUrl}
          hasAudits={hasAudits}
          state={sidebarState}
        />
      </div>

      {/* Floating "open nav" pin when fully hidden (desktop). */}
      {sidebarState === "hidden" && (
        <SidebarTrigger
          state={sidebarState}
          onToggle={onToggle}
          variant="floating"
        />
      )}

      <div className="app-main">
        <Topbar
          pathname={pathname}
          sidebarState={sidebarState}
          onToggleSidebar={onToggle}
          crumbContext={crumbContext}
        />
        <div className="app-work">{children}</div>
      </div>

      {/* Mobile bottom-nav + drawer — shown on phone via CSS. */}
      <div className="shell__mobile">
        <MobileTabBar
          sections={sections}
          hasAudits={hasAudits}
          onMore={() => setDrawerOpen(true)}
        />
      </div>
      <NavDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={mode}
        me={me}
        orgLabel={orgLabel}
        orgLogoUrl={orgLogoUrl}
        hasAudits={hasAudits}
      />
    </div>
  );
}
