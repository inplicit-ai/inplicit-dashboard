import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Scorecard — the falsification spec for a hypothesis (wraps the `.scorecard`
 * recipe).
 *
 * Fixed-width tabular supporting / contradicting / dept-coverage figures with
 * the verification thresholds (>=5 supporting, <=1 contradicting, >=2 depts)
 * printed as faint reference marks BELOW each number, so evidence is read
 * against the bar — not against a gauge or donut.
 *
 * Tonal encoding (never amber): a figure that PASSES its threshold goes
 * success-ink; one that FAILS goes danger-ink; otherwise it stays primary ink.
 * Amber is reserved for the single live element, so the scorecard never uses it.
 *
 * Direction of each threshold:
 *   supporting    — pass when value >= sup   (more is better)
 *   contradicting — pass when value <= con   (fewer is better)
 *   deptCoverage  — pass when value >= dept  (more is better)
 *
 * Right-flushed in each hypothesis row of the EvidenceTree. Server-safe.
 * ────────────────────────────────────────────────────────────────────────── */

export interface ScorecardThresholds {
  /** Minimum supporting utterances to verify. Default 5. */
  sup: number;
  /** Maximum contradicting utterances to verify. Default 1. */
  con: number;
  /** Minimum department coverage to verify. Default 2. */
  dept: number;
}

export interface ScorecardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  supporting: number;
  contradicting: number;
  deptCoverage: number;
  thresholds?: ScorecardThresholds;
  /** Localized cell labels (reuse existing i18n keys at the call site). */
  labels?: { supporting?: string; contradicting?: string; depts?: string };
}

const DEFAULT_THRESHOLDS: ScorecardThresholds = { sup: 5, con: 1, dept: 2 };

/** PASS = success ink, FAIL = danger ink, else primary ink. */
function numClass(pass: boolean | null): string {
  if (pass === null) return "";
  return pass ? "scorecard__num--ok" : "scorecard__num--bad";
}

function ScoreCell({
  value,
  label,
  threshold,
  pass,
}: {
  value: number;
  label: string;
  threshold: string;
  pass: boolean | null;
}) {
  return (
    <div className="scorecard__cell">
      <span className={cn("scorecard__num", numClass(pass))}>{value}</span>
      <span className="scorecard__label">{label}</span>
      <span className="scorecard__threshold" aria-hidden>
        {threshold}
      </span>
    </div>
  );
}

export function Scorecard({
  supporting,
  contradicting,
  deptCoverage,
  thresholds = DEFAULT_THRESHOLDS,
  labels,
  className,
  ...props
}: ScorecardProps) {
  return (
    <div
      className={cn("scorecard", className)}
      role="group"
      aria-label="Falsification scorecard"
      {...props}
    >
      <ScoreCell
        value={supporting}
        label={labels?.supporting ?? "Support"}
        threshold={`≥${thresholds.sup}`}
        pass={supporting >= thresholds.sup}
      />
      <ScoreCell
        value={contradicting}
        label={labels?.contradicting ?? "Against"}
        threshold={`≤${thresholds.con}`}
        pass={contradicting <= thresholds.con}
      />
      <ScoreCell
        value={deptCoverage}
        label={labels?.depts ?? "Depts"}
        threshold={`≥${thresholds.dept}`}
        pass={deptCoverage >= thresholds.dept}
      />
    </div>
  );
}
