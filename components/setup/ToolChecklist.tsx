"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";

import { StatusDisc, type StatusState } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";
import { isInteractive, labelFor, summarize } from "@/lib/setup/toolCardMeta";
import { ToolCallCard } from "./ToolCallCard";

/**
 * A turn's tool calls rendered as a quiet, claude.ai-style task list: each
 * field patch is one checklist row (a status disc + what EDDA did + a one-line
 * diff), appearing as it streams in. Interactive calls (a follow-up question)
 * keep their richer card with reply chips, since they wait on the human.
 *
 * The "still drafting…" shimmer lives in the chat trailer (`SetupChat`), not
 * here — this component only renders the resolved rows so the list reads as a
 * settled record of changes.
 */
export function ToolChecklist({
  cards,
  onReply,
  onConfirmBrief,
  briefConfirmed,
  streaming,
}: {
  cards: SetupToolCallCard[];
  onReply?: (message: string) => void;
  onConfirmBrief?: () => void;
  briefConfirmed?: boolean;
  streaming?: boolean;
}) {
  if (cards.length === 0) return null;

  return (
    <div className="mt-3.5 flex flex-col gap-2.5">
      {cards.map((card, i) =>
        isInteractive(card.tool) ? (
          <ToolCallCard
            key={i}
            card={card}
            onReply={onReply}
            onConfirmBrief={onConfirmBrief}
            briefConfirmed={briefConfirmed}
            streaming={streaming}
          />
        ) : (
          <ChecklistRow key={i} card={card} index={i} streaming={streaming} />
        ),
      )}
    </div>
  );
}

/** One settled field patch: status disc + human label + one-line diff. */
function ChecklistRow({
  card,
  index,
  streaming,
}: {
  card: SetupToolCallCard;
  index: number;
  streaming?: boolean;
}) {
  const t = useTranslations("setup.toolCard");
  const prefersReducedMotion = useReducedMotion();

  const rejected = card.applied === false;
  const status: StatusState = rejected ? "error" : "done";
  const label = labelFor(card.tool, t);
  const summary = summarize(card);

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.12 }
          : { type: "spring", stiffness: 520, damping: 30, delay: streaming ? 0 : index * 0.03 }
      }
      className="flex items-start gap-2.5"
    >
      <span className="mt-[3px] flex shrink-0 items-center justify-center">
        <StatusDisc state={status} size="sm" />
      </span>
      <span className="min-w-0 text-[length:var(--text-body)] leading-[1.5]">
        <span className={cn("font-medium", rejected ? "text-fg-muted" : "text-fg")}>
          {label}
        </span>
        {summary && (
          <span className="text-fg-muted">
            {" — "}
            {summary}
          </span>
        )}
      </span>
    </motion.div>
  );
}
