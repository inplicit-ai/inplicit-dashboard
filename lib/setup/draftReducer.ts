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
  ResearchBrief,
  ScheduleConfig,
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
  "set_people",
  "set_schedule",
  "set_email_template",
  "set_research_brief",
  "request_input",
] as const;

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
    case "set_research_brief": {
      const prev = draft.researchBrief;
      const stance = arg<string>(args, "stance") ?? prev?.stance ?? "open";
      if (stance !== "open" && stance !== "specific") return draft;
      const brief: ResearchBrief = {
        question: arg<string>(args, "question") ?? prev?.question ?? "",
        stance,
        scope: arg<string>(args, "scope") ?? prev?.scope ?? "",
        probesAsked: arg<number>(args, "probesAsked") ?? prev?.probesAsked ?? 0,
        confirmed: arg<boolean>(args, "confirmed") ?? prev?.confirmed ?? false,
      };
      return { ...draft, researchBrief: brief, inductiveFlag: stance === "open" };
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

  // The sharpened research question must be user-confirmed (hard gate).
  if (!draft.researchBrief?.confirmed) reasons.push("brief_not_confirmed");

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
