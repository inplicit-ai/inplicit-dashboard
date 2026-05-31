import * as React from "react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * SectionHeading — the calm in-page section header.
 *
 * A sentence-case section title (19px / 600) + an optional muted tabular-nums
 * count, with an optional right-aligned action. REPLACES every "§ SECTION"
 * all-caps eyebrow header. No "§" glyph, no uppercase eyebrow, no monospace.
 *
 * Server-safe: no "use client".
 * ────────────────────────────────────────────────────────────────────────── */

export interface SectionHeadingProps {
  title: string
  /** Optional muted count beside the title (sans tabular-nums). */
  count?: number
  /** Optional right-aligned action (Button / link). */
  action?: React.ReactNode
  className?: string
}

export function SectionHeading({
  title,
  count,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("mb-4 flex items-baseline justify-between gap-4", className)}>
      <h2 className="text-[length:var(--text-title)] font-semibold tracking-[-0.015em] text-fg">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-[length:var(--text-meta)] font-normal tabular-nums text-fg-subtle">
            {count}
          </span>
        )}
      </h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
