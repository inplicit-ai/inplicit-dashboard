import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * EmptyState — the friendly white-modernist empty placeholder.
 *
 * Centered column: a lucide icon in a soft circle, a sentence-case title, one
 * muted hint line, and an optional CTA button. REPLACES the retired all-caps
 * mono "KEINE … AUF DER PLATTE" dumps. Reuse existing i18n message keys for
 * the title / hint strings.
 *
 * Server-safe: no "use client".
 * ────────────────────────────────────────────────────────────────────────── */

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  hint?: string
  /** Optional CTA — typically a <Button>. */
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-16 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2">
        <Icon aria-hidden className="h-6 w-6 text-fg-subtle" />
      </div>
      <h3 className="mt-4 text-[length:var(--text-title)] font-semibold text-fg">
        {title}
      </h3>
      {hint && (
        <p className="mt-1 max-w-[42ch] text-[length:var(--text-body)] text-fg-subtle">
          {hint}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
