import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Square data-chip (6px radius — NOT a pill), 11px/600 tracked eyebrow, tint-only.
  // Tabular-nums on by construction so numeric chips align on a column; prose
  // tags read fine too. `mono` opts content fully into JetBrains Mono for IDs /
  // fractions / counts. No underline / link affordances — chips are not links.
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold leading-[1.4] tracking-[0.06em] tabular-nums whitespace-nowrap transition-colors focus-visible:shadow-[var(--shadow-focus)] focus-visible:border-accent aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        // Neutral data-chip: surface fill + hairline border (the resting default).
        default:
          "border-line bg-surface text-fg-muted [a&]:hover:border-line-strong [a&]:hover:bg-surface-2",
        secondary:
          "border-line bg-surface-2 text-fg-muted [a&]:hover:border-line-strong [a&]:hover:bg-surface-2",
        // Semantic VSE/lifecycle tints — reserved for data encoding, never decoration.
        success:
          "border-success/25 bg-success-soft text-success [a&]:hover:border-success/40",
        warning:
          "border-warning/25 bg-warning-soft text-warning [a&]:hover:border-warning/40",
        destructive:
          "border-danger/30 bg-danger-soft text-danger [a&]:hover:border-danger/40",
        outline:
          "border-line text-fg [a&]:hover:border-line-strong [a&]:hover:bg-surface-2",
        ghost:
          "border-transparent text-fg-muted [a&]:hover:bg-surface-2 [a&]:hover:text-fg",
        // Canonical "interview live / synthesis running" chip — pair with a
        // leading <StatusDisc state="live" /> (the lone amber pulse).
        live: "border-accent-muted bg-accent-soft text-accent",
      },
      mono: {
        true: "font-mono",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      mono: false,
    },
  }
)

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }

function Badge({
  className,
  variant = "default",
  mono = false,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, mono }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
