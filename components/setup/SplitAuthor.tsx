"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type {
  CampaignDraft,
  SetupMessage,
  SetupToolCall,
} from "@/lib/api";
import { applyPatch } from "@/lib/setup/draftReducer";
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

  // User-originated catalog edit: optimistic local apply + persist.
  const onPatch = useCallback(
    (call: SetupToolCall) => {
      setDraft((d) => applyPatch(d, call));
      api.setup
        .patchDraft(sessionId, { patch: call, base_rev: revRef.current })
        .then((res) => {
          revRef.current = res.revision;
          setDraft(res.config);
        })
        .catch(() => {
          // On conflict/failure, re-fetch authoritative state.
          api.setup
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

  const onLaunch = useCallback(() => {
    setLaunching(true);
    api.setup
      .launchDraft(sessionId)
      .then((res) => {
        router.push(`/campaigns/${res.campaign_id}`);
      })
      .catch(() => setLaunching(false));
  }, [sessionId, router]);

  const reasons = launchBlockers(draft);

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-4 lg:flex-row">
      {/* Left — chat */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line bg-elevated lg:max-w-[44%]">
        <SetupChat turns={turns} streaming={stream.streaming} onSend={onSend} />
      </div>

      {/* Right — catalog + launch bar */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <Catalog draft={draft} onPatch={onPatch} recentlyTouched={touched} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
          <ChecklistSummary reasons={reasons} />
          <Button
            onClick={onLaunch}
            disabled={reasons.length > 0 || launching}
            size="lg"
          >
            {launching ? tReview("launching") : tReview("launch")}
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
      <span className="text-sm font-medium text-success">{t("ok")}</span>
    );
  }
  return (
    <ul className="text-xs text-fg-muted">
      {reasons.map((r) => (
        <li key={r}>• {t(r === "no_goals" ? "noGoals" : "noSuccessCriteria")}</li>
      ))}
    </ul>
  );
}

function launchBlockers(draft: CampaignDraft): string[] {
  const reasons: string[] = [];
  if (!draft.goals || draft.goals.length === 0) reasons.push("no_goals");
  const sc = draft.successCriteria;
  const hasCriteria =
    (sc?.questions?.length ?? 0) > 0 || (sc?.hypotheses?.length ?? 0) > 0;
  if (!hasCriteria) reasons.push("no_success_criteria");
  return reasons;
}
