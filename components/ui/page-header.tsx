import * as React from "react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * PageHeader — the calm white-modernist screen header (claude.ai / Linear).
 *
 * Big confident sans title on the left + one-line muted subtitle, primary
 * action button(s) and an optional search field on the right. Lots of air.
 *
 * REPLACES the retired ".masthead" / "§"-glyph block. No eyebrow, no glyph,
 * no monospace numerals. Reuse existing i18n key strings as title / subtitle.
 *
 * Server-safe: no "use client".
 * ────────────────────────────────────────────────────────────────────────── */

export interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Primary action button(s), rendered top-right. */
  actions?: React.ReactNode
  /** Optional search field (an <Input>), rendered alongside the actions. */
  search?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  actions,
  search,
  className,
}: PageHeaderProps) {
  const hasRight = Boolean(actions || search)

  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        className
      )}
    >
      <div className="page-header__main min-w-0">
        <h1 className="display text-fg">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-[60ch] text-[length:var(--text-body-lg)] text-fg-muted">
            {subtitle}
          </p>
        )}
      </div>

      {hasRight && (
        <div className="page-header__actions flex shrink-0 items-center gap-2">
          {search}
          {actions}
        </div>
      )}
    </header>
  )
}
