"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import type { SetupToolCallCard } from "@/lib/api";
import { labelFor, summarize } from "@/lib/setup/toolCardMeta";

/**
 * A compact, calm confirmation that EDDA committed one piece to the catalog
 * (set_goals, set_objective, …). A small muted row: a check glyph, the human
 * label, and a one-line summary of what changed — so the user can SEE what's
 * happening without the chat getting loud. The live catalog still renders the
 * full value; this is just the narration.
 */
export function ToolCommitCard({ card }: { card: SetupToolCallCard }) {
  const prefersReducedMotion = useReducedMotion();
  const t = useTranslations("setup.toolCard");

  const label = labelFor(card.tool, t);
  const summary = summarize(card);

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.15 }
          : { type: "spring", stiffness: 500, damping: 28 }
      }
      className="flex items-center gap-2 text-[length:var(--text-caption)] text-fg-muted"
    >
      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-subtle ring-1 ring-line">
        <Check className="size-2.5" strokeWidth={2.5} />
      </span>
      <span className="font-medium text-fg-muted">{label}</span>
      {summary && (
        <>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span className="truncate text-fg-subtle">{summary}</span>
        </>
      )}
    </motion.div>
  );
}
