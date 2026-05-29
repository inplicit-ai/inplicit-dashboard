/**
 * First-visit guided overview (O-10, doc 02 §7).
 *
 * Pure data: the ordered list of spotlight steps. Each step targets a stable
 * `data-tour="<anchor>"` attribute already placed on shell regions (sidebar
 * items, topbar, work-area). No CSS-selector coupling, so the engine is
 * decoupled from markup details.
 *
 * Copy is referenced by i18n key only (`tour.step.<key>.title` /
 * `tour.step.<key>.body`) — never inline strings (doc 02 §8).
 *
 * Steps may declare a `route`: the engine navigates there and waits for the
 * anchor to mount before showing the card. Anchors that don't exist on the
 * current breakpoint (e.g. the topbar stepper on phone) are skipped at runtime,
 * so the same list works across viewports.
 */

export type TourPlacement = "right" | "left" | "top" | "bottom" | "center";

export interface TourStep {
  /** Stable key — used for the i18n lookup (`tour.step.<key>.*`). */
  key: string;
  /** The `data-tour` anchor to spotlight. `null` → centered card, no cut-out. */
  anchor: string | null;
  /** Optional route the engine pushes to before resolving the anchor. */
  route?: string;
  /** Preferred card placement relative to the cut-out. */
  placement?: TourPlacement;
}

/**
 * Up to 15 steps (doc 02 §7 outline). Order is the tour order. Trimmed to the
 * anchors that actually exist in the current shell so every step resolves;
 * deeper per-campaign anchors (insights/map/hypotheses) are reached via the
 * Campaigns step rather than route-pushing into a campaign that may not exist
 * for a brand-new org.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  { key: "welcome", anchor: null, placement: "center" },
  { key: "sidebar", anchor: "nav-create", route: "/campaigns", placement: "right" },
  { key: "create", anchor: "nav-create", placement: "right" },
  { key: "campaigns", anchor: "nav-campaigns", placement: "right" },
  { key: "breadcrumb", anchor: "topbar-breadcrumb", placement: "bottom" },
  { key: "stepper", anchor: "topbar-stepper", placement: "bottom" },
  { key: "interviews", anchor: "nav-interviews", placement: "right" },
  { key: "chat", anchor: "nav-chat", placement: "right" },
  { key: "vaults", anchor: "nav-vaults", placement: "right" },
  { key: "twin", anchor: "nav-twin", placement: "right" },
  { key: "finish", anchor: null, placement: "center" },
] as const;

export const TOUR_TOTAL = TOUR_STEPS.length;
