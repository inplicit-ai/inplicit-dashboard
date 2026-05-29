import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A single KPI tile. Uses the `.stat` recipe: flat surface + hairline + radius,
 * value rendered in JetBrains Mono + tabular-nums so the figure reads as
 * instrument data. Light depth is border + surface-step only — no shadow (Braun
 * rule). The accent is reserved for active/focus states elsewhere; a stat tile
 * is quiet by default. See design-contract §2.
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
    <div className={cn("stat", className)}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {hint && <span className="stat__sub">{hint}</span>}
    </div>
  );
}

/** Responsive grid wrapper for a row of stat tiles. */
export function StatsRow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {children}
    </div>
  );
}
