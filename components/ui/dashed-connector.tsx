import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * DashedConnector — reusable dashed hierarchy line (token-driven).
 *
 * Replaces the inline `border-l-2 border-dashed border-muted-foreground/30`
 * spine used in agent-plan with a token border (border-line / border-line-strong)
 * so it themes correctly in dark mode. Server-safe.
 *
 * Vertical:   <DashedConnector orientation="vertical" className="left-[20px]" />
 *             (parent must be `relative`; component is absolutely positioned)
 * Horizontal: <DashedConnector orientation="horizontal" className="w-6" />
 *
 * `tone="active"` lights the connector AMBER (.border-accent) so the lone
 * running synthesis / live branch of a Ledger can thread an accent spine —
 * the one place a connector may carry the accent (manifesto: amber means live).
 *
 * See docs/plans/overhaul/design-contract.md §4.
 * ────────────────────────────────────────────────────────────────────────── */

export interface DashedConnectorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
  tone?: "default" | "muted" | "strong" | "active";
  /** Stroke weight. Default 2 for vertical spines, 1 reads better horizontally. */
  weight?: 1 | 2;
}

const TONE_BORDER: Record<NonNullable<DashedConnectorProps["tone"]>, string> = {
  default: "border-line",
  muted: "border-line-subtle",
  strong: "border-line-strong",
  // The single accent connector — reserved for the live/running branch.
  active: "border-accent",
};

export function DashedConnector({
  orientation = "vertical",
  tone = "strong",
  weight = 2,
  className,
  ...props
}: DashedConnectorProps) {
  const border = TONE_BORDER[tone];
  const isVertical = orientation === "vertical";
  return (
    <div
      aria-hidden
      className={cn(
        "border-dashed",
        border,
        isVertical
          ? cn("absolute top-0 bottom-0", weight === 2 ? "border-l-2" : "border-l")
          : cn("h-px w-full", weight === 2 ? "border-t-2" : "border-t"),
        className,
      )}
      {...props}
    />
  );
}
