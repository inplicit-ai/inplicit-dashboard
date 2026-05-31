import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Folio — section masthead (wraps the `.folio` recipe).
 *
 * The typographic section break that REPLACES repeated `.headline` titles on
 * instrument screens: a full-width hairline rule with an eyebrow index on the
 * left ("§ INSIGHTS"), a mono tabular count on the right ("n=212"), and an
 * optional action slot. Hierarchy comes from the rule + folio label, never a
 * bigger heading.
 *
 * `tone="subtle"` softens the rule for subsections. Server-safe.
 * ────────────────────────────────────────────────────────────────────────── */

export interface FolioProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Section index / prefix, e.g. "§ 03" or "§". Mono-rendered on the label. */
  index: string;
  /** Section label, e.g. "INSIGHTS". Rendered uppercase-tracked. */
  label: string;
  /** Right-aligned mono count, e.g. 212 → "n=212". Pass a node for custom. */
  count?: number | string;
  /** `subtle` uses the hairline-subtle rule for subsections. */
  tone?: "primary" | "subtle";
  /** Trailing action (filter, "View all", etc.). */
  action?: React.ReactNode;
}

export function Folio({
  index,
  label,
  count,
  tone = "primary",
  action,
  className,
  ...props
}: FolioProps) {
  const countNode =
    count == null
      ? null
      : typeof count === "number"
        ? `n=${count}`
        : count;

  return (
    <div
      className={cn("folio", tone === "subtle" && "folio--subtle", className)}
      {...props}
    >
      <span className="folio__label">
        {/* The index is part of the eyebrow voice — kept inline so it shares
            the tracked-uppercase treatment with the label. */}
        {index} {label}
      </span>
      <div className="folio__action">
        {countNode != null && <span className="folio__count">{countNode}</span>}
        {action}
      </div>
    </div>
  );
}
