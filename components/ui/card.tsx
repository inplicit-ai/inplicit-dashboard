import * as React from "react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * Card — white-modernist surface (claude.ai / Linear / Vercel).
 *
 * White fill, hairline border, soft shadow in BOTH themes (the old "no
 * light-mode shadow" rule is revoked). Interactive cards gently lift on hover
 * (translateY + stronger shadow), spring-eased.
 *
 * Variants only retune the outer frame:
 *   • default  — roomy padded white panel (gap-5 py-6).
 *   • reading  — the prose reading register for insight / hypothesis / RAG bodies.
 *   • ledger   — a zero-padding frame whose child rows own their padding.
 *
 * `interactive` opts the card into the hover lift + pointer cursor — use for any
 * clickable entity card (the CardGrid / EntityCard default).
 * ────────────────────────────────────────────────────────────────────────── */

const CARD_VARIANT = {
  default: "gap-5 py-6",
  reading: "card--reading gap-4 py-6",
  ledger: "card--ledger gap-0 py-0",
} as const

function Card({
  className,
  variant = "default",
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: keyof typeof CARD_VARIANT
  interactive?: boolean
}) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(
        // Hairline frame whose width comes from the shared --border-card token
        // (never a per-component inline width). Soft elevation in both themes;
        // spring-eased depth transition.
        "flex flex-col rounded-card border-[length:var(--border-card)] border-solid border-line bg-card text-card-foreground shadow-card transition-[box-shadow,transform,border-color] duration-200 ease-[var(--ease-spring)]",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover",
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
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:border-line [.border-b]:pb-5",
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
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:border-line [.border-t]:pt-5", className)}
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
