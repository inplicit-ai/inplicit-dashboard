"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import {
  ChatScrollAnchored,
  ChatShell,
  ChatComposerBar,
} from "@/components/ui/chat-shell";
import { PromptInputAction } from "@/components/ui/prompt-input";
import { StaticVoiceOrb } from "@/components/interview/StaticVoiceOrb";
import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";
import { leadSentences } from "@/lib/setup/leadSentences";
import { ToolChecklist } from "./ToolChecklist";
import { EddaAvatar, type EddaStatus } from "./EddaAvatar";

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: SetupToolCallCard[];
};

/**
 * The setup agent (edda) chat pane. Calm, roomy turns — user = a near-black
 * bubble, assistant = a borderless reading column. The header carries edda's
 * glowing orb (status lives ON the orb now), nothing else. The reply
 * SUGGESTIONS edda offers are lifted out of the message flow and shown directly
 * above the composer; proposed points render as hairline-separated boxes so a
 * proposal reads distinctly from edda's prose.
 */
export function SetupChat({
  turns,
  streaming,
  error,
  onSend,
}: {
  turns: ChatTurn[];
  streaming: boolean;
  error?: boolean;
  onSend: (message: string) => void;
}) {
  const t = useTranslations("setup.chat");
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState("");

  function submit() {
    const msg = value.trim();
    if (!msg || streaming) return;
    onSend(msg);
    setValue("");
  }

  const status: EddaStatus = streaming ? "writing" : error ? "error" : "ready";

  const turnTransition = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, stiffness: 500, damping: 30 };

  // The actively-streaming turn is always the last one while `streaming` holds.
  const lastTurn = turns[turns.length - 1];
  const lastId = lastTurn?.id;
  // True once that turn has begun emitting prose: we reveal EDDA's opening lines
  // and mask the still-generating body with a pulsing skeleton.
  const leadStreaming = streaming && !!lastTurn?.content;

  return (
    <ChatShell height="fill">
      {/* Header — edda's orb (status lives on the orb) + lowercase name. */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-canvas px-5 py-4">
        <EddaAvatar size={36} status={status} />
        <p className="text-[length:var(--text-subtitle)] font-semibold tracking-[-0.01em] text-fg">
          edda
        </p>
      </header>

      {/* Conversation — the single scroll region, stick-to-bottom + floating pill. */}
      <ChatScrollAnchored
        dep={[turns.length, streaming]}
        live={streaming}
        scrollLabel={t("send")}
        className="px-5 py-6"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
          <AnimatePresence initial={false}>
            {turns.map((turn) => {
              const thinking =
                turn.role === "assistant" &&
                turn.id === lastId &&
                streaming &&
                !turn.content &&
                turn.toolCalls.length === 0;
              return (
                <motion.div
                  key={turn.id}
                  layout={!prefersReducedMotion}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={turnTransition}
                  className={cn(
                    "flex w-full flex-col",
                    turn.role === "user" && "items-end",
                  )}
                >
                  {turn.role === "user" ? (
                    <div className="max-w-[80%] rounded-lg rounded-br-sm bg-cta px-4 py-2.5 text-[length:var(--text-body-lg)] leading-[1.6] text-cta-fg">
                      {turn.content}
                    </div>
                  ) : leadStreaming && turn.id === lastId ? (
                    <div className="w-full max-w-[72ch] rounded-lg rounded-tl-sm border border-line bg-surface-2 px-4 py-3 text-[length:var(--text-body-lg)] leading-[1.65] text-fg">
                      <StreamingLead content={turn.content} />
                    </div>
                  ) : (
                    <div className="w-full max-w-[68ch] text-[length:var(--text-body-lg)] leading-[1.65] text-fg">
                      {turn.content && <AssistantMessage content={turn.content} />}
                      {/* request_input shows its QUESTION here (no chips — those
                          live above the composer); commit cards show inline. */}
                      <ToolChecklist cards={turn.toolCalls} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* The trailing "drafting…" label only covers the pre-prose THINKING
              window; once EDDA's lead lands, the in-turn skeleton takes over. */}
          {streaming && !leadStreaming && <DraftingShimmer label={t("thinking")} />}
        </div>
      </ChatScrollAnchored>

      {/* Composer — pinned. Reply suggestions sit just above the input. */}
      <ChatComposerBar className="px-4 py-3 sm:px-5 sm:py-4">
        {replyExamples.length > 0 && (
          <div className="composer-shell mb-2.5 flex flex-wrap gap-2">
            {replyExamples.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSend(ex)}
                className={cn(
                  "rounded-full border border-line bg-surface px-3 py-1.5 text-[length:var(--text-caption)] text-fg-muted transition-colors",
                  "hover:border-line-strong hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* composer-shell: shared prompt-box width (WHY-93). */}
        <div className="composer-shell">
          <PromptInput
            value={value}
            onValueChange={setValue}
            onSubmit={submit}
            isLoading={streaming}
          >
            <PromptInputTextarea
              placeholder={t("placeholder")}
              disabled={streaming}
            />
            <PromptInputActions className="justify-between pt-1.5">
              {/* Voice affordance — DELIBERATELY DISABLED (coming-soon). */}
              <PromptInputAction tooltip={t("voiceComingSoonHint")} side="top">
                <button
                  type="button"
                  aria-disabled
                  tabIndex={0}
                  aria-label={t("voiceComingSoon")}
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-[length:var(--text-caption)] font-medium text-fg-subtle opacity-70 shadow-sm"
                >
                  <StaticVoiceOrb size={18} />
                  <span className="hidden sm:inline">{t("voiceComingSoon")}</span>
                </button>
              </PromptInputAction>

              <Button
                type="button"
                size="icon-sm"
                onClick={submit}
                disabled={streaming || !value.trim()}
                className="rounded-full"
                aria-label={t("send")}
              >
                <ArrowUp className="size-4" />
              </Button>
            </PromptInputActions>
          </PromptInput>
        </div>
      </ChatComposerBar>
    </ChatShell>
  );
}

/** edda's "thinking" state — a compact, content-width bubble (not full-width). */
function ThinkingBubble({ label }: { label: string }) {
  return (
    <div className="inline-flex w-fit items-center rounded-lg rounded-bl-sm bg-surface-2 px-3 py-2 text-[length:var(--text-meta)]">
      <span className="edda-shimmer">{label}</span>
    </div>
  );
}

// Widths of the three masked body lines (last one short, like a closing clause).
const SKELETON_WIDTHS = ["92%", "84%", "60%"];

/** The pulsing body mask shown beneath EDDA's revealed opening lines. */
function SkeletonBody() {
  return (
    <div className="mt-3 flex flex-col gap-2.5" aria-hidden>
      {SKELETON_WIDTHS.map((width, i) => (
        <div
          key={i}
          className="edda-skeleton-bar"
          style={{ width, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

/**
 * The actively-streaming turn: EDDA's first two sentences — her confirmation of
 * the user's last input and what she's about to do — are shown the moment they
 * land, while the longer body that follows is masked by a pulsing skeleton until
 * generation completes (then the full message replaces this entirely).
 */
function StreamingLead({ content }: { content: string }) {
  const { lead } = leadSentences(content, 2);
  return (
    <>
      {lead && <p className="whitespace-pre-wrap">{lead}</p>}
      <SkeletonBody />
    </>
  );
}
