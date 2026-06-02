import type { SetupToolCallCard } from "@/lib/api";

/**
 * Shared presentation metadata for setup-agent (EDDA) tool calls.
 *
 * One source of truth for "what does this patch mean to a human" so the
 * compact checklist rows (`ToolChecklist`) and the rich interactive card
 * (`ToolCallCard`) never drift apart.
 *
 * Two render lanes:
 *   - FIELD patches (set_goals, add_topic, …) → quiet checklist rows.
 *   - INTERACTIVE calls (request_input, …)    → a card with buttons/chips
 *     because they wait on the human.
 */

/** Tools that wait on the human — rendered as an inline prompt, not a log row.
 *  Only a rare design question (request_input) qualifies. */
const INTERACTIVE_TOOLS = ["request_input"] as const;

/** Known field tools — kept in sync with the server reducer (`tools.rs`). */
const KNOWN_TOOLS = [
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
  "set_people",
  "set_schedule",
  "set_email_template",
  "set_objective",
  "request_input",
];

export function isInteractive(tool: string): boolean {
  return (INTERACTIVE_TOOLS as readonly string[]).includes(tool);
}

/** Human label for a tool — translated, falling back to the raw tool name. */
export function labelFor(tool: string, t: (k: string) => string): string {
  return KNOWN_TOOLS.includes(tool) ? t(tool) : tool;
}

/** A short, human diff of what changed — pulled from the tool args. */
export function summarize(card: SetupToolCallCard): string {
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
    case "set_email_template":
      return String(a.subject ?? "");
    case "set_people": {
      const n = Array.isArray(a.people) ? a.people.length : 0;
      return n ? `${n} people` : "";
    }
    case "set_schedule":
      return a.mode === "slots" ? "booking slots" : "instant link";
    case "set_objective":
      return String(a.text ?? "");
    case "request_input":
      return String(a.question ?? a.prompt ?? "");
    default:
      return "";
  }
}
