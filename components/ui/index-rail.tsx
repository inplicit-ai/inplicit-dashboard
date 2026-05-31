"use client";

import * as React from "react";
import Link from "next/link";

import { StatusDisc, type StatusState } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * IndexRail — the typeset numbered table-of-contents nav (wraps the
 * `.index-rail` / `.index-group` / `.index-item` recipes).
 *
 * Replaces the icon + pill sidebar entirely. A printed TOC:
 *   01 Overview · 02 Participants · 03 Insights · 04 Clusters · 05 Hypotheses
 *   · 06 Ask
 * Active item = a 2px amber inset tick + weight-to-600 shift ONLY — never a
 * fill (that would spend the one amber on chrome). Collapses to a 56px
 * numeral-only rail (`collapsed`), driven by the EditorialShell modifier.
 *
 * An optional trailing StatusDisc per item surfaces live sections (e.g. an
 * interview running under "01 Overview") — the one place the rail may pulse.
 *
 * Groups are separated by hairline dividers. Active selection is matched on the
 * item `id` so callers stay decoupled from href shape.
 * ────────────────────────────────────────────────────────────────────────── */

export interface IndexItem {
  /** Stable id matched against `activeId`. */
  id: string;
  /** Mono section number, e.g. "01". */
  num: string;
  /** Section label (uppercased by the recipe). */
  label: string;
  /** Destination route. */
  href: string;
  /** Optional live/idle disc shown trailing the label. */
  status?: StatusState;
}

export interface IndexGroup {
  /** Stable key for the group. */
  id: string;
  items: IndexItem[];
}

export interface IndexRailProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  groups: IndexGroup[];
  /** Currently active item id — gets the amber inset tick + weight shift. */
  activeId: string;
  /** Numeral-only 56px rail. Usually driven by the EditorialShell. */
  collapsed?: boolean;
}

export function IndexRail({
  groups,
  activeId,
  collapsed = false,
  className,
  ...props
}: IndexRailProps) {
  return (
    <nav
      className={cn("index-rail", className)}
      aria-label="Sections"
      {...props}
    >
      {groups.map((group) => (
        <div className="index-group" key={group.id}>
          {group.items.map((item) => {
            const active = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("index-item", active && "index-item--active")}
              >
                <span className="index-item__num" aria-hidden>
                  {item.num}
                </span>
                <span className="index-item__label inline-flex items-center gap-2">
                  {item.label}
                  {item.status && (
                    <StatusDisc state={item.status} size="sm" />
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
