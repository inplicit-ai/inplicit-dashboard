import * as React from "react";

import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * LivePhaseBar — the one licensed live-amber band (wraps the `.live-phase-bar`
 * recipe).
 *
 * A slim full-width band for an in-progress interview: a mono anon_id, the
 * OPEN 70% / VALIDATION 30% timeline as a single hairline rule with ONE amber
 * fill segment, a ticking tnum utterance counter, and one pulsing live disc.
 * This is the single place the live amber pulse is licensed alongside the disc.
 *
 * Phase semantics: `pct` is overall interview progress (0–100). The phase
 * switch happens at 70% per the two-phase interview design; the caller passes
 * the resolved `phase` so the label matches the fill.
 *
 * Mirrors into the SpecGutter (elapsed / phase / utterance count) on the
 * interview-experience screen.
 *
 * Server-safe: the disc pulse and fill transition are pure CSS.
 * ────────────────────────────────────────────────────────────────────────── */

export interface LivePhaseBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Mono machine identity, e.g. "ANON-3F2A1B". */
  anonId: string;
  /** Resolved current phase — drives the label and matches the fill. */
  phase: "open" | "validation";
  /** Overall interview progress, 0–100 (drives the amber fill width). */
  pct: number;
  /** Live utterance count (tabular-nums). */
  utteranceCount: number;
  /** Localized phase labels (reuse existing i18n keys at the call site). */
  labels?: { open?: string; validation?: string; utterances?: string };
}

export function LivePhaseBar({
  anonId,
  phase,
  pct,
  utteranceCount,
  labels,
  className,
  ...props
}: LivePhaseBarProps) {
  const clampedPct = Math.max(0, Math.min(100, pct));
  const phaseLabel =
    phase === "open"
      ? (labels?.open ?? "Open")
      : (labels?.validation ?? "Validation");

  return (
    <div
      className={cn("live-phase-bar", className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      {/* The single pulsing live disc — the one licensed live amber. */}
      <StatusDisc state="live" size="sm" />

      <span className="live-phase-bar__count">{anonId}</span>

      <span className="caps text-tertiary">{phaseLabel}</span>

      <span
        className="live-phase-bar__track"
        role="progressbar"
        aria-valuenow={Math.round(clampedPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={phaseLabel}
      >
        <span
          className="live-phase-bar__fill"
          style={{ width: `${clampedPct}%` }}
        />
      </span>

      <span className="live-phase-bar__count">
        {labels?.utterances ?? "u"} {utteranceCount}
      </span>
    </div>
  );
}
