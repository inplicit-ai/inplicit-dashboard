"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StatusDisc } from "@/components/ui/status-disc";
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

  // Confirm the research brief (Phase A → B). The state flip is DETERMINISTIC
  // (a plain PATCH, never trusted to the model); once persisted we kick off an
  // empty turn so EDDA sees `confirmed:true` and runs the Phase B catalog fill.
  const onConfirmBrief = useCallback(() => {
    if (stream.streaming) return;
    const confirmCall: SetupToolCall = {
      tool: "set_research_brief",
      args: { confirmed: true },
    };
    setDraft((d) => applyPatch(d, confirmCall));
    clientApi.setup
      .patchDraft(sessionId, { patch: confirmCall, base_rev: revRef.current })
      .then((res) => {
        revRef.current = res.revision;
        setDraft(res.config);
        const fillTurn: ChatTurn = {
          id: `a-fill-${Date.now()}`,
          role: "assistant",
          content: "",
          toolCalls: [],
        };
        streamTurnId.current = fillTurn.id;
        setTurns((prev) => [...prev, fillTurn]);
        void stream.send("");
      })
      .catch(() => {
        clientApi.setup
          .getSession(sessionId)
          .then((s) => {
            revRef.current = s.revision;
            setDraft(s.config);
          })
          .catch(() => {});
      });
  }, [sessionId, stream]);

  // Author screen does NOT launch directly (doc 03 §8). "Save" advances to the
  // condensed review + launch pad, which owns the terminal launch step.
  const onReview = useCallback(() => {
    setLaunching(true);
    router.push(`/campaigns/new/${sessionId}/review`);
  }, [sessionId, router]);

  const reasons = validateForLaunch(draft);

  return (
    // chat-fill makes this the flush, non-scrolling DIRECT child of .app-work:
    // it fills the viewport row exactly (height:100%; min-h:0; flex column) so
    // the PAGE never scrolls — only the chat message list and the catalog do.
    // surface-bleed keeps the full available width for the split author.
    // Stacks on mobile (chat pane caps at 50vh); fills height from md up.
    <div className="surface-bleed chat-fill p-4 md:p-6">
      {/* The 50/50 split is its OWN flex row inside the chat-fill column wrapper.
          .chat-fill forces flex-direction:column (the viewport height contract),
          which would otherwise defeat md:flex-row and stack EDDA above the
          catalog — so the split lives one level in, fills the remaining height,
          and owns the side-by-side layout. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        {/* Left — EDDA setup agent (50% on md+) */}
        <div className="flex max-h-[50vh] min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card md:max-h-none md:basis-1/2">
          <SetupChat
            turns={turns}
            streaming={stream.streaming}
            onSend={onSend}
            onConfirmBrief={onConfirmBrief}
            briefConfirmed={draft.researchBrief?.confirmed ?? false}
          />
        </div>

        {/* Right — campaign catalog + launch bar (50% on md+) */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 md:basis-1/2">
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pr-0.5">
            <Catalog draft={draft} onPatch={onPatch} recentlyTouched={touched} />
          </div>
          {/* Launch bar — the readiness checklist + the near-black primary CTA. */}
          <div className="flex shrink-0 flex-col gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <ChecklistSummary reasons={reasons} />
            <Button
              onClick={onReview}
              disabled={reasons.length > 0 || launching}
              size="lg"
              className="shrink-0"
            >
              {tReview("reviewCta")}
            </Button>
          </div>
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
