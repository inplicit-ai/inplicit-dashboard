import * as React from "react";

import { StatBand, type StatBandCell } from "@/components/ui/stat-band";

/* ────────────────────────────────────────────────────────────────────────────
 * SpecStrip — LEGACY shim. The austere instrument-panel ".spec-strip" recipe is
 * retired; this now emits the white-modernist StatBand (rounded-xl bordered
 * container, gap-px dividers, SANS tabular-nums values — never mono).
 *
 * The SpecCell[] prop contract (label / value / delta / href) is preserved so
 * existing callers keep working unchanged. Prefer importing { StatBand } from
 * "@/components/ui/stat-band" for new code.
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

export function SpecStrip({ cells, ...props }: SpecStripProps) {
  // SpecCell.delta.dir ("up" | "down") is a subset of StatBandCell's dir, so the
  // cells map directly onto the StatBand contract.
  return <StatBand cells={cells as StatBandCell[]} {...props} />;
}
