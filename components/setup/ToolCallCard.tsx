"use client";

import { useTranslations } from "next-intl";
import { Check, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";

/**
 * The "AI explains itself" surface (Rams #4, doc 03 §3). Renders a single agent
 * tool call as a compact card: icon + human label + a one-line field diff.
 * White-first, hairline border, accent only on the just-applied eyebrow.
 */
export function ToolCallCard({ card }: { card: SetupToolCallCard }) {
  const t = useTranslations("setup.toolCard");
  const label = labelFor(card.tool, t);
  const summary = summarize(card);

  const isRequestInput = card.tool === "request_input";
  const rejected = card.applied === false && !isRequestInput;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-ui border border-line bg-surface px-3 py-2 text-sm",
        rejected && "border-pain/30 bg-pain-soft",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          rejected
            ? "bg-pain/10 text-pain"
            : isRequestInput
              ? "bg-accent/10 text-accent"
              : "bg-fg/5 text-fg-muted",
        )}
        aria-hidden
      >
        {rejected ? (
          <AlertCircle className="h-3 w-3" />
        ) : isRequestInput ? (
          <HelpCircle className="h-3 w-3" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-fg">{label}</p>
        {summary && (
          <p className="truncate text-xs text-fg-muted">{summary}</p>
        )}
      </div>
    </div>
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
