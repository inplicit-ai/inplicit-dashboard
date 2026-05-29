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
export function ToolCallCard({ card }: { card: SetupToolCallCard }) {
  const t = useTranslations("setup.toolCard");
  const prefersReducedMotion = useReducedMotion();
  const label = labelFor(card.tool, t);
  const summary = summarize(card);

  const isRequestInput = card.tool === "request_input";
  const rejected = card.applied === false && !isRequestInput;

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
      <div className="min-w-0">
        <p className="font-medium text-fg">{label}</p>
        {summary && <p className="truncate text-xs text-fg-muted">{summary}</p>}
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
      return String(a.prompt ?? "");
    default:
      return "";
  }
}
