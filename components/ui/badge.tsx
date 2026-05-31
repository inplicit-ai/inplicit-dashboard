import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Soft pill (full radius — NOT a square chip), 12px/500, tint-only, calm.
  // tabular-nums by construction so numeric chips align on a column; prose tags
  // read fine too. `mono` opts content into the mono font ONLY for literal IDs
  // / tokens. No underline / link affordances — chips are not links.
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-[length:var(--text-caption)] font-medium leading-[1.4] tabular-nums whitespace-nowrap transition-colors focus-visible:shadow-[var(--shadow-focus)] focus-visible:border-accent aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        // Neutral pill: soft surface fill + hairline border (resting default).
        default:
          "border-line-subtle bg-surface-2 text-fg-muted [a&]:hover:border-line-strong [a&]:hover:bg-surface-2",
        secondary:
          "border-line-subtle bg-surface-2 text-fg-muted [a&]:hover:border-line-strong [a&]:hover:bg-surface-2",
        // Semantic VSE/lifecycle tints — reserved for data encoding, never decoration.
        success:
          "border-success/25 bg-success-soft text-success [a&]:hover:border-success/40",
        warning:
          "border-warning/25 bg-warning-soft text-warning [a&]:hover:border-warning/40",
        destructive:
          "border-danger/30 bg-danger-soft text-danger [a&]:hover:border-danger/40",
        outline:
          "border-line bg-surface text-fg [a&]:hover:border-line-strong [a&]:hover:bg-surface-2",
        ghost:
          "border-transparent text-fg-muted [a&]:hover:bg-surface-2 [a&]:hover:text-fg",
        // Canonical "interview live / synthesis running" pill — pair with a
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
