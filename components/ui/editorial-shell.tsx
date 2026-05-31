import * as React from "react";

import { IndexRail, type IndexGroup } from "@/components/ui/index-rail";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * EditorialShell — the three-zone instrument frame (wraps the `.app-shell`
 * grid recipe).
 *
 * Applied to every authenticated screen so the product feels like ONE stable
 * instrument, never separate apps:
 *   col 1  fixed IndexRail (numbered TOC)
 *   col 2  scrolling MEASURE COLUMN (children) — ledgers run full-bleed,
 *          running prose self-constrains via the `.measure-column` class
 *   col 3  collapsible SpecGutter (live synthesis machine), optional
 *
 * The rail and gutter stay fixed; only the measure column scrolls. Omitting
 * `gutter` switches to the two-column `.app-shell--no-gutter` layout.
 * `collapsed` swaps the rail to the 56px numeral-only width
 * (`.app-shell--collapsed`). The gutter folds away under 1024px (the recipe).
 *
 * Server-safe: pure layout + slots. IndexRail owns the only client boundary it
 * needs (active-link matching).
 * ────────────────────────────────────────────────────────────────────────── */

export type { IndexGroup };

export interface EditorialShellProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Index-rail groups (numbered TOC). */
  index: IndexGroup[];
  /** Active item id for the rail's amber tick. */
  activeId: string;
  /** Optional spec gutter (use <SpecGutter>). Omit for two-column layout. */
  gutter?: React.ReactNode;
  /** Collapse the rail to the 56px numeral rail. */
  collapsed?: boolean;
  /** The measure column content. */
  children: React.ReactNode;
}

export function EditorialShell({
  index,
  activeId,
  gutter,
  collapsed = false,
  className,
  children,
  ...props
}: EditorialShellProps) {
  return (
    <div
      className={cn(
        "app-shell",
        !gutter && "app-shell--no-gutter",
        collapsed && "app-shell--collapsed",
        className,
      )}
      {...props}
    >
      {/* Zone 1 — fixed index rail. */}
      <IndexRail groups={index} activeId={activeId} collapsed={collapsed} />

      {/* Zone 2 — the scrolling measure column. Ledgers run full-bleed; wrap
          running prose in <div className="measure-column"> to cap at 720px. */}
      <main className="app-work">{children}</main>

      {/* Zone 3 — collapsible spec gutter (optional). */}
      {gutter}
    </div>
  );
}
