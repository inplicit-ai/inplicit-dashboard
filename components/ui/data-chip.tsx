import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * DataChip — the canonical square data-chip (wraps the `.badge` recipe).
 *
 * ONE chip for department / phase / tools / dependency / n= tags and mono
 * fractions like "6/1 · 2 depts". Tint-only (no pills — pills read as
 * marketing chrome), 11px tracked-uppercase by default.
 *
 * Tone discipline (manifesto): pain / gap / opportunity / success tints are
 * RESERVED for VSE-triad + lifecycle data encoding — never decoration. Default
 * is the neutral surface chip. `mono` switches content to JetBrains Mono +
 * tabular-nums for numeric / fraction / ID payloads (anon_id, utterance_index,
 * "6/1 · 2 depts").
 *
 * Server-safe: no "use client", no motion.
 * ────────────────────────────────────────────────────────────────────────── */

export type DataChipTone =
  | "neutral"
  | "pain"
  | "gap"
  | "opportunity"
  | "success"
  | "warning"
  | "danger";

const TONE_CLASS: Record<DataChipTone, string> = {
  neutral: "badge--neutral",
  pain: "badge--pain",
  gap: "badge--gap",
  opportunity: "badge--opportunity",
  success: "badge--success",
  warning: "badge--warning",
  danger: "badge--danger",
};

export interface DataChipProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: DataChipTone;
  /**
   * Render content in JetBrains Mono + tabular-nums. Use for every numeric /
   * fraction / ID payload (counts, percents, anon_id, utterance_index). Prose
   * tags (department names, phase words) stay non-mono.
   */
  mono?: boolean;
  children: React.ReactNode;
}

export function DataChip({
  tone = "neutral",
  mono = false,
  className,
  children,
  ...props
}: DataChipProps) {
  return (
    <span
      className={cn("badge", TONE_CLASS[tone], mono && "badge--mono", className)}
      {...props}
    >
      {children}
    </span>
  );
}
