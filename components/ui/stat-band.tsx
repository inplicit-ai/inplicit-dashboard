import * as React from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * StatBand — the white-modernist dashboard readout band.
 *
 * ONE rounded-xl bordered container split into equal metric cells by 1px
 * dividers (the grid-gap-on-a-border-colored-bg trick — no per-cell border).
 * Each cell: a muted sans label, a BIG sans tabular-nums value (NEVER mono),
 * and an optional signed delta row (ArrowUp green / ArrowDown red / Minus
 * muted). A cell with `href` becomes a whole-cell deep link.
 *
 * Supersedes the retired ".spec-strip / .spec-cell". The legacy SpecStrip
 * component is re-pointed to this markup, preserving its SpecCell[] contract.
 *
 * Server-safe: no "use client" (the strip holds steady once rendered; the lone
 * continuous animation in the system is the live disc).
 * ────────────────────────────────────────────────────────────────────────── */

export type DeltaDir = "up" | "down" | "flat"

export interface StatBandCell {
  label: string
  value: React.ReactNode
  /** Signed delta micro-indicator, tinted by direction only. */
  delta?: { dir: DeltaDir; value: string }
  /** When set, the entire cell becomes a deep-link. */
  href?: string
}

export interface StatBandProps extends React.HTMLAttributes<HTMLDivElement> {
  cells: StatBandCell[]
}

const DELTA: Record<DeltaDir, { Icon: LucideIcon; tone: string; label: string }> = {
  up: { Icon: ArrowUp, tone: "text-success", label: "Up" },
  down: { Icon: ArrowDown, tone: "text-danger", label: "Down" },
  flat: { Icon: Minus, tone: "text-fg-subtle", label: "Flat" },
}

/** The rounded bordered container that hosts the cells (gap-px divider trick). */
export function StatsRow({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-flow-col lg:auto-cols-fr",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CellInner({ cell }: { cell: StatBandCell }) {
  return (
    <>
      <span className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
        {cell.label}
      </span>
      <span className="text-[length:var(--text-metric)] font-semibold leading-[1.1] tracking-[-0.02em] tabular-nums text-fg">
        {cell.value}
      </span>
      {cell.delta && (
        <span
          className={cn(
            "flex items-center gap-1 text-[length:var(--text-caption)] tabular-nums",
            DELTA[cell.delta.dir].tone
          )}
        >
          {React.createElement(DELTA[cell.delta.dir].Icon, {
            "aria-label": DELTA[cell.delta!.dir].label,
            className: "h-3.5 w-3.5",
          })}
          <span>{cell.delta.value}</span>
        </span>
      )}
    </>
  )
}

/** A single metric cell. Renders as a deep-link when `cell.href` is set. */
export function StatsCard({ cell }: { cell: StatBandCell }) {
  const base = "flex flex-col gap-2 bg-surface p-6"
  if (cell.href) {
    return (
      <Link
        href={cell.href}
        className={cn(base, "transition-colors hover:bg-surface-2")}
      >
        <CellInner cell={cell} />
      </Link>
    )
  }
  return (
    <div className={base}>
      <CellInner cell={cell} />
    </div>
  )
}

export function StatBand({ cells, className, ...props }: StatBandProps) {
  return (
    <StatsRow className={className} {...props}>
      {cells.map((cell, i) => (
        <StatsCard key={`${cell.label}-${i}`} cell={cell} />
      ))}
    </StatsRow>
  )
}
