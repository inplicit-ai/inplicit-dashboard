"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { StatusDisc, type StatusState } from "@/components/ui/status-disc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";
import { labelFor, summarize } from "@/lib/setup/toolCardMeta";

/**
 * The "AI explains itself" surface (Rams #4, doc 03 §3), in the white-modernist
 * clean style. Three shapes:
 *   - `set_research_brief` → the sharpened question + stance, with the in-chat
 *     Confirm affordance (Phase A → B gate). See {@link BriefCard}.
 *   - `request_input`      → a follow-up question with one-tap reply pills.
 *   - any field patch      → a soft card with a status disc + one-line diff.
 * Amber never appears here; the live pulse lives on the header disc only.
 */
export function ToolCallCard({
  card,
  onReply,
  onConfirmBrief,
  briefConfirmed,
  streaming,
}: {
  card: SetupToolCallCard;
  onReply?: (message: string) => void;
  onConfirmBrief?: () => void;
  briefConfirmed?: boolean;
  streaming?: boolean;
}) {
  const t = useTranslations("setup.toolCard");
  const prefersReducedMotion = useReducedMotion();

  const enter = prefersReducedMotion
    ? { initial: false as const, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, y: 6 },
        transition: { type: "spring" as const, stiffness: 500, damping: 28 },
      };

  if (card.tool === "set_research_brief") {
    return (
      <BriefCard
        card={card}
        onConfirmBrief={onConfirmBrief}
        confirmed={briefConfirmed}
        streaming={streaming}
        enter={enter}
      />
    );
  }

  const label = labelFor(card.tool, t);
  const summary = summarize(card);

  const isRequestInput = card.tool === "request_input";
  const rejected = card.applied === false && !isRequestInput;

  const status: StatusState = rejected
    ? "error"
    : isRequestInput
      ? "pending"
      : "done";

  const question = isRequestInput
    ? String(card.args?.question ?? card.args?.prompt ?? "")
    : "";
  const examples =
    isRequestInput && Array.isArray(card.args?.examples)
      ? (card.args!.examples as unknown[]).map(String).filter(Boolean)
      : [];

  return (
    <motion.div
      initial={enter.initial}
      animate={{ opacity: 1, y: 0 }}
      transition={enter.transition}
      className={cn(
        "grid grid-cols-[1.25rem_1fr] items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-[length:var(--text-body)] shadow-card",
        isRequestInput && "border-accent-muted bg-accent-soft shadow-none",
        rejected && "border-pain-muted bg-pain-soft shadow-none",
      )}
    >
      <span className="flex h-5 items-center justify-center">
        <StatusDisc state={status} size="sm" />
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-medium text-fg">{label}</span>
        </div>

        {isRequestInput ? (
          <>
            {question && (
              <p className="mt-1.5 text-[length:var(--text-body)] leading-[1.6] text-fg">
                {question}
              </p>
            )}
            {examples.length > 0 && onReply && (
              <div className="mt-3 flex flex-wrap gap-2">
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onReply(ex)}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-[length:var(--text-caption)] text-fg-muted transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          summary && (
            <p className="mt-0.5 truncate text-[length:var(--text-meta)] text-fg-muted">
              {summary}
            </p>
          )
        )}
      </div>
    </motion.div>
  );
}

/**
 * The research-brief card — EDDA's sharpened question with a stance badge and
 * the Phase A→B gate. Before confirmation it shows a prominent Confirm button
 * ("the button appears in the chat"); once confirmed it settles to a done state.
 */
function BriefCard({
  card,
  onConfirmBrief,
  confirmed,
  streaming,
  enter,
}: {
  card: SetupToolCallCard;
  onConfirmBrief?: () => void;
  confirmed?: boolean;
  streaming?: boolean;
  enter: {
    initial: false | { opacity: number; y: number };
    transition: object;
  };
}) {
  const t = useTranslations("setup.toolCard");
  const question = String(card.args?.question ?? "");
  const scope = String(card.args?.scope ?? "");
  const stance = card.args?.stance === "specific" ? "specific" : "open";
  const isConfirmed = confirmed ?? false;

  return (
    <motion.div
      initial={enter.initial}
      animate={{ opacity: 1, y: 0 }}
      transition={enter.transition}
      className={cn(
        "flex flex-col gap-3 rounded-md border px-4 py-3.5 shadow-none",
        isConfirmed
          ? "border-line bg-surface"
          : "border-accent-muted bg-accent-soft",
      )}
    >
      <div className="flex items-center gap-2">
        <StatusDisc state={isConfirmed ? "done" : "pending"} size="sm" />
        <span className="text-[length:var(--text-caption)] font-semibold uppercase tracking-[0.05em] text-fg-subtle">
          {t("researchBriefLabel")}
        </span>
        <span
          className={cn(
            "ml-auto rounded-full border px-2 py-0.5 text-[length:var(--text-caption)] font-medium",
            stance === "specific"
              ? "border-line text-fg-muted"
              : "border-line text-fg-muted",
          )}
        >
          {t(stance === "specific" ? "stanceSpecific" : "stanceOpen")}
        </span>
      </div>

      <p className="text-[length:var(--text-body-lg)] font-medium leading-[1.5] text-fg">
        {question || "—"}
      </p>
      {scope && (
        <p className="text-[length:var(--text-meta)] text-fg-muted">{scope}</p>
      )}

      {isConfirmed ? (
        <span className="flex items-center gap-1.5 text-[length:var(--text-meta)] font-medium text-fg-muted">
          <Check className="size-3.5" />
          {t("briefConfirmed")}
        </span>
      ) : (
        onConfirmBrief && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button
              type="button"
              size="sm"
              onClick={onConfirmBrief}
              disabled={streaming || !question}
            >
              {t("confirmBrief")}
            </Button>
            <span className="text-[length:var(--text-caption)] text-fg-subtle">
              {t("confirmBriefHint")}
            </span>
          </div>
        )
      )}
    </motion.div>
  );
}
