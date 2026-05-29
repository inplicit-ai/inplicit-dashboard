import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Linear-dense chrome: 13px/500 meta floor, 8px radius, hairline focus ring,
  // no resting shadow in light mode (depth = border + surface step).
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-ui text-[length:var(--text-meta)] font-medium whitespace-nowrap transition-colors outline-none focus-visible:shadow-[var(--shadow-focus)] focus-visible:border-accent disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Near-black/near-white CTA fill — the only solid button fill.
        default:
          "bg-primary text-primary-foreground hover:bg-[#1a1a1a] dark:hover:bg-primary/90",
        destructive:
          "bg-destructive text-cta-fg hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        // Hairline outline — hover is a color/border step, never a shadow lift.
        outline:
          "border border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-2 dark:bg-surface dark:hover:bg-surface-2",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-fg-muted hover:bg-surface-2 hover:text-fg",
        link: "text-fg-muted underline-offset-4 hover:text-fg hover:underline",
        // The rare amber agentic CTA — max one per view.
        accent:
          "border-transparent bg-accent text-cta-fg hover:bg-accent-strong shadow-none",
      },
      size: {
        default: "h-8 px-4 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-sm px-2 text-[length:var(--text-caption)] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-9 px-5 has-[>svg]:px-4",
        icon: "size-8",
        "icon-xs": "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
