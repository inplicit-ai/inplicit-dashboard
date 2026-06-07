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
  EmailTemplate,
  Goal,
  Locale,
  Person,
  ScheduleConfig,
  SetupToolCall,
  TopicGraph,
  TopicMethod,
  TopicNode,
} from "@/lib/api";

export const KNOWN_TOOLS = [
  "set_interview_type",
  "set_duration",
  "set_language",
  "set_goals",
  "refine_goal",
  "set_background",
  "set_context_vault",
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
] as const;

/** Methods an exploration angle may carry — mirrors the server `VALID_METHODS`. */
const VALID_METHODS = ["cit", "journey", "jtbd", "laddering", "paired_cit"];

export type KnownTool = (typeof KNOWN_TOOLS)[number];

function arg<T>(args: Record<string, unknown>, key: string): T | undefined {
  return args[key] as T | undefined;
}

/**
 * The canonical invite-email default — MUST mirror `default_email_template` in
 * backend/src/api/setup/tools.rs. Two shapes:
 *   - instant (Link): a direct single-use {{link}}, no slot.
 *   - slots (Buchbares Zeitfenster): invite to BOOK a time ({{link}} = booking
 *     page). Used by the deterministic schedule-mode coupling below.
 */
export function defaultEmailTemplate(
  locale: Locale,
  mode: "instant" | "slots",
): EmailTemplate {
  const de = locale === "de";
  if (mode === "slots") {
    return de
      ? {
          subject: "Kurzes Interview zu {{org}} – wähle deinen Termin",
          body:
            "Hallo {{participant}},\n\nwir führen kurze, vertrauliche Gespräche, um {{org}} besser zu verstehen, und deine Perspektive würde uns sehr helfen. Das Interview dauert etwa 20–30 Minuten und wird von einem KI-Interviewer geführt.\n\nWähle einfach einen Termin, der dir passt: {{link}}\n\nVielen Dank für deine Zeit!\n\nBeste Grüße\nDas {{org}}-Team",
        }
      : {
          subject: "A quick interview about {{org}} — pick your time",
          body:
            "Hi {{participant}},\n\nWe're running short, confidential conversations to better understand {{org}}, and your perspective would really help. The interview takes about 20–30 minutes and is led by an AI interviewer.\n\nJust pick a time that suits you: {{link}}\n\nThanks so much for your time!\n\nBest,\nThe {{org}} team",
        };
  }
  return de
    ? {
        subject: "Kurzes Interview zu {{org}} – dein persönlicher Link",
        body:
          "Hallo {{participant}},\n\nwir führen kurze, vertrauliche Gespräche, um {{org}} besser zu verstehen, und deine Perspektive würde uns sehr helfen. Das Interview dauert etwa 20–30 Minuten und wird von einem KI-Interviewer geführt.\n\nDein persönlicher Link: {{link}}\n\nDu kannst jederzeit starten, wenn es dir passt. Vielen Dank für deine Zeit!\n\nBeste Grüße\nDas {{org}}-Team",
      }
    : {
        subject: "A quick interview about {{org}} — your personal link",
        body:
          "Hi {{participant}},\n\nWe're running short, confidential conversations to better understand {{org}}, and your perspective would really help. The interview takes about 20–30 minutes and is led by an AI interviewer.\n\nYour personal link: {{link}}\n\nYou can start whenever it suits you. Thanks so much for your time!\n\nBest,\nThe {{org}} team",
      };
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
    // WHY-104: company context is selected from an org Context Vault (not free
    // text). `vaultId === ""` clears the selection. TODO(WHY-104): the server
    // `apply_patch` in backend/src/api/setup/tools.rs must mirror this case and
    // persist a `context_vault_id` — until then this patch is frontend-local.
    case "set_context_vault": {
      const vaultId = arg<string>(args, "vaultId") ?? "";
      return { ...draft, contextVaultId: vaultId || undefined };
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
    case "set_exploration_map": {
      // Wholesale, idempotent rebuild of the method-tagged exploration map.
      // Mirrors the server: ≤12 nodes, non-empty titles, valid method if present,
      // edges filtered to existing nodes.
      const rawNodes = arg<Array<Record<string, unknown>>>(args, "nodes");
      if (!Array.isArray(rawNodes) || rawNodes.length > 12) return draft;
      const ids = new Set<string>();
      const nodes: TopicNode[] = [];
      for (let i = 0; i < rawNodes.length; i++) {
        const n = rawNodes[i] ?? {};
        const title = typeof n.title === "string" ? n.title.trim() : "";
        if (!title) return draft;
        const rawMethod = typeof n.method === "string" ? n.method : undefined;
        if (rawMethod && !VALID_METHODS.includes(rawMethod)) return draft;
        const id = typeof n.id === "string" && n.id ? n.id : `t${i + 1}`;
        ids.add(id);
        const node: TopicNode = {
          id,
          title,
          summary: typeof n.summary === "string" ? n.summary : "",
        };
        if (rawMethod) node.method = rawMethod as TopicMethod;
        if (typeof n.incidentPrompt === "string" && n.incidentPrompt.trim())
          node.incidentPrompt = n.incidentPrompt;
        if (n.bidirectional === true) node.bidirectional = true;
        nodes.push(node);
      }
      const rawEdges = arg<Array<Record<string, unknown>>>(args, "edges") ?? [];
      const edges = rawEdges
        .filter(
          (e) =>
            e &&
            typeof e.a === "string" &&
            typeof e.b === "string" &&
            e.a !== e.b &&
            ids.has(e.a) &&
            ids.has(e.b),
        )
        .map((e) => ({
          a: e.a as string,
          b: e.b as string,
          relation: typeof e.relation === "string" ? e.relation : "relates_to",
        }));
      return { ...draft, topics: { nodes, edges } };
    }
    case "set_topic_method": {
      const id = arg<string>(args, "id");
      if (!id) return draft;
      const method = arg<string>(args, "method");
      if (method && !VALID_METHODS.includes(method)) return draft;
      const graph: TopicGraph = draft.topics ?? { nodes: [], edges: [] };
      const incidentPrompt = arg<string>(args, "incidentPrompt");
      const bidirectional = arg<boolean>(args, "bidirectional");
      const nodes = graph.nodes.map((n) => {
        if (n.id !== id) return n;
        const next: TopicNode = { ...n };
        if (method) next.method = method as TopicMethod;
        if (incidentPrompt !== undefined) next.incidentPrompt = incidentPrompt;
        if (bidirectional !== undefined) next.bidirectional = bidirectional;
        return next;
      });
      return { ...draft, topics: { nodes, edges: [...graph.edges] } };
    }
    case "remove_topic": {
      const id = arg<string>(args, "id");
      if (!id) return draft;
      const graph: TopicGraph = draft.topics ?? { nodes: [], edges: [] };
      return {
        ...draft,
        topics: {
          nodes: graph.nodes.filter((n) => n.id !== id),
          edges: graph.edges.filter((e) => e.a !== id && e.b !== id),
        },
      };
    }
    case "reweight_topic": {
      const id = arg<string>(args, "id");
      const weight = (arg<string>(args, "weight") ?? "normal") as
        | "primary"
        | "normal"
        | "muted";
      if (!id || !["primary", "normal", "muted"].includes(weight)) return draft;
      const graph: TopicGraph = draft.topics ?? { nodes: [], edges: [] };
      const nodes = graph.nodes.map((n) => {
        if (n.id !== id) return n;
        if (weight === "normal") {
          const next: TopicNode = { ...n };
          delete next.weight;
          return next;
        }
        return { ...n, weight };
      });
      return { ...draft, topics: { nodes, edges: [...graph.edges] } };
    }
    case "unlink_topics": {
      const a = arg<string>(args, "a");
      const b = arg<string>(args, "b");
      if (!a || !b) return draft;
      const graph: TopicGraph = draft.topics ?? { nodes: [], edges: [] };
      return {
        ...draft,
        topics: {
          nodes: [...graph.nodes],
          edges: graph.edges.filter(
            (e) => !((e.a === a && e.b === b) || (e.a === b && e.b === a)),
          ),
        },
      };
    }
    case "remove_goal": {
      const id = arg<string>(args, "id");
      if (!id) return draft;
      const goals = draft.goals ?? [];
      const exists = goals.some((g) => g.id === id);
      // Never strip the last goal (mirrors the launch gate + server reject).
      if (exists && goals.length <= 1) return draft;
      return { ...draft, goals: goals.filter((g) => g.id !== id) };
    }
    case "set_success_question": {
      const text = arg<string>(args, "text")?.trim();
      if (!text) return draft;
      const sc = draft.successCriteria ?? {
        mode: "inductive" as const,
        questions: [],
        hypotheses: [],
      };
      const questions = [...sc.questions];
      const index = arg<number>(args, "index");
      if (index === undefined || index === questions.length) {
        questions.push(text);
      } else if (index >= 0 && index < questions.length) {
        questions[index] = text;
      } else {
        return draft;
      }
      return { ...draft, successCriteria: { ...sc, questions } };
    }
    case "remove_success_question": {
      const index = arg<number>(args, "index");
      const sc = draft.successCriteria;
      if (
        !sc ||
        typeof index !== "number" ||
        index < 0 ||
        index >= sc.questions.length
      )
        return draft;
      return {
        ...draft,
        successCriteria: {
          ...sc,
          questions: sc.questions.filter((_, i) => i !== index),
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
    case "set_people": {
      // Full people[] (manual editor or CSV import). Keep rows AS-GIVEN —
      // including the in-progress blank a user is still typing into — and only
      // require a valid email at LAUNCH. (Filtering blanks here made "add a
      // person" impossible: the empty row was dropped before you could type.)
      const people = arg<Person[]>(args, "people");
      if (!Array.isArray(people) || people.length > 5000) return draft;
      const next = people.map((p) => ({ name: p.name, email: p.email ?? "" }));
      return { ...draft, people: next };
    }
    case "set_schedule": {
      const prev = draft.schedule;
      const nextMode: "instant" | "slots" =
        arg<string>(args, "mode") === "slots" ? "slots" : "instant";
      const next: ScheduleConfig = {
        mode: nextMode,
        windowStart: arg<string>(args, "windowStart") ?? prev?.windowStart,
        windowEnd: arg<string>(args, "windowEnd") ?? prev?.windowEnd,
        slotLengthMin: arg<number>(args, "slotLengthMin") ?? prev?.slotLengthMin ?? 30,
        timezone: arg<string>(args, "timezone") ?? prev?.timezone ?? "Europe/Berlin",
        slots: arg<ScheduleConfig["slots"]>(args, "slots") ?? prev?.slots ?? [],
      };
      // Deterministic email coupling: on a real mode change, if the invite is
      // still un-customized, swap in the default copy for the new mode so the
      // email never contradicts the schedule. Mirrors the server.
      const modeChanged = (prev?.mode ?? "instant") !== nextMode;
      if (modeChanged && !draft.emailCustomized) {
        const locale: Locale = draft.language?.default ?? "en";
        return {
          ...draft,
          schedule: next,
          emailTemplate: defaultEmailTemplate(locale, nextMode),
        };
      }
      return { ...draft, schedule: next };
    }
    case "set_email_template": {
      const subject = arg<string>(args, "subject") ?? draft.emailTemplate?.subject ?? "";
      const body = arg<string>(args, "body") ?? draft.emailTemplate?.body ?? "";
      const tpl: EmailTemplate = { subject, body };
      // Any edit marks the invite customized → mode changes leave it alone.
      return { ...draft, emailTemplate: tpl, emailCustomized: true };
    }
    case "set_objective": {
      // The sharpened research objective — a plain editable line at the top of
      // the catalog. It replaces the raw launchpad prompt; the user owns it.
      const text = arg<string>(args, "text")?.trim();
      if (!text) return draft;
      return { ...draft, prompt: text };
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

/**
 * Launch gates (doc 03 §8) — mirrors `validate_for_launch` server-side.
 * Returns a stable, ordered list of blocking reason codes; an empty list means
 * the draft is launch-ready. The order is fixed so the review checklist renders
 * deterministically. Codes are i18n keys under `setup.review.gates.*`.
 *
 * People + schedule gates land in O-5 (see backend comment); we surface them as
 * non-blocking advisories there. For O-4 the blocking set is: ≥1 goal, ≥1
 * success question/hypothesis, a sane duration, and a chosen interview type.
 */
export function validateForLaunch(draft: CampaignDraft): string[] {
  const reasons: string[] = [];

  if (!draft.goals || draft.goals.length === 0) reasons.push("no_goals");

  const sc = draft.successCriteria;
  const hasCriteria =
    (sc?.questions?.length ?? 0) > 0 || (sc?.hypotheses?.length ?? 0) > 0;
  if (!hasCriteria) reasons.push("no_success_criteria");

  const duration = draft.durationMin ?? 25;
  if (duration < 5 || duration > 90) reasons.push("bad_duration");

  const type = draft.interviewType ?? "voice";
  if (type !== "voice" && type !== "chat") reasons.push("no_interview_type");

  return reasons;
}
