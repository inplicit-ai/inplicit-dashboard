"use client";

import * as React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * StatusRegister — participants (and staff/roles) as a typeset register, NOT a
 * zebra grid (wraps the `.register` recipe).
 *
 * Hairline row dividers, a single sticky Caps header, mono anon_id via
 * `.register__id`, an inline StatusDisc for interview state (rendered by the
 * caller inside a cell), and an amber LEFT-TICK on row hover (never a fill).
 * Sortable headers use `.register__sort` (active = amber underline).
 *
 * This is a thin, presentational shell over the recipe: callers supply column
 * defs and already-rendered cell nodes (so a cell can embed a StatusDisc, a
 * DataChip, or an expand toggle). Row click is optional (expand-to-reveal a
 * participant's interview timeline lives at the call site as an extra row).
 *
 * "use client" only for the sort-button affordance; rendering is otherwise
 * inert. Reuse existing i18n keys for header labels at the call site.
 * ────────────────────────────────────────────────────────────────────────── */

export interface RegisterColumn<Row> {
  /** Stable sort/identity key. */
  key: string;
  /** Header label (uppercased by the recipe). */
  label: string;
  /** Whether the column is sortable. */
  sortable?: boolean;
  /** Right-align numeric/mono columns. */
  align?: "left" | "right";
  /** Cell renderer for this column. */
  render: (row: Row) => React.ReactNode;
}

export interface StatusRegisterProps<Row> {
  columns: RegisterColumn<Row>[];
  rows: Row[];
  /** Stable row key extractor. */
  rowKey: (row: Row) => string;
  /** Active sort key (drives the amber underline). */
  sortKey?: string;
  /** Sort direction for the active key. */
  sortDir?: "asc" | "desc";
  /** Fires when a sortable header is activated. */
  onSort?: (key: string) => void;
  /** Optional per-row click (e.g. expand the participant timeline). */
  onRowClick?: (row: Row) => void;
  className?: string;
}

export function StatusRegister<Row>({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDir = "asc",
  onSort,
  onRowClick,
  className,
}: StatusRegisterProps<Row>) {
  return (
    <table className={cn("register", className)}>
      <thead>
        <tr>
          {columns.map((col) => {
            const active = col.key === sortKey;
            return (
              <th
                key={col.key}
                className={col.align === "right" ? "text-right" : undefined}
                aria-sort={
                  active
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {col.sortable && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className={cn(
                      "register__sort",
                      active && "register__sort--active",
                    )}
                  >
                    {col.label}
                    {active &&
                      (sortDir === "asc" ? (
                        <ChevronUp className="size-3" aria-hidden />
                      ) : (
                        <ChevronDown className="size-3" aria-hidden />
                      ))}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={onRowClick ? "cursor-pointer" : undefined}
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={col.align === "right" ? "text-right" : undefined}
              >
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
