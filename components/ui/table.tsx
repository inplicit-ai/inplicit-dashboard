import * as React from "react"

import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * Table — the spine register in tabular form.
 *
 * Drops zebra and the header surface fill: rows are separated only by hairlines,
 * the header is a bare tracked-eyebrow rule, hover is a surface step (never a
 * lift). The optional spine column (TableSpineHead / TableSpineCell) is a fixed
 * 28px cell holding a StatusDisc, so a data table lands its discs on the SAME
 * x-axis as every Ledger on every other screen. `mono` on a cell switches its
 * content to JetBrains Mono + tabular-nums for email / anon_id / status / score.
 * ────────────────────────────────────────────────────────────────────────── */

/** The fixed spine column width — matches the Ledger --spine-w (28px). */
const SPINE = "w-7 min-w-7 pl-4 pr-0"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-[length:var(--text-body-sm)]", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-line", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-line bg-surface-2 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        // Hover = surface step only, never shadow.
        "border-b border-line transition-colors hover:bg-surface-2 has-aria-expanded:bg-surface-2 data-[state=selected]:bg-surface-2",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        // Eyebrow header: 11px/600, 0.10em uppercase, tertiary text.
        "h-9 px-4 py-3 text-left align-middle text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] whitespace-nowrap text-fg-subtle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  mono = false,
  ...props
}: React.ComponentProps<"td"> & { mono?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        // Dense row rhythm: space-3 vertical / space-4 horizontal.
        "px-4 py-3 align-middle whitespace-nowrap text-fg [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        // Numeric / ID / status / timestamp cells render mono + tabular by prop.
        mono && "font-mono text-[length:var(--text-mono)] tabular-nums text-fg-muted",
        className
      )}
      {...props}
    />
  )
}

/** Bare spine header cell — the empty 28px column the status discs live under. */
function TableSpineHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-spine-head"
      aria-hidden
      className={cn(SPINE, "h-9 py-3", className)}
      {...props}
    />
  )
}

/** Spine body cell — holds a StatusDisc centered on the shared x-axis. */
function TableSpineCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-spine-cell"
      className={cn(SPINE, "py-3 align-middle", className)}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-[length:var(--text-body-sm)] text-fg-muted", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableSpineHead,
  TableSpineCell,
  TableCaption,
}
