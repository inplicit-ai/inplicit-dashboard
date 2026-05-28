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
      // Dynamic id — resolve to a name, never the raw id.
      const prev = segments[i - 1];
      if (prev === "campaigns") {
        crumbs.push(
          ctx.campaignName
            ? { key: ctx.campaignName, isLiteral: true, href: isLast ? undefined : acc }
            : { key: "campaign", href: isLast ? undefined : acc },
        );
      } else {
        // Unknown dynamic segment — fall back to a generic key.
        crumbs.push({ key: "campaign", href: isLast ? undefined : acc });
      }
      return;
    }

    const key = SEGMENT_KEY[seg] ?? seg;
    crumbs.push({ key, href: isLast ? undefined : acc });
  });

  return crumbs;
}
