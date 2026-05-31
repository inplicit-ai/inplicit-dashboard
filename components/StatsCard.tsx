import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A single metric cell in the white-modernist StatBand. Renders a muted sans
 * label over a BIG sans tabular-nums value (NEVER mono) inside a white cell
 * that the enclosing {@link StatsRow} divides with 1px gap-px dividers.
 *
 * The accent never appears here — a stat tile is monochrome by default.
 * Designed to sit inside `<StatsRow>` (the bordered rounded container).
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
    <div className={cn("flex flex-col gap-2 bg-surface p-6", className)}>
      <span className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
        {label}
      </span>
      <span className="text-[length:var(--text-metric)] font-semibold leading-[1.1] tracking-[-0.02em] tabular-nums text-fg">
        {value}
      </span>
      {hint && (
        <span className="text-[length:var(--text-caption)] text-fg-subtle">
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * The StatBand container — ONE rounded-xl hairline enclosure split into equal
 * cells by the gap-px-on-a-border-colored-bg divider trick. Collapses to a
 * 2-col grid on small screens. Replaces the retired floating stat-card grid
 * and the austere ".spec-strip".
 */
export function StatsRow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-flow-col lg:auto-cols-fr">
      {children}
    </div>
  );
}
