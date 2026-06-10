"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { StatusDisc } from "@/components/ui/status-disc";
import { clientApi } from "@/lib/client-api";
import { useSetSetupHeaderAction } from "@/components/setup/SetupActionContext";
import type {
  CampaignDraft,
  SetupMessage,
  SetupToolCall,
  Vault,
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
 *
 * WHY-104 scope note: this ticket reworks the create-flow CHROME (step bar,
 * suggestion cards, catalog framing) only. The "smart configure chatbot" — the
 * EDDA brain that drives this left pane — is explicitly OUT OF SCOPE here and is
 * owned by the separate EDDA epic; the existing chat is left untouched.
 */
export function SplitAuthor({
  sessionId,
  initialDraft,
  initialRevision,
  initialMessages,
  orgName,
  vaults,
}: {
  sessionId: string;
  initialDraft: CampaignDraft;
  initialRevision: number;
  initialMessages: SetupMessage[];
  orgName?: string;
  vaults?: Vault[];
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
  // Drives edda's avatar status node (red dot) — set on an agent error, cleared
  // the moment the next turn starts producing.
  const [agentError, setAgentError] = useState(false);

  // Mutable refs for the streaming assistant turn so SSE callbacks accumulate
  // into the latest turn without stale closures.
  const streamTurnId = useRef<string | null>(null);

  const stream = useSetupStream(sessionId, {
    onHint: (e) => {
      // The shape EDDA announced for this turn — drives the layout-true skeleton
      // the chat shows while the turn is still generating.
      setTurns((prev) =>
        prev.map((t) =>
          t.id === streamTurnId.current ? { ...t, layout: e.layout } : t,
        ),
      );
    },
    onToken: (text) => {
      setAgentError(false);
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
      setAgentError(true);
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
      setAgentError(false);
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
  // Keep a stable ref to stream.send so the effect dep array stays empty.
  const sendRef = useRef(stream.send);
  useEffect(() => { sendRef.current = stream.send; });

  useEffect(() => {
    if (initiatedRef.current) return;
    const hasAssistant = turns.some((t) => t.role === "assistant");
    if (hasAssistant) return;
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
    // Empty dep array + ref guard = fires exactly once on mount.
    queueMicrotask(() => {
      setTurns((prev) => [...prev, assistantTurn]);
      // Empty/kickoff message: the backend opens with its greeting + first probe.
      void sendRef.current("");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // User-originated catalog edit: optimistic local apply + persist.
  const onPatch = useCallback(
    (call: SetupToolCall) => {
      setDraft((d) => applyPatch(d, call));
      clientApi.setup
        .patchDraft(sessionId, { patch: call, base_rev: revRef.current })
        .then((res) => {
          // Only update the revision, NOT the full draft — overwriting draft
          // from the server response would race against fast typing (text fields)
          // and against concurrent AI tool-call patches, causing inputs to reset.
          revRef.current = res.revision;
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

  // Publish the launch-readiness state to the step-bar header (SetupSteps),
  // which renders "Prüfen & starten" next to "Abbrechen". Clears on unmount.
  const setHeaderAction = useSetSetupHeaderAction();
  useEffect(() => {
    setHeaderAction({
      onReview,
      blocked: reasons.length > 0 || launching,
      gateReason: reasons[0] ?? null,
    });
    return () => setHeaderAction(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reasons.length, launching]);

  return (
    // chat-fill makes this the flush, non-scrolling DIRECT child of .app-work:
    // it fills the viewport row exactly (height:100%; min-h:0; flex column) so
    // the PAGE never scrolls — only the chat message list and the catalog do.
    // surface-bleed keeps the full available width for the split author.
    <div className="surface-bleed chat-fill p-4 md:p-6">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Full-width EDDA setup chat — no bottom bar; CTA lives in step header */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <SetupChat
            turns={turns}
            streaming={stream.streaming}
            error={agentError}
            onSend={onSend}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Launch readiness as a status-spine register — every blocking gate is a row
 * on the shared spine (idle disc + gate copy), collapsing to one "ready" line
 * with the lone done disc when the draft validates.
 */
function ChecklistSummary({ reasons }: { reasons: string[] }) {
  const t = useTranslations("setup.review");
  if (reasons.length === 0) {
    return (
      <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
        <StatusDisc state="done" size="sm" />
        {t("ready")}
      </span>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {reasons.map((r) => (
        <li key={r} className="flex items-center gap-2.5">
          <StatusDisc state="idle" size="sm" />
          <span className="text-[13px] text-fg-muted">{t(`gates.${r}`)}</span>
        </li>
      ))}
    </ul>
  );
}
