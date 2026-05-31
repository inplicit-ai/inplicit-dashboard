import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * SectionMasthead — the recurring printed-journal page header (wraps the
 * `.masthead` recipe in design.css).
 *
 * The ONE large-type moment per screen: an oversized mono section number, a
 * single Display title, a muted dek capped at the optical measure, and an
 * optional key metric flush-right on the full-width baseline rule. Hierarchy
 * comes from the rule + weight + mono number — never from inventing a fifth
 * type size.
 *
 * Sits at the top of every measure column across all authenticated screens so
 * the instrument always opens the same way. Server-safe (no client state, no
 * motion).
 * ────────────────────────────────────────────────────────────────────────── */

export interface SectionMastheadProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Mono section number, e.g. "01" / "03". Rendered in muted Display mono. */
  num: string;
  /** The single Display title for the screen. */
  title: string;
  /** Optional muted dek — constrained to --measure-width for readability. */
  dek?: string;
  /** Optional key metric, rendered flush-right on the baseline rule. */
  metric?: { label: string; value: React.ReactNode };
}

export function SectionMasthead({
  num,
  title,
  dek,
  metric,
  className,
  ...props
}: SectionMastheadProps) {
  return (
    <header className={cn("masthead", className)} {...props}>
      <div className="masthead__metric">
        <span className="flex items-baseline gap-3">
          <span className="masthead__num" aria-hidden>
            {num}
          </span>
          <h1 className="masthead__title">{title}</h1>
        </span>

        {metric && (
          <span className="flex flex-col items-end">
            <span className="masthead__metric-value">{metric.value}</span>
            <span className="masthead__metric-label">{metric.label}</span>
          </span>
        )}
      </div>

      {dek && <p className="masthead__dek">{dek}</p>}
    </header>
  );
}
