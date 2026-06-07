import * as React from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * MetricCard — the white-modernist dashboard readout (the user's
 * DashboardMetricCard, retuned to our tokens).
 *
 * White card: muted label + lucide icon on top, a BIG sans tabular-nums value
 * (NEVER mono), and a small trend row (ArrowUp green / ArrowDown red / Minus
 * muted) with the % / delta string. Becomes a link when `href` is set.
 *
 * This is a SERVER component on purpose: the hover lift is pure CSS (so no
 * framer-motion / "use client"), which lets Server Component pages pass a lucide
 * icon TYPE via `icon={Users}` without tripping the RSC boundary error
 * ("Functions cannot be passed directly to Client Components"). The lift is
 * disabled under prefers-reduced-motion via the `motion-reduce:` variants.
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
  const interactive = Boolean(href)
  const TrendIcon = trend ? TREND[trend.dir].Icon : null

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

      {trend && TrendIcon && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-[length:var(--text-caption)] tabular-nums",
            TREND[trend.dir].tone,
          )}
        >
          <TrendIcon aria-label={TREND[trend.dir].label} className="h-3.5 w-3.5" />
          <span>{trend.value}</span>
        </div>
      )}
    </>
  )

  const baseClass = cn(
    // Hairline frame whose width comes from the shared --border-card token (same
    // as the React <Card>) — never a bare/hardcoded width. Soft elevation + the
    // unified card-hover lift so every card surface behaves identically.
    "flex flex-col rounded-card border-[length:var(--border-card)] border-solid border-line bg-card p-6 text-card-foreground shadow-card transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-spring)]",
    // CSS hover lift — matches <Card>'s -translate-y-0.5, honors reduced motion.
    interactive &&
      "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0",
    className,
  )

  return href ? (
    <Link href={href} className={baseClass}>
      {body}
    </Link>
  ) : (
    <div className={baseClass}>{body}</div>
  )
}
