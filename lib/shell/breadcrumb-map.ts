/**
 * Route → breadcrumb resolver (02 §4). Builds breadcrumb crumbs from the
 * matched route, not the raw pathname. Each segment maps to an i18n key (under
 * the `breadcrumb` namespace). Dynamic crumbs (e.g. a campaign id) never leak
 * the raw id — they resolve to a name (or a fallback key) supplied by the
 * caller.
 *
 * Pure functions, no React.
 */

export interface Crumb {
  /** i18n key under `breadcrumb`, OR a literal when `isLiteral` is true. */
  key: string;
  /** When true, `key` is already a resolved label (e.g. a campaign name). */
  isLiteral?: boolean;
  /** Link target; the last crumb is rendered as the current page (no link). */
  href?: string;
}

/** Optional resolved labels for dynamic segments (id → display name). */
export interface CrumbContext {
  campaignName?: string;
}

const SEGMENT_KEY: Record<string, string> = {
  campaigns: "campaigns",
  interviews: "interviews",
  chat: "chat",
  vaults: "vaults",
  integrations: "integrations",
  twin: "twin",
  admin: "admin",
  team: "team",
  staff: "staff",
  orgs: "orgs",
  users: "users",
  new: "new",
  configure: "configure",
  review: "review",
  launch: "launch",
  insights: "insights",
  participants: "participants",
  hypotheses: "hypotheses",
  map: "map",
};

function isUuidLike(seg: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(seg) || /^[0-9a-f]{16,}$/i.test(seg);
}

/**
 * What an opaque id "means" is determined by the collection segment that
 * precedes it. Maps that preceding segment → the i18n key for the record kind.
 * Anything not listed resolves to the neutral `record` key — NEVER reuse a key
 * that already appears earlier in the trail (that is what created circular
 * "Kampagne › … › Kampagne" breadcrumbs).
 */
const DYNAMIC_SEGMENT_KEY: Record<string, string> = {
  campaigns: "campaign",
  interviews: "interview",
  twin: "role",
};

/**
 * Resolve an opaque id segment to a breadcrumb key. A campaign id resolves to
 * the supplied campaign name when present (so the trail reads the real name,
 * not a generic fallback); all other ids resolve to a record-kind key.
 */
function resolveDynamicKey(prev: string | undefined, ctx: CrumbContext): string {
  if (prev === "campaigns" && ctx.campaignName) return ctx.campaignName;
  return (prev && DYNAMIC_SEGMENT_KEY[prev]) ?? "record";
}

/**
 * Drop crumbs whose rendered label equals the one immediately before it. For
 * literal crumbs that label is the resolved name; for keyed crumbs it is the
 * key (keys map 1:1 to labels, so equal keys ⇒ equal labels). Keeps the first.
 */
function dedupeAdjacent(crumbs: Crumb[]): Crumb[] {
  return crumbs.filter((crumb, i) => {
    if (i === 0) return true;
    const prev = crumbs[i - 1];
    return !(
      crumb.key === prev.key &&
      Boolean(crumb.isLiteral) === Boolean(prev.isLiteral)
    );
  });
}

/**
 * Build the crumb trail for a pathname. The home crumb is always first.
 * Campaign ids resolve to the supplied name (or the generic `campaign` key).
 */
export function buildBreadcrumb(
  pathname: string,
  ctx: CrumbContext = {},
): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];

  // Special-case: /campaigns/new reads better as a single "New campaign" crumb.
  if (pathname === "/campaigns/new") {
    return [
      { key: "campaigns", href: "/campaigns" },
      { key: "campaignsNew" },
    ];
  }

  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const isLast = i === segments.length - 1;

    if (isUuidLike(seg)) {
      // Dynamic id — resolve to a name/label keyed on the *preceding* segment,
      // never the raw id. The preceding collection segment is what tells us
      // what kind of record this is (a campaign id follows `campaigns`, an
      // interview id follows `interviews`, …). Falling back to a single
      // generic key for *every* unknown id is what produced circular trails
      // like "Kampagnen › Kampagne › Interviews › Kampagne".
      const prev = segments[i - 1];
      crumbs.push({
        key: resolveDynamicKey(prev, ctx),
        isLiteral: prev === "campaigns" && Boolean(ctx.campaignName),
        href: isLast ? undefined : acc,
      });
      return;
    }

    const key = SEGMENT_KEY[seg] ?? seg;
    crumbs.push({ key, href: isLast ? undefined : acc });
  });

  // Collapse any accidental consecutive duplicates (same rendered label,
  // adjacent) so a trail can never read "… › Kampagne › Kampagne". Keep the
  // first occurrence (it owns the link); drop the immediate repeat.
  return dedupeAdjacent(crumbs);
}
