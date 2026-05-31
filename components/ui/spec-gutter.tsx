import * as React from "react";

import { StatusDisc, type StatusState } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * SpecGutter / SpecRow — the right-zone vertical spec sheet of the live
 * synthesis machine (wraps the `.spec-gutter` / `.spec-row` recipes).
 *
 * Sticky, full-height, hairline-divided rows of aligned label / value pairs:
 * queue depth, last extraction, embedding count, cluster / hypothesis tallies,
 * elapsed, latency. Labels are Caps mono muted; values are mono tabular-nums so
 * the whole gutter optically aligns to one vertical ruler.
 *
 * Passed to EditorialShell's `gutter` slot. Folds away below 1024px (the recipe
 * hides it), so callers never need a media query.
 *
 * A SpecRow may carry an inline StatusDisc (e.g. a pulsing live disc next to
 * "Interview" while one is running) — the single licensed amber in the gutter.
 *
 * Server-safe: the disc pulse is pure CSS, so a live gutter animates inside a
 * server component without any client boundary.
 * ────────────────────────────────────────────────────────────────────────── */

export interface SpecGutterProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional Caps section title above the rows. */
  title?: string;
  children: React.ReactNode;
}

export function SpecGutter({
  title,
  className,
  children,
  ...props
}: SpecGutterProps) {
  return (
    <aside className={cn("spec-gutter", className)} {...props}>
      {title && <div className="spec-gutter__title">{title}</div>}
      {children}
    </aside>
  );
}

export interface SpecRowProps {
  label: string;
  value: React.ReactNode;
  /**
   * Optional status disc rendered before the value. Pulse is honored only when
   * status === "live" (enforced by StatusDisc) — the one gutter amber.
   */
  status?: StatusState;
  /** Force the pulse off even for a live disc (rarely needed). */
  pulse?: boolean;
  className?: string;
}

export function SpecRow({ label, value, status, pulse, className }: SpecRowProps) {
  return (
    <div className={cn("spec-row", className)}>
      <span className="spec-row__label">{label}</span>
      <span className="spec-row__value">
        {status && <StatusDisc state={status} pulse={pulse} size="sm" />}
        {value}
      </span>
    </div>
  );
}
