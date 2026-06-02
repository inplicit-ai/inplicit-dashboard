"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";

/**
 * A rare follow-up question from EDDA (request_input) — a DESIGN choice it
 * genuinely can't infer (who to interview, open vs. hypothesis). Rendered as a
 * clean inline prompt on a left accent rule with one-tap reply chips. No card
 * chrome, no beige fill — it reads as part of the conversation.
 *
 * EDDA never asks about the phenomenon (the causes/reasons the interviews are
 * meant to discover); those become catalog topics, not questions.
 */
export function ToolCallCard({
  card,
  onReply,
}: {
  card: SetupToolCallCard;
  onReply?: (message: string) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const question = String(card.args?.question ?? card.args?.prompt ?? "");
  const examples = Array.isArray(card.args?.examples)
    ? (card.args!.examples as unknown[]).map(String).filter(Boolean)
    : [];

  if (!question && examples.length === 0) return null;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.15 }
          : { type: "spring", stiffness: 500, damping: 28 }
      }
      className="flex flex-col gap-2.5 border-l-2 border-line-strong py-0.5 pl-3.5"
    >
      {question && (
        <p className="text-[length:var(--text-body)] leading-[1.6] text-fg">{question}</p>
      )}
      {examples.length > 0 && onReply && (
        <div className="flex flex-wrap gap-2">
          {examples.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onReply(ex)}
              className={cn(
                "rounded-full border border-line bg-surface px-3 py-1.5 text-[length:var(--text-caption)] text-fg-muted transition-colors",
                "hover:border-line-strong hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
