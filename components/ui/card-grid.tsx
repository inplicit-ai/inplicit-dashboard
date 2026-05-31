import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

/* ────────────────────────────────────────────────────────────────────────────
 * CardGrid + EntityCard — the claude.ai Artifacts / Projects grid.
 *
 * The DEFAULT layout for ANY list of entities (campaigns, interviews, insights,
 * hypotheses, twins, orgs, users): a responsive grid of clean white cards with
 * a title, small muted meta, an optional status node top-right, and a soft hover
 * lift. Replaces dense row / register usage where a grid reads calmer.
 *
 * Server-safe: no "use client" (the hover lift is the Card's CSS transform).
 * ────────────────────────────────────────────────────────────────────────── */

export function CardGrid({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
        className
      )}
      {...props}
    />
  )
}

export interface EntityCardProps {
  title: React.ReactNode
  /** Small muted meta line (counts/dates use tabular-nums). */
  meta?: React.ReactNode
  /** A StatusDisc / Badge node, pinned top-right. */
  status?: React.ReactNode
  /** Whole-card deep link. */
  href?: string
  /** Optional footer row (separated by a hairline). */
  footer?: React.ReactNode
  className?: string
}

function EntityCardBody({ title, meta, status, footer }: EntityCardProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-semibold tracking-[-0.01em] text-fg">
          {title}
        </h3>
        {status && <div className="shrink-0">{status}</div>}
      </div>
      {meta && (
        <div className="mt-2 text-[length:var(--text-meta)] tabular-nums text-fg-subtle">
          {meta}
        </div>
      )}
      {footer && (
        <div className="mt-4 flex items-center border-t border-line-subtle pt-3 text-[length:var(--text-meta)] text-fg-muted">
          {footer}
        </div>
      )}
    </>
  )
}

export function EntityCard({
  href,
  className,
  ...rest
}: EntityCardProps) {
  if (href) {
    return (
      <Link href={href} className="group block">
        <Card interactive className={cn("p-5", className)}>
          <EntityCardBody href={href} {...rest} />
        </Card>
      </Link>
    )
  }
  return (
    <Card className={cn("p-5", className)}>
      <EntityCardBody {...rest} />
    </Card>
  )
}
