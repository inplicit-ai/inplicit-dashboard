"use client";

import * as React from "react";
import { Copy, RotateCcw, Quote } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { LedgerRow } from "@/components/ui/ledger-row";
import { DataChip } from "@/components/ui/data-chip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * ConversationTurn — calm chat / RAG / transcript turn (wraps the
 * `.conversation-turn` recipe).
 *
 * is-user  → near-black primary fill bubble, right-aligned.
 * is-assistant → calm surface, NO bubble border — 17px/1.6, 68ch measure.
 *
 * Under every assistant turn, a ghost icon-button Actions row (copy / retry /
 * cite) with tooltips fades in on hover/focus (CSS-driven via the recipe).
 * RAG citation chips (anon_id + utterance_index, mono) EXPAND IN PLACE into a
 * LedgerRow utterance branch — the answer and its evidence live in one
 * continuous tree, never a jump to a transcript view.
 *
 * Amber appears only on the focused composer + the live streaming indicator
 * (owned by the chat screen, not here). Motion gated by prefers-reduced-motion.
 *
 * Used in: setup agent chat, campaign RAG/ask, interview transcript echo —
 * always inside the ChatShell / ChatScroll envelope.
 * ────────────────────────────────────────────────────────────────────────── */

const APPLE_EASE = [0.2, 0.65, 0.3, 0.9] as const;

export interface TurnCitation {
  anonId: string;
  utteranceIndex: number;
  /** Optional verbatim quote revealed in the expanded utterance branch. */
  quote?: React.ReactNode;
}

export interface ConversationTurnActionHandlers {
  onCopy?: () => void;
  onRetry?: () => void;
  onCite?: () => void;
}

export interface ConversationTurnProps {
  role: "user" | "assistant";
  children: React.ReactNode;
  /**
   * Custom actions row (overrides the default copy/retry/cite). When omitted
   * and `actionHandlers` is provided, the canonical ghost buttons render.
   */
  actions?: React.ReactNode;
  /** Wire the canonical copy / retry / cite ghost buttons. */
  actionHandlers?: ConversationTurnActionHandlers;
  /** Localized tooltip labels (reuse existing i18n keys at the call site). */
  actionLabels?: { copy?: string; retry?: string; cite?: string };
  /** RAG citations — rendered as mono chips that expand in place. */
  citations?: TurnCitation[];
  className?: string;
}

function GhostAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className="inline-flex size-7 items-center justify-center rounded-ui border border-transparent bg-transparent text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Icon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ConversationTurn({
  role,
  children,
  actions,
  actionHandlers,
  actionLabels,
  citations,
  className,
}: ConversationTurnProps) {
  const reduceMotion = useReducedMotion();
  const isAssistant = role === "assistant";
  // Track which citations are expanded in place.
  const [openCitations, setOpenCitations] = React.useState<Set<number>>(
    () => new Set(),
  );

  const toggleCitation = React.useCallback((i: number) => {
    setOpenCitations((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const defaultActions =
    isAssistant && actionHandlers ? (
      <>
        {actionHandlers.onCopy && (
          <GhostAction
            label={actionLabels?.copy ?? "Copy"}
            icon={Copy}
            onClick={actionHandlers.onCopy}
          />
        )}
        {actionHandlers.onRetry && (
          <GhostAction
            label={actionLabels?.retry ?? "Retry"}
            icon={RotateCcw}
            onClick={actionHandlers.onRetry}
          />
        )}
        {actionHandlers.onCite && (
          <GhostAction
            label={actionLabels?.cite ?? "Cite"}
            icon={Quote}
            onClick={actionHandlers.onCite}
          />
        )}
      </>
    ) : null;

  const actionsContent = actions ?? defaultActions;

  return (
    <div
      className={cn(
        "conversation-turn",
        isAssistant ? "conversation-turn--assistant" : "conversation-turn--user",
        className,
      )}
    >
      <div className="conversation-turn__bubble">{children}</div>

      {/* Citation chips — expand IN PLACE into a LedgerRow utterance branch. */}
      {isAssistant && citations && citations.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          <div className="cluster">
            {citations.map((c, i) => (
              <button
                key={`${c.anonId}-${c.utteranceIndex}`}
                type="button"
                onClick={() => toggleCitation(i)}
                aria-expanded={openCitations.has(i)}
                className="appearance-none border-0 bg-transparent p-0"
              >
                <DataChip tone="neutral" mono>
                  {c.anonId} · #{c.utteranceIndex}
                </DataChip>
              </button>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {citations.map((c, i) =>
              openCitations.has(i) ? (
                <motion.div
                  key={`exp-${c.anonId}-${c.utteranceIndex}`}
                  className="overflow-hidden"
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={
                    reduceMotion ? undefined : { height: "auto", opacity: 1 }
                  }
                  exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: APPLE_EASE }}
                >
                  <LedgerRow
                    index={c.anonId}
                    status="done"
                    title={c.quote ?? `Utterance #${c.utteranceIndex}`}
                    metric={`#${c.utteranceIndex}`}
                    depth={1}
                  />
                </motion.div>
              ) : null,
            )}
          </AnimatePresence>
        </div>
      )}

      {actionsContent && (
        <div className="conversation-turn__actions">{actionsContent}</div>
      )}
    </div>
  );
}
