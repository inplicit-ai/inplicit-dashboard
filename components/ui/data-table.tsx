import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/* ────────────────────────────────────────────────────────────────────────────
 * DataTable — the clean white-modernist table, ONLY for truly tabular data.
 *
 * Generous ~52px rows, hairline row separators, uppercase 12px tracked muted
 * column heads, sans tabular-nums numeric cells (NEVER mono), and a row tint on
 * hover. `mono` on a column is reserved for literal opaque IDs (anon_id, UUID).
 * Whole-row deep-link via `rowHref`. REPLACES the retired dense ".register".
 *
 * Column-driven so callers declare shape once; falls back to the styled <Table>
 * primitives for bespoke layouts. Server-safe: no "use client".
 * ────────────────────────────────────────────────────────────────────────── */

export interface DataTableColumn<Row> {
  /** Stable key; also used as the React key for the cell. */
  key: string
  header: React.ReactNode
  /** Cell renderer. */
  cell: (row: Row) => React.ReactNode
  /** Right-align + tabular-nums for numeric / count / date columns. */
  numeric?: boolean
  /** Monospace — ONLY for literal opaque IDs (anon_id, UUID, token). */
  mono?: boolean
  className?: string
  headClassName?: string
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  /** Stable row identity. */
  rowKey: (row: Row, index: number) => string
  /** Whole-row deep-link. */
  rowHref?: (row: Row) => string | undefined
  className?: string
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  rowHref,
  className,
}: DataTableProps<Row>) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                "text-[length:var(--text-caption)] uppercase tracking-[0.06em] text-fg-subtle",
                col.numeric && "text-right",
                col.headClassName
              )}
            >
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => {
          const href = rowHref?.(row)
          return (
            <TableRow
              key={rowKey(row, i)}
              className={cn(
                "border-line-subtle hover:bg-surface-2",
                href && "relative"
              )}
            >
              {columns.map((col, ci) => {
                const content = col.cell(row)
                // Whole-row link: the first cell hosts a position-absolute anchor
                // stretched over the (relative) row so any cell click navigates.
                const cellInner =
                  href && ci === 0 ? (
                    <Link
                      href={href}
                      className="after:absolute after:inset-0 after:content-['']"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )
                return (
                  <TableCell
                    key={col.key}
                    mono={col.mono}
                    className={cn(
                      "py-4",
                      col.numeric && "text-right tabular-nums",
                      col.className
                    )}
                  >
                    {cellInner}
                  </TableCell>
                )
              })}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
