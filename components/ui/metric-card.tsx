"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * MetricCard — the white-modernist dashboard readout (the user's
 * DashboardMetricCard, retuned to our tokens).
 *
 * White card: muted label + lucide icon on top, a BIG sans tabular-nums value
 * (NEVER mono), and a small trend row (ArrowUp green / ArrowDown red / Minus
 * muted) with the % / delta string. Framer-motion hover lift (y:-4 + shadow),
 * gated behind prefers-reduced-motion. Becomes a link when `href` is set.
 * ────────────────────────────────────────────────────────────────────────── */

export type TrendDir = "up" | "down" | "flat"

export interface MetricTrend {
  dir: TrendDir
  /** e.g. "+12.4%" or "−3" — rendered as sans tabular-nums. */
  value: string
}

export interface MetricCardProps {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  trend?: MetricTrend
  href?: string
  className?: string
}

const TREND: Record<TrendDir, { Icon: LucideIcon; tone: string; label: string }> = {
  up: { Icon: ArrowUp, tone: "text-success", label: "Trending up" },
  down: { Icon: ArrowDown, tone: "text-danger", label: "Trending down" },
  flat: { Icon: Minus, tone: "text-fg-subtle", label: "No change" },
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  href,
  className,
}: MetricCardProps) {
  const reduceMotion = useReducedMotion()
  const interactive = Boolean(href)

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
          {label}
        </span>
        {Icon && <Icon aria-hidden className="h-4 w-4 shrink-0 text-fg-subtle" />}
      </div>

      <div className="mt-3 text-[length:var(--text-metric)] font-semibold leading-[1.1] tracking-[-0.02em] tabular-nums text-fg">
        {value}
      </div>

      {trend && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-[length:var(--text-caption)] tabular-nums",
            TREND[trend.dir].tone
          )}
        >
          {React.createElement(TREND[trend.dir].Icon, {
            "aria-label": TREND[trend.dir].label,
            className: "h-3.5 w-3.5",
          })}
          <span>{trend.value}</span>
        </div>
      )}
    </>
  )

  const baseClass = cn(
    "flex flex-col rounded-card border border-line bg-card p-6 text-card-foreground shadow-card transition-[box-shadow,border-color] duration-200 ease-[var(--ease-spring)]",
    interactive && "cursor-pointer hover:shadow-card-hover",
    className
  )

  // Reduced motion → drop the lift entirely (CSS shadow transition still runs).
  const hoverProps = reduceMotion
    ? {}
    : {
        whileHover: { y: -4 },
        transition: { type: "spring" as const, stiffness: 380, damping: 30 },
      }

  if (href) {
    return (
      <motion.div {...hoverProps}>
        <Link href={href} className={baseClass}>
          {body}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div {...hoverProps} className={baseClass}>
      {body}
    </motion.div>
  )
}
