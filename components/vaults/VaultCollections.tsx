"use client";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * VaultCollections — the collection filter as a horizontal chip/segment row
 * (NOT a sidebar). Active chip lifts to a white surface; disabled chips
 * (Integrationen — coming soon) read greyed and inert.
 * ────────────────────────────────────────────────────────────────────────── */

export interface Collection {
  key: string;
  label: string;
  count?: number;
  disabled?: boolean;
  comingSoonLabel?: string;
}

export function VaultCollections({
  collections,
  active,
  onSelect,
}: {
  collections: Collection[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-full border border-line-subtle bg-surface-2 p-1">
      {collections.map((c) => {
        const isActive = c.key === active && !c.disabled;
        return (
          <button
            key={c.key}
            type="button"
            disabled={c.disabled}
            aria-current={isActive ? "true" : undefined}
            onClick={() => !c.disabled && onSelect(c.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[length:var(--text-body-sm)] font-medium transition-colors",
              c.disabled
                ? "cursor-not-allowed text-fg-faint"
                : isActive
                  ? "bg-surface text-fg shadow-card"
                  : "text-fg-muted hover:text-fg",
            )}
          >
            {c.label}
            {typeof c.count === "number" && !c.disabled && (
              <span className="tabular-nums text-fg-subtle">{c.count}</span>
            )}
            {c.comingSoonLabel && (
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[length:var(--text-caption)] text-fg-subtle">
                {c.comingSoonLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
