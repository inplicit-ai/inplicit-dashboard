import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // White-modernist textarea: 10px radius, hairline border, white surface,
        // roomy padding. Calm focus — the border deepens, no amber halo.
        "flex field-sizing-content min-h-20 w-full rounded-ui border border-line bg-surface px-3.5 py-2.5 text-[length:var(--text-body-sm)] leading-relaxed text-fg transition-colors outline-none placeholder:text-fg-faint hover:border-line-strong focus-visible:border-line-strong disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:shadow-none dark:bg-surface",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
