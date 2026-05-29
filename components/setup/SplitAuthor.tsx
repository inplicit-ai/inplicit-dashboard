"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientApi } from "@/lib/client-api";
import type {
  CampaignDraft,
  SetupMessage,
  SetupToolCall,
} from "@/lib/api";
import { applyPatch, validateForLaunch } from "@/lib/setup/draftReducer";
import { useSetupStream } from "@/lib/setup/useSetupStream";
import { SetupChat, type ChatTurn } from "./SetupChat";
import { Catalog } from "./Catalog";

/**
 * Split author screen (doc 03 §1.2). Left = AI chat with tool-call cards; right
 * = editable catalog. ONE immutable CampaignDraft, two writers:
 *   - agent: SSE `tool_call` events → applyPatch (instant local) + server persists
 *   - user:  catalog field edits → applyPatch (optimistic) + PATCH /setup-drafts
 *
 * A simple drag handle resizes the panes; stacks on mobile.
 */
export function SplitAuthor({
  sessionId,
  initialDraft,
  initialRevision,
  initialMessages,
}: {
  sessionId: string;
  initialDraft: CampaignDraft;
  initialRevision: number;
  initialMessages: SetupMessage[];
}) {
  const router = useRouter();
  const tReview = useTranslations("setup.review");

  const [draft, setDraft] = useState<CampaignDraft>(initialDraft);
  const revRef = useRef<number>(initialRevision);
  const [turns, setTurns] = useState<ChatTurn[]>(() =>
    initialMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        toolCalls: m.tool_calls ?? [],
      })),
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [launching, setLaunching] = useState(false);

  // Mutable refs for the streaming assistant turn so SSE callbacks accumulate
  // into the latest turn without stale closures.
  const streamTurnId = useRef<string | null>(null);

  const stream = useSetupStream(sessionId, {
    onToken: (text) => {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === streamTurnId.current
            ? { ...t, content: t.content + text }
            : t,
        ),
      );
    },
    onToolCall: (e) => {
      // Apply locally for instant catalog feedback (server already persisted).
      setDraft((d) => applyPatch(d, { tool: e.tool, args: e.args }));
      if (typeof e.revision === "number") revRef.current = e.revision;
      setTouched((prev) => new Set(prev).add(e.tool));
      setTurns((prev) =>
        prev.map((t) =>
          t.id === streamTurnId.current
            ? {
                ...t,
                toolCalls: [
                  ...t.toolCalls,
                  {
                    tool: e.tool,
                    args: e.args,
                    revision: e.revision,
                    applied: e.applied,
                  },
                ],
              }
            : t,
        ),
      );
    },
    onError: (e) => {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === streamTurnId.current
            ? {
                ...t,
                toolCalls: [
                  ...t.toolCalls,
                  { tool: e.tool ?? "error", args: {}, applied: false },
                ],
              }
            : t,
        ),
      );
    },
    onDone: (e) => {
      if (typeof e.revision === "number") revRef.current = e.revision;
      // Fade the "updated by assistant" markers after a beat.
      setTimeout(() => setTouched(new Set()), 2500);
    },
  });

  const onSend = useCallback(
    (message: string) => {
      const userTurn: ChatTurn = {
        id: `u-${Date.now()}`,
        role: "user",
        content: message,
        toolCalls: [],
      };
      const assistantTurn: ChatTurn = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "",
        toolCalls: [],
      };
      streamTurnId.current = assistantTurn.id;
      setTurns((prev) => [...prev, userTurn, assistantTurn]);
      void stream.send(message);
    },
    [stream],
  );

  // Proactive opening turn (doc 03 §7): when the conversation has no assistant
  // turn yet, kick off the agent's first message on mount so the user lands in
  // an active, guided session rather than an empty pane. No user bubble is
  // rendered — only an assistant placeholder that the SSE stream fills in.
  // Runs at most once via the ref guard.
  const initiatedRef = useRef(false);
  useEffect(() => {
    if (initiatedRef.current) return;
    const hasAssistant = turns.some((t) => t.role === "assistant");
    if (hasAssistant || stream.streaming) return;
    initiatedRef.current = true;
    const assistantTurn: ChatTurn = {
      id: `a-open-${Date.now()}`,
      role: "assistant",
      content: "",
      toolCalls: [],
    };
    streamTurnId.current = assistantTurn.id;
    // Defer the placeholder insert + kickoff out of the synchronous effect body
    // so this reads as an external-system trigger (start the SSE stream) rather
    // than a render-time state cascade. The ref guard keeps it strictly once.
    queueMicrotask(() => {
      setTurns((prev) => [...prev, assistantTurn]);
      // Empty/kickoff message: the backend opens with its greeting + first probe.
      void stream.send("");
    });
  }, [turns, stream]);

  // User-originated catalog edit: optimistic local apply + persist.
  const onPatch = useCallback(
    (call: SetupToolCall) => {
      setDraft((d) => applyPatch(d, call));
      clientApi.setup
        .patchDraft(sessionId, { patch: call, base_rev: revRef.current })
        .then((res) => {
          revRef.current = res.revision;
          setDraft(res.config);
        })
        .catch(() => {
          // On conflict/failure, re-fetch authoritative state.
          clientApi.setup
            .getSession(sessionId)
            .then((s) => {
              revRef.current = s.revision;
              setDraft(s.config);
            })
            .catch(() => {});
        });
    },
    [sessionId],
  );

  // Author screen does NOT launch directly (doc 03 §8). "Save" advances to the
  // condensed review + launch pad, which owns the terminal launch step.
  const onReview = useCallback(() => {
    setLaunching(true);
    router.push(`/campaigns/new/${sessionId}/review`);
  }, [sessionId, router]);

  const reasons = validateForLaunch(draft);

  return (
    // surface-bleed opts this single route child out of the .app-work reading
    // cap → full available width for the dense split author (design-contract §7).
    // Height is anchored to the topbar-only chat token — no hardcoded 100vh math
    // (design-contract §3/§6.1). Stacks on mobile; the chat pane caps at 50vh
    // below md and fills height from md up.
    <div className="surface-bleed flex min-h-0 flex-col gap-4 md:h-[var(--chat-height-bare)] md:flex-row">
      {/* Left — chat */}
      <div className="flex max-h-[50vh] min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line bg-surface md:max-h-none md:max-w-[44%]">
        <SetupChat turns={turns} streaming={stream.streaming} onSend={onSend} />
      </div>

      {/* Right — catalog + launch bar */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pr-0.5">
          <Catalog draft={draft} onPatch={onPatch} recentlyTouched={touched} />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 rounded-card border border-line bg-surface px-4 py-3">
          <ChecklistSummary reasons={reasons} />
          <Button
            onClick={onReview}
            disabled={reasons.length > 0 || launching}
            size="lg"
          >
            {tReview("reviewCta")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChecklistSummary({ reasons }: { reasons: string[] }) {
  const t = useTranslations("setup.review");
  if (reasons.length === 0) {
    return (
      <span className="flex items-center gap-2 text-sm font-medium text-success">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        {t("ready")}
      </span>
    );
  }
  return (
    <ul className="flex flex-col gap-1 text-xs text-fg-muted">
      {reasons.map((r) => (
        <li key={r} className="flex items-start gap-2">
          <span className="status-disc status-disc--sm status-disc--idle mt-1 shrink-0" />
          <span>{t(`gates.${r}`)}</span>
        </li>
      ))}
    </ul>
  );
}
