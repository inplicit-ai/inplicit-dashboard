import * as React from "react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * Card — the RARE container, not the default wrapper.
 *
 * On the Research Ledger most surfaces are borderless ruled rows (see Ledger /
 * LedgerRow); Card now survives for the legitimate framed registers only:
 *   • default  — a single hairline-bordered panel (forms, popovers, the
 *                InstrumentBand frame). Depth is one border + surface step,
 *                never a light-mode shadow.
 *   • reading  — the 17px / 1.6 / 68ch reading register for prose-heavy detail
 *                (insight/hypothesis bodies, RAG answers).
 *   • ledger   — a zero-padding frame whose child LedgerRows own their padding.
 *
 * The subcomponents are unchanged; `variant` only retunes the outer frame.
 * ────────────────────────────────────────────────────────────────────────── */

const CARD_VARIANT = {
  default: "gap-5 py-5",
  reading: "card--reading gap-4 py-6",
  ledger: "card--ledger gap-0 py-0",
} as const

function Card({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: keyof typeof CARD_VARIANT }) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(
        // Hairline depth: 12px radius, 1px line, surface step — no shadow in
        // light mode (dark mode may layer a card shadow).
        "flex flex-col rounded-card border border-line bg-card text-card-foreground shadow-none dark:shadow-card",
        CARD_VARIANT[variant],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-5 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:border-line [.border-b]:pb-5",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-semibold leading-none tracking-[-0.01em] text-fg", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[length:var(--text-body-sm)] text-fg-muted", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-5 [.border-t]:border-line [.border-t]:pt-5", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
