import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * InstrumentBand — the KPI replacement (wraps the `.instrument-band` recipe).
 *
 * Replaces the grid of floating bordered stat boxes with ONE hairline-bordered
 * band divided by vertical 1px rules into equal cells. Each cell is a tiny
 * tracked-uppercase label over a BIG mono tabular value, with an optional
 * +/-delta micro-indicator (tinted by SIGN only) top-right and an optional
 * hairline "View →" footer that deep-links into the matching ledger branch.
 *
 * Reads as one control-panel readout, not separate boxes. Under 640px the band
 * wraps to a 2-col ledger of cells (pure CSS). Reuses `.stat__label` /
 * `.stat__value`. Server-safe (Next <Link>, no client state).
 * ────────────────────────────────────────────────────────────────────────── */

export interface InstrumentCell {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; dir: "up" | "down" | "flat" };
  /** When set, renders a hairline "View →" footer linking into the branch. */
  href?: string;
  /** Footer label override. Defaults to "View". */
  linkLabel?: string;
}

export interface InstrumentBandProps
  extends React.HTMLAttributes<HTMLDivElement> {
  cells: InstrumentCell[];
}

const DELTA_CLASS: Record<NonNullable<InstrumentCell["delta"]>["dir"], string> = {
  up: "instrument-band__delta--up",
  down: "instrument-band__delta--down",
  flat: "instrument-band__delta--flat",
};

const DELTA_PREFIX: Record<NonNullable<InstrumentCell["delta"]>["dir"], string> = {
  up: "▲ ",
  down: "▼ ",
  flat: "→ ",
};

export function InstrumentBand({ cells, className, ...props }: InstrumentBandProps) {
  return (
    <div className={cn("instrument-band", className)} {...props}>
      {cells.map((cell, i) => (
        <div className="instrument-band__cell" key={`${cell.label}-${i}`}>
          {cell.delta && (
            <span
              className={cn(
                "instrument-band__delta",
                DELTA_CLASS[cell.delta.dir],
              )}
              aria-hidden
            >
              {DELTA_PREFIX[cell.delta.dir]}
              {cell.delta.value}
            </span>
          )}
          <span className="stat__label">{cell.label}</span>
          <span className="stat__value">{cell.value}</span>
          {cell.href && (
            <Link href={cell.href} className="instrument-band__link">
              {cell.linkLabel ?? "View"}
              <ArrowRight aria-hidden className="size-3" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
