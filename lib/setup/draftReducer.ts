/**
 * Pure `applyPatch` reducer for the campaign setup catalog (O-3, doc 03 §2).
 *
 * The catalog is ONE immutable object (`CampaignDraft`). Two writers — the
 * agent (tool-call SSE events) and the user (field edits) — both produce the
 * SAME shape (`SetupToolCall`) and both run through this reducer. The reducer
 * NEVER mutates its input; it returns a new object (coding-style immutability
 * rule). It mirrors the server-side `apply_patch` in `backend/src/api/setup/
 * tools.rs`; the server is authoritative and validates at the boundary.
 */

import type {
  CampaignDraft,
  Goal,
  SetupToolCall,
  TopicGraph,
} from "@/lib/api";

export const KNOWN_TOOLS = [
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
] as const;

export type KnownTool = (typeof KNOWN_TOOLS)[number];

function arg<T>(args: Record<string, unknown>, key: string): T | undefined {
  return args[key] as T | undefined;
}

/**
 * Apply a single field-scoped patch, returning a NEW draft. Unknown tools and
 * `request_input` (which only asks the user to refine) are no-ops on the
 * catalog and return the draft unchanged.
 */
export function applyPatch(
  draft: CampaignDraft,
  call: SetupToolCall,
): CampaignDraft {
  const args = call.args ?? {};
  switch (call.tool) {
    case "set_interview_type": {
      const type = arg<string>(args, "type");
      if (type !== "voice" && type !== "chat") return draft;
      return { ...draft, interviewType: type };
    }
    case "set_duration": {
      const minutes = arg<number>(args, "minutes");
      if (typeof minutes !== "number" || minutes < 5 || minutes > 90)
        return draft;
      return { ...draft, durationMin: minutes };
    }
    case "set_language": {
      const def = arg<string>(args, "default");
      if (def !== "de" && def !== "en") return draft;
      const allowSwitch = arg<boolean>(args, "allowSwitch") ?? true;
      return { ...draft, language: { default: def, allowSwitch } };
    }
    case "set_goals": {
      const goals = arg<Goal[]>(args, "goals");
      if (!Array.isArray(goals) || goals.length === 0) return draft;
      return { ...draft, goals: [...goals] };
    }
    case "refine_goal": {
      const id = arg<string>(args, "id");
      const text = arg<string>(args, "text");
      if (!id || !text?.trim()) return draft;
      const existing = draft.goals ?? [];
      const found = existing.some((g) => g.id === id);
      const goals = found
        ? existing.map((g) => (g.id === id ? { ...g, text } : g))
        : [...existing, { id, text }];
      return { ...draft, goals };
    }
    case "set_background": {
      const notes = arg<string>(args, "notes") ?? "";
      const prev = draft.background ?? { notes: "", files: [] };
      return { ...draft, background: { ...prev, notes } };
    }
    case "add_topic": {
      const title = arg<string>(args, "title");
      if (!title?.trim()) return draft;
      const summary = arg<string>(args, "summary") ?? "";
      const graph: TopicGraph = draft.topics ?? { nodes: [], edges: [] };
      const id = arg<string>(args, "id") ?? `t${graph.nodes.length + 1}`;
      return {
        ...draft,
        topics: {
          nodes: [...graph.nodes, { id, title, summary }],
          edges: [...graph.edges],
        },
      };
    }
    case "link_topics": {
      const a = arg<string>(args, "a");
      const b = arg<string>(args, "b");
      const relation = arg<string>(args, "relation") ?? "relates_to";
      if (!a || !b || a === b) return draft;
      const graph: TopicGraph = draft.topics ?? { nodes: [], edges: [] };
      return {
        ...draft,
        topics: {
          nodes: [...graph.nodes],
          edges: [...graph.edges, { a, b, relation }],
        },
      };
    }
    case "set_success_criteria": {
      const mode = arg<string>(args, "mode");
      if (mode !== "deductive" && mode !== "inductive") return draft;
      const questions = arg<string[]>(args, "questions") ?? [];
      const hypotheses = arg<string[]>(args, "hypotheses") ?? [];
      return {
        ...draft,
        successCriteria: { mode, questions, hypotheses },
        inductiveFlag: mode === "inductive",
      };
    }
    case "add_must_ask": {
      const mode = arg<string>(args, "mode") ?? "questions";
      if (mode !== "questions" && mode !== "prove_hypothesis") return draft;
      const items = arg<{ id: string; text: string }[]>(args, "items") ?? [];
      return {
        ...draft,
        mustAsk: { mode, items },
        proveHypothesisMode: mode === "prove_hypothesis",
      };
    }
    case "set_audience": {
      const segments = arg<string[]>(args, "segments") ?? [];
      const filters =
        arg<Record<string, unknown>>(args, "filters") ?? {};
      return { ...draft, audience: { segments, filters } };
    }
    case "request_input":
      // No catalog change — the agent is asking the user to refine.
      return draft;
    default:
      return draft;
  }
}

/** Apply many patches in order, threading the new object through each step. */
export function applyAll(
  draft: CampaignDraft,
  calls: SetupToolCall[],
): CampaignDraft {
  return calls.reduce((acc, c) => applyPatch(acc, c), draft);
}

/** Launch gates — mirrors `validate_for_launch` server-side. */
export function validateForLaunch(draft: CampaignDraft): string[] {
  const reasons: string[] = [];
  if (!draft.goals || draft.goals.length === 0) reasons.push("no_goals");
  const sc = draft.successCriteria;
  const hasCriteria =
    (sc?.questions?.length ?? 0) > 0 || (sc?.hypotheses?.length ?? 0) > 0;
  if (!hasCriteria) reasons.push("no_success_criteria");
  return reasons;
}
