import * as React from "react";

import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * SpecBlock — mono label:value spec list, hairline-separated (wraps the
 * `.spec-block` recipe).
 *
 * The masthead-rail instrument readout: campaign / window / n= / last sync /
 * status. Labels are tracked-uppercase eyebrows; values are right-aligned
 * JetBrains Mono + tabular-nums. Lives in the sticky left rail of
 * LedgerMasthead (campaign dashboard, twin role detail) and on the quiet
 * EndedView instrument plate.
 *
 * `live` surfaces the ONE pulsing status disc beside the block heading when an
 * interview / synthesis run is active — the lone amber in the rail.
 *
 * Server-safe: the disc pulse is pure CSS.
 * ────────────────────────────────────────────────────────────────────────── */

export interface SpecRow {
  label: string;
  value: React.ReactNode;
}

export interface SpecBlockProps
  extends React.HTMLAttributes<HTMLDListElement> {
  rows: SpecRow[];
  /**
   * When true, prepend a pulsing live StatusDisc + "LIVE" caption row — the
   * single accent element tying the rail to the realtime plane.
   */
  live?: boolean;
}

export function SpecBlock({ rows, live = false, className, ...props }: SpecBlockProps) {
  return (
    <dl className={cn("spec-block", className)} {...props}>
      {live && (
        <div className="spec-block__row">
          <dt className="spec-block__label">Status</dt>
          <dd className="spec-block__value inline-flex items-center gap-2 text-accent">
            <StatusDisc state="live" size="sm" />
            LIVE
          </dd>
        </div>
      )}
      {rows.map((row, i) => (
        <div className="spec-block__row" key={`${row.label}-${i}`}>
          <dt className="spec-block__label">{row.label}</dt>
          <dd className="spec-block__value">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
