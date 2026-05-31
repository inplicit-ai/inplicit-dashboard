"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * CiteChip — an inline citation chip that highlights its tree target (wraps the
 * `.cite-chip` recipe).
 *
 * Renders a mono, square, amber-on-soft chip — "[ANON-3F2A · u#14]" — that is
 * load-bearing, not decoration. On hover/focus it asks the host to mark the
 * cited EvidenceTree row (set `.is-cited` → amber left tick) and scroll it into
 * view; on click it can pin that selection. Citations are the only ornament in
 * the conversation surface because they carry meaning.
 *
 * The chip is decoupled from the tree: it just emits the citation ref via
 * `onHover` (enter → ref, leave → null) and `onActivate`. The ConversationSpine
 * wires those to the tree's cited state + scroll.
 *
 * "use client" for the hover/click handlers.
 * ────────────────────────────────────────────────────────────────────────── */

export interface CiteChipProps {
  /** Machine identity, e.g. "ANON-3F2A". */
  anonId: string;
  /** Utterance index (tabular-nums). */
  utteranceIndex: number;
  /**
   * Opaque citation reference the host uses to find the tree row. Defaults to
   * `${anonId}-u${utteranceIndex}`.
   */
  citeRef?: string;
  /** Hover enter passes the ref; hover leave passes null. */
  onHover?: (ref: string | null) => void;
  /** Click / Enter activates (pin + scroll) the cited target. */
  onActivate?: (ref: string) => void;
  className?: string;
}

export function CiteChip({
  anonId,
  utteranceIndex,
  citeRef,
  onHover,
  onActivate,
  className,
}: CiteChipProps) {
  const ref = citeRef ?? `${anonId}-u${utteranceIndex}`;

  return (
    <button
      type="button"
      className={cn("cite-chip", className)}
      onMouseEnter={() => onHover?.(ref)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(ref)}
      onBlur={() => onHover?.(null)}
      onClick={() => onActivate?.(ref)}
      aria-label={`Citation ${anonId} utterance ${utteranceIndex}`}
    >
      {anonId} · u#{utteranceIndex}
    </button>
  );
}
