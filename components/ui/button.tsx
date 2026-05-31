import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // White-modernist chrome: 36px floor, 10px radius, 13px/500 label, soft
  // resting shadow, amber focus ring. Depth = subtle elevation, not borders.
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-ui text-[length:var(--text-meta)] font-medium whitespace-nowrap transition-[background-color,border-color,box-shadow,transform,color] duration-200 ease-[var(--ease-spring)] outline-none focus-visible:shadow-[var(--shadow-focus)] focus-visible:border-accent disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Solid near-black CTA fill — the primary action. No gradient.
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-[#1f1f1f] hover:shadow-md dark:hover:bg-primary/90",
        destructive:
          "bg-destructive text-cta-fg shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        // Secondary: white card + hairline border + soft shadow; hover lifts the border.
        outline:
          "border border-line bg-surface text-fg shadow-sm hover:border-line-strong hover:bg-surface-2 dark:bg-surface dark:hover:bg-surface-2",
        secondary:
          "border border-line bg-surface text-fg shadow-sm hover:border-line-strong hover:bg-surface-2",
        ghost:
          "text-fg-muted hover:bg-surface-2 hover:text-fg",
        link: "text-fg-muted underline-offset-4 hover:text-fg hover:underline",
        // Reserved amber CTA — at most one per view (active agentic action).
        accent:
          "border-transparent bg-accent text-cta-fg shadow-sm hover:bg-accent-strong hover:shadow-md",
      },
      size: {
        default: "h-9 px-4 has-[>svg]:px-3",
        xs: "h-7 gap-1 rounded-md px-2.5 text-[length:var(--text-caption)] has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-5 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
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
