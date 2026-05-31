import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Connector — reusable hierarchy line (token-driven), white-modernist.
 *
 * The austere "dashed spine" idiom is RETIRED: connectors are now calm SOLID
 * hairlines (border-line-subtle by default) so the tree reads as a quiet,
 * modern indent rule rather than a 2000s dotted skeleton. The public name and
 * prop contract are preserved (callers still import `DashedConnector` and may
 * pass `orientation` / `tone` / `weight`) — only the rendered look is rebuilt.
 *
 * Pass `dashed` to opt back into a dashed stroke for the rare case where a
 * dotted line genuinely communicates "predicted / provisional".
 *
 * Vertical:   <DashedConnector orientation="vertical" className="left-[20px]" />
 *             (parent must be `relative`; component is absolutely positioned)
 * Horizontal: <DashedConnector orientation="horizontal" className="w-6" />
 *
 * `tone="active"` lights the connector AMBER — reserved for the single live /
 * focused branch (the one place a connector carries the accent).
 * ────────────────────────────────────────────────────────────────────────── */

export interface DashedConnectorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
  tone?: "default" | "muted" | "strong" | "active";
  /** Stroke weight (px). Hairline (1) is the calm modern default. */
  weight?: 1 | 2;
  /** Opt back into a dashed stroke (predicted / provisional connectors). */
  dashed?: boolean;
}

const TONE_BORDER: Record<NonNullable<DashedConnectorProps["tone"]>, string> = {
  default: "border-line-subtle",
  muted: "border-line-subtle",
  strong: "border-line",
  // The single accent connector — reserved for the live/running branch.
  active: "border-accent",
};

export function DashedConnector({
  orientation = "vertical",
  tone = "default",
  weight = 1,
  dashed = false,
  className,
  ...props
}: DashedConnectorProps) {
  const border = TONE_BORDER[tone];
  const isVertical = orientation === "vertical";
  return (
    <div
      aria-hidden
      className={cn(
        dashed ? "border-dashed" : "border-solid",
        border,
        isVertical
          ? cn(
              "absolute top-0 bottom-0",
              weight === 2 ? "border-l-2" : "border-l",
            )
          : cn("h-px w-full", weight === 2 ? "border-t-2" : "border-t"),
        className,
      )}
      {...props}
    />
  );
}
