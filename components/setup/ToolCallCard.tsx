"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CircleAlert, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";

/**
 * The "AI explains itself" surface (Rams #4, doc 03 §3), restyled to the
 * agent-plan card aesthetic (design-contract §2/§3): hairline `rounded-card`
 * surface, a tinted status disc on the left, human label + one-line field diff.
 * Tokens only — accent for request-input, pain-soft for a rejected patch.
 */
export function ToolCallCard({
  card,
  onReply,
}: {
  card: SetupToolCallCard;
  onReply?: (message: string) => void;
}) {
  const t = useTranslations("setup.toolCard");
  const prefersReducedMotion = useReducedMotion();
  const label = labelFor(card.tool, t);
  const summary = summarize(card);

  const isRequestInput = card.tool === "request_input";
  const rejected = card.applied === false && !isRequestInput;

  // A follow-up question: render the prompt prominently with the agent's
  // example answers as one-tap reply chips so the question is actionable, not
  // just prose to read.
  const question = isRequestInput
    ? String(card.args?.question ?? card.args?.prompt ?? "")
    : "";
  const examples =
    isRequestInput && Array.isArray(card.args?.examples)
      ? (card.args!.examples as unknown[]).map(String).filter(Boolean)
      : [];

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.15 }
          : { type: "spring", stiffness: 500, damping: 28 }
      }
      className={cn(
        "flex items-start gap-2.5 rounded-card border border-line bg-surface px-3 py-2.5 text-sm transition-colors",
        isRequestInput && "border-accent-muted bg-accent-soft",
        rejected && "border-pain-muted bg-pain-soft",
      )}
    >
      <span
        className={cn(
          "mt-px flex size-5 shrink-0 items-center justify-center rounded-full",
          rejected
            ? "bg-pain-soft text-pain"
            : isRequestInput
              ? "bg-accent-soft text-accent"
              : "bg-surface-2 text-fg-subtle",
        )}
        aria-hidden
      >
        {rejected ? (
          <CircleAlert className="size-3" />
        ) : isRequestInput ? (
          <HelpCircle className="size-3" />
        ) : (
          <Check className="size-3" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">{label}</p>
        {isRequestInput ? (
          <>
            {question && (
              <p className="mt-1 text-sm leading-relaxed text-fg">{question}</p>
            )}
            {examples.length > 0 && onReply && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onReply(ex)}
                    className="rounded-full border border-accent-muted bg-surface px-3 py-1 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          summary && (
            <p className="truncate text-xs text-fg-muted">{summary}</p>
          )
        )}
      </div>
    </motion.div>
  );
}

function labelFor(tool: string, t: (k: string) => string): string {
  // Known tools have their own key; fall back to the raw tool name.
  const known = [
    "set_interview_type",
    "set_duration",
    "set_language",
    "set_goals",
    "refine_goal",
    "set_background",
    "add_topic",
    "link_topics",
    "set_success_criteria",
    "add_must_ask",
    "set_audience",
    "request_input",
  ];
  return known.includes(tool) ? t(tool) : tool;
}

/** A short, human diff of what changed — pulled from the tool args. */
function summarize(card: SetupToolCallCard): string {
  const a = card.args ?? {};
  switch (card.tool) {
    case "set_interview_type":
      return String(a.type ?? "");
    case "set_duration":
      return a.minutes ? `${a.minutes} min` : "";
    case "set_language": {
      const def = String(a.default ?? "");
      return a.allowSwitch ? `${def} (switchable)` : def;
    }
    case "set_goals": {
      const g = Array.isArray(a.goals) ? a.goals.length : 0;
      return g ? `${g} goals` : "";
    }
    case "refine_goal":
      return String(a.text ?? "");
    case "add_topic":
      return String(a.title ?? "");
    case "link_topics":
      return `${a.a ?? "?"} ↔ ${a.b ?? "?"}`;
    case "set_success_criteria":
      return String(a.mode ?? "");
    case "request_input":
      return String(a.question ?? a.prompt ?? "");
    default:
      return "";
  }
}
