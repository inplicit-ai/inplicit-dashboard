import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A single KPI tile. Surface + hairline + radius, dark-only shadow (the `.card`
 * recipe). Light depth is border + surface-step only — no shadow (Braun rule).
 * The accent is reserved for active/focus states elsewhere; a stat tile is
 * quiet by default. See design-contract §2.
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
    <div className={cn("card card--compact flex flex-col gap-2", className)}>
      <span className="label-eyebrow text-fg-subtle">{label}</span>
      <span className="text-2xl-tabular font-medium tracking-tight text-fg">
        {value}
      </span>
      {hint && <span className="text-xs text-fg-muted">{hint}</span>}
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
