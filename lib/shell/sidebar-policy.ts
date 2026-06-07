/**
 * Route → sidebar-state policy (02 §3).
 *
 * The sidebar state is DERIVED from the active route, never a timer. A user
 * override survives only within the same route *family*; navigating to a new
 * family drops it and the new route's policy wins.
 *
 * Pure functions only — no React, no DOM. Unit-testable.
 */

export type SidebarState = "expanded" | "icon" | "hidden";

export interface SidebarPolicyState {
  policy: SidebarState;
  userOverride: SidebarState | null;
  routeKey: string;
}

/**
 * Identify the route "family" — the coarse grouping used to decide when a user
 * override is dropped. e.g. `/campaigns/abc/insights` and `/campaigns/abc` are
 * the same family (`campaign:abc`); `/campaigns` (list) is its own family.
 */
export function routeFamily(pathname: string): string {
  if (pathname.startsWith("/interview/")) return "interview-room";
  // All create-flow steps (launchpad, configure, review) share one family so
  // user overrides survive navigation between steps.
  if (pathname.startsWith("/campaigns/new")) return "campaign-new";

  const campaignMatch = pathname.match(/^\/campaigns\/([^/]+)/);
  if (campaignMatch && campaignMatch[1] !== "new" && campaignMatch[1] !== "team") {
    return `campaign:${campaignMatch[1]}`;
  }

  if (pathname.startsWith("/campaigns")) return "campaigns";
  if (pathname.startsWith("/staff")) return "staff";

  // Org-level surfaces each get their own family.
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg ? `top:${seg}` : "root";
}

/** Resolve the DEFAULT sidebar state for a pathname. */
export function resolveSidebarState(pathname: string): SidebarState {
  // Immersive interview room — orb owns the viewport.
  if (pathname.startsWith("/interview/")) return "hidden";

  // All other routes (including the entire campaign setup flow) keep the rail
  // expanded so the layout stays stable while the user navigates steps.
  return "expanded";
}

const INITIAL_ROUTE = "__init__";

export function initialPolicyState(): SidebarPolicyState {
  return { policy: "expanded", userOverride: null, routeKey: INITIAL_ROUTE };
}

export type SidebarAction =
  | { type: "ROUTE_CHANGED"; pathname: string }
  | { type: "USER_TOGGLED"; next: SidebarState };

/** Immutable reducer — always returns a new object. */
export function sidebarReducer(
  state: SidebarPolicyState,
  action: SidebarAction,
): SidebarPolicyState {
  switch (action.type) {
    case "ROUTE_CHANGED": {
      const nextKey = routeFamily(action.pathname);
      const policy = resolveSidebarState(action.pathname);
      if (nextKey !== state.routeKey) {
        return { policy, userOverride: null, routeKey: nextKey };
      }
      return { ...state, policy };
    }
    case "USER_TOGGLED":
      return { ...state, userOverride: action.next };
    default:
      return state;
  }
}

/** The state actually applied: a user override beats the route policy. */
export function effectiveSidebarState(state: SidebarPolicyState): SidebarState {
  return state.userOverride ?? state.policy;
}

/** Cycle target for the trigger button: expanded ⇄ icon (hidden→expanded). */
export function nextToggleState(current: SidebarState): SidebarState {
  if (current === "expanded") return "icon";
  return "expanded";
}
