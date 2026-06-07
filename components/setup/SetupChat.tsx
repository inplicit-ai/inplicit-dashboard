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

  const lastId = turns[turns.length - 1]?.id;

  // The reply suggestions edda is currently offering (the latest request_input),
  // surfaced above the composer instead of inline in the message.
  const lastAssistant = [...turns].reverse().find((tn) => tn.role === "assistant");
  const replyCard =
    !streaming && lastAssistant
      ? lastAssistant.toolCalls.find((c) => c.tool === "request_input")
      : undefined;
  const replyExamples = Array.isArray(replyCard?.args?.examples)
    ? (replyCard!.args!.examples as unknown[]).map(String).filter(Boolean)
    : [];

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
                  ) : thinking ? (
                    <ThinkingBubble label={t("thinking")} />
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

type Block = { type: "prose"; text: string } | { type: "list"; items: string[] };

const LIST_RE = /^\s*(?:\d+[.)]|[•\-–])\s+(.*\S)\s*$/;

/** Split edda's message into prose paragraphs + contiguous list blocks. */
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let prose: string[] = [];
  let list: string[] = [];
  const flushProse = () => {
    const text = prose.join("\n").trim();
    if (text) blocks.push({ type: "prose", text });
    prose = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", items: list });
    list = [];
  };
  for (const line of content.split("\n")) {
    const m = line.match(LIST_RE);
    if (m) {
      flushProse();
      list.push(m[1]);
    } else {
      flushList();
      prose.push(line);
    }
  }
  flushProse();
  flushList();
  return blocks;
}

/**
 * Renders edda's message with proposed points (1–4 goals, angles, …) as a
 * hairline-separated box, visually distinct from the surrounding prose.
 */
function AssistantMessage({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) =>
        b.type === "list" ? (
          <ul
            key={i}
            className="overflow-hidden rounded-md border border-line-subtle bg-surface-2/50"
          >
            {b.items.map((item, j) => (
              <li
                key={j}
                className={cn(
                  "px-3.5 py-2.5 text-[length:var(--text-body)] leading-[1.55] text-fg",
                  j > 0 && "border-t border-line-subtle",
                )}
              >
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}
