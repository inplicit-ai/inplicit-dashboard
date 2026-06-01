"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";

import { StatusDisc, type StatusState } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";

/**
 * The "AI explains itself" surface (Rams #4, doc 03 §3), in the white-modernist
 * clean style: a soft white card with a status disc, a human label, and a
 * one-line field diff. Status encodes lifecycle:
 *   applied        → done disc
 *   request_input  → pending disc (the agent is waiting on the human)
 *   rejected patch → error disc
 *
 * A follow-up question renders its prompt prominently with the agent's example
 * answers as one-tap soft reply pills so the question is actionable. Amber never
 * appears here; the live pulse lives on the header disc only.
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

  const status: StatusState = rejected
    ? "error"
    : isRequestInput
      ? "pending"
      : "done";

  // A follow-up question: surface the prompt + example answers as reply chips.
  const question = isRequestInput
    ? String(card.args?.question ?? card.args?.prompt ?? "")
    : "";
  const examples =
    isRequestInput && Array.isArray(card.args?.examples)
      ? (card.args!.examples as unknown[]).map(String).filter(Boolean)
      : [];

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.15 }
          : { type: "spring", stiffness: 500, damping: 28 }
      }
      className={cn(
        // Clean white card — soft border + a faint tint on the actionable states.
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
          <span className="shrink-0 font-mono text-[length:var(--text-caption)] tabular-nums text-fg-faint">
            {card.tool}
          </span>
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
    "set_email_template",
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
