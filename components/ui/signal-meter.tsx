import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * SignalMeter — inline horizontal gauge for cluster signal-strength and
 * hypothesis evidence ratios (wraps the `.signal-meter` recipe).
 *
 * Renders the falsification thresholds (>=5 supporting / <=1 contradicting /
 * >=2 depts) as a compact instrument instead of prose. The fill is a thin
 * NEAR-BLACK bar (`--color-text-primary`), NEVER accent — accent is reserved
 * for the single live element. A mono tabular readout sits beside the track.
 *
 * Server-safe: no "use client". The width tween is a pure CSS transition on
 * `.signal-meter__fill` (gated globally; no JS animation).
 * ────────────────────────────────────────────────────────────────────────── */

export interface SignalMeterProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Current value (e.g. cluster signal strength, n supporting). */
  value: number;
  /** Full-scale value. Defaults to 10. */
  max?: number;
  /**
   * Right-side mono readout. Defaults to the bare value. Pass a fraction node
   * (e.g. "6/1 · 2 depts") to encode the verification thresholds compactly.
   */
  readout?: React.ReactNode;
  /**
   * Optional verification threshold (e.g. 5). When provided and met, the
   * readout is tinted via aria-hidden marker so callers can style "passed".
   */
  threshold?: number;
  /** Track width in px. Defaults to the recipe's 64px. */
  trackWidth?: number;
}

export function SignalMeter({
  value,
  max = 10,
  readout,
  threshold,
  trackWidth,
  className,
  ...props
}: SignalMeterProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const met = threshold != null ? value >= threshold : undefined;

  return (
    <span
      className={cn("signal-meter", className)}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      data-threshold-met={met}
      {...props}
    >
      <span
        className="signal-meter__track"
        style={trackWidth != null ? { width: trackWidth } : undefined}
        aria-hidden
      >
        <span className="signal-meter__fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="signal-meter__readout">
        {readout ?? `${value}/${safeMax}`}
      </span>
    </span>
  );
}
