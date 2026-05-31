import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * SpecStrip — kills the 4-up stat-card grid (wraps the `.spec-strip` recipe).
 *
 * ONE hairline-ruled horizontal enclosure of label / big-mono-value / delta
 * cells divided only by vertical hairlines — an instrument panel, not floating
 * boxes. No radius, no shadow, no per-card border. Collapses to a 2-col grid
 * under 640px (handled entirely by the recipe).
 *
 * Each cell:
 *   .spec-cell__label  — Caps mono, muted
 *   .spec-cell__value  — Display mono, tabular-nums
 *   .spec-cell__delta  — flush top-right, tinted by SIGN only (up=success,
 *                        down=danger). Delta is the ONLY tonal color here.
 *
 * Pass `href` on a cell to make the whole cell a deep-link into the matching
 * ledger branch (renders the cell as a Next <Link> with the same recipe class).
 *
 * Server-safe: no "use client". Count-up-on-load is intentionally NOT animated
 * here — the manifesto's one continuous animation is the live disc; the strip
 * holds steady once rendered.
 * ────────────────────────────────────────────────────────────────────────── */

export interface SpecCell {
  label: string;
  value: React.ReactNode;
  /** Signed delta micro-indicator, tinted by direction only. */
  delta?: { dir: "up" | "down"; value: string };
  /** When set, the entire cell becomes a deep-link. */
  href?: string;
}

export interface SpecStripProps extends React.HTMLAttributes<HTMLDivElement> {
  cells: SpecCell[];
}

const DELTA_CLASS: Record<NonNullable<SpecCell["delta"]>["dir"], string> = {
  up: "spec-cell__delta--up",
  down: "spec-cell__delta--down",
};

const DELTA_PREFIX: Record<NonNullable<SpecCell["delta"]>["dir"], string> = {
  up: "▲ ",
  down: "▼ ",
};

function CellInner({ cell }: { cell: SpecCell }) {
  return (
    <>
      {cell.delta && (
        <span
          className={cn("spec-cell__delta", DELTA_CLASS[cell.delta.dir])}
          aria-hidden
        >
          {DELTA_PREFIX[cell.delta.dir]}
          {cell.delta.value}
        </span>
      )}
      <span className="spec-cell__label">{cell.label}</span>
      <span className="spec-cell__value">{cell.value}</span>
    </>
  );
}

export function SpecStrip({ cells, className, ...props }: SpecStripProps) {
  return (
    <div className={cn("spec-strip", className)} {...props}>
      {cells.map((cell, i) =>
        cell.href ? (
          <Link
            key={`${cell.label}-${i}`}
            href={cell.href}
            className="spec-cell"
          >
            <CellInner cell={cell} />
          </Link>
        ) : (
          <div key={`${cell.label}-${i}`} className="spec-cell">
            <CellInner cell={cell} />
          </div>
        ),
      )}
    </div>
  );
}
