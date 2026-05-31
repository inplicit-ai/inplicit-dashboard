import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  mono = false,
  ...props
}: React.ComponentProps<"input"> & { mono?: boolean }) {
  // Numeric fields stay SANS with tabular-nums for column alignment. `mono`
  // (or an explicit ID/token field) is the only path to the mono font.
  const isNumeric = type === "number"
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Roomy white input: 40px tall, 10px radius, 14px body-sm, hairline
        // border, white surface, no resting shadow.
        "h-10 w-full min-w-0 rounded-ui border border-line bg-surface px-3.5 text-[length:var(--text-body-sm)] text-fg transition-colors outline-none selection:bg-accent-soft file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[length:var(--text-body-sm)] file:font-medium file:text-fg placeholder:text-fg-faint hover:border-line-strong disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface",
        // Focus = single amber signal: tight ring + accent border.
        "focus-visible:border-accent focus-visible:shadow-[var(--shadow-focus)]",
        "aria-invalid:border-danger aria-invalid:shadow-none",
        isNumeric && "tabular-nums",
        mono && "font-mono tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export { Input }
