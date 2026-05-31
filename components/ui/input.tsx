import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  mono = false,
  ...props
}: React.ComponentProps<"input"> & { mono?: boolean }) {
  // Numeric / ID / token fields opt into JetBrains Mono + tabular-nums so the
  // figures align on the same machine-identity register as every data surface.
  const isNumeric = type === "number"
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Chrome input floor: 36px tall, 8px radius, 14px body-sm, hairline border,
        // surface fill, no resting shadow.
        "h-9 w-full min-w-0 rounded-ui border border-line bg-surface px-3 text-[length:var(--text-body-sm)] text-fg shadow-none transition-colors outline-none selection:bg-accent-soft file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[length:var(--text-body-sm)] file:font-medium file:text-fg placeholder:text-fg-faint hover:border-line-strong disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface",
        // Focus = single amber signal: tight 2px ring + accent border.
        "focus-visible:border-accent focus-visible:shadow-[var(--shadow-focus)]",
        "aria-invalid:border-danger aria-invalid:shadow-none",
        (mono || isNumeric) && "font-mono tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export { Input }
