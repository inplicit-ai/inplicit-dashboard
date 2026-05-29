import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A single KPI tile. White-first, hairline border, NO shadow (Braun rule).
 * The accent is reserved for active/focus states elsewhere — a stat tile is
 * quiet by default.
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
    <div
      className={cn(
        "flex flex-col gap-1 rounded-card border border-line bg-surface px-4 py-4",
        className,
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </span>
      <span className="text-2xl font-medium tracking-tight text-fg tabular-nums">
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
