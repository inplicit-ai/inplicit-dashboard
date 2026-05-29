import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-ui border border-line bg-surface px-3 py-2 text-[length:var(--text-body-sm)] text-fg shadow-none transition-colors outline-none placeholder:text-fg-faint hover:border-line-strong focus-visible:border-accent focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:shadow-none dark:bg-surface",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
