import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A single instrument cell. Reframed onto the `.spec-cell` recipe so a row of
 * KPIs reads as ONE ruled control-panel band (hairline-divided cells), never a
 * grid of floating boxes — the Research Ledger discipline. Value is JetBrains
 * Mono + tabular-nums (`.spec-cell__value`); label is a tracked-caps eyebrow.
 *
 * Designed to sit inside `<StatsRow>` (the `.spec-strip` enclosure). The accent
 * never appears here — a stat tile is monochrome by default.
 */
export function StatsCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("spec-cell", className)}>
      <span className="spec-cell__label">{label}</span>
      <span className="spec-cell__value">{value}</span>
      {hint && (
        <span className="font-mono text-[length:var(--text-caps)] uppercase tracking-[0.06em] text-fg-subtle">
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * The instrument band — one hairline enclosure divided into equal cells. Wraps
 * the `.spec-strip` recipe; collapses to a 2-col grid under 640px via the
 * recipe. Replaces the old floating stat-card grid.
 */
export function StatsRow({ children }: { children: ReactNode }) {
  return <div className="spec-strip mb-8">{children}</div>;
}
