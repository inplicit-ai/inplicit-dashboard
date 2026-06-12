import type { SetupToolCallCard } from "@/lib/api";

/**
 * Shared presentation metadata for setup-agent (EDDA) tool calls.
 *
 * One source of truth for "what does this patch mean to a human" so the
 * compact confirmation rows (`ToolChecklist`) and the rich interactive card
 * (`ToolCallCard`) never drift apart.
 *
 * Three render lanes:
 *   - INTERACTIVE calls (request_input) → a card with reply chips, because
 *     they wait on the human.
 *   - CATALOG-COMMIT patches (set_goals, set_objective, …) → a compact, calm
 *     confirmation card (check + label + one-line summary) so the user can SEE
 *     each piece EDDA commits to the catalog, inline in the chat (WHY-120 was
 *     reversed: the catalog renders inline, but the chat now narrates too).
 *   - INTERNAL markers (set_setup_state) → never rendered; pure state-machine
 *     signalling from the backend.
 */

/** Tools that wait on the human — rendered as an inline prompt, not a row.
 *  Only a rare design question (request_input) qualifies. */
const INTERACTIVE_TOOLS = ["request_input"] as const;

/** Internal state-machine markers the backend emits — never shown in the chat. */
const HIDDEN_TOOLS = ["set_setup_state"] as const;

/** Catalog-commit patches — each one renders as a compact confirmation card so
 *  the user can follow what EDDA writes to the catalog, piece by piece. */
const COMMIT_TOOLS = [
  "set_objective",
  "set_goals",
  "set_exploration_map",
  "set_success_criteria",
  "set_language",
  "set_audience",
  "set_interview_type",
  "set_duration",
  "refine_goal",
  "set_topic_method",
  "reweight_topic",
  "add_topic",
  "remove_topic",
  "set_people",
  "set_success_question",
  "set_email_template",
] as const;

/** Every tool with a human label (kept in sync with the server reducer,
 *  `tools.rs`). Superset of the commit + interactive lanes plus a few patches
 *  that have a label but no dedicated card lane. */
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
  "set_exploration_map",
  "set_topic_method",
  "remove_topic",
  "reweight_topic",
  "unlink_topics",
  "remove_goal",
  "set_success_question",
  "remove_success_question",
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

/** Internal-only tools that must never produce a chat card. */
export function isHidden(tool: string): boolean {
  return (HIDDEN_TOOLS as readonly string[]).includes(tool);
}

/** Catalog-commit patches shown as a compact confirmation card. */
export function isCommit(tool: string): boolean {
  return (COMMIT_TOOLS as readonly string[]).includes(tool);
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
    case "set_exploration_map": {
      const n = Array.isArray(a.nodes) ? a.nodes.length : 0;
      return n ? `${n} angles` : "";
    }
    case "set_topic_method":
      return a.method ? `${a.id ?? "?"} → ${a.method}` : String(a.id ?? "");
    case "remove_topic":
      return String(a.title ?? a.id ?? "");
    case "reweight_topic":
      return `${a.id ?? "?"} → ${a.weight ?? "normal"}`;
    case "unlink_topics":
      return `${a.a ?? "?"} ⁄ ${a.b ?? "?"}`;
    case "remove_goal":
      return String(a.id ?? "");
    case "set_success_question":
      return String(a.text ?? "");
    case "remove_success_question":
      return a.index !== undefined ? `#${a.index}` : "";
    case "set_success_criteria": {
      const n = Array.isArray(a.questions) ? a.questions.length : 0;
      if (n) return `${n}`;
      return String(a.mode ?? "");
    }
    case "set_email_template":
      return String(a.subject ?? "");
    case "set_audience":
      return String(a.audience ?? a.description ?? "");
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
