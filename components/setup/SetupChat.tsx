"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import {
  ChatScroll,
  ChatShell,
  ChatComposerBar,
} from "@/components/ui/chat-shell";
import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";
import { ToolCallCard } from "./ToolCallCard";

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: SetupToolCallCard[];
};

/**
 * The chat pane (doc 03 §7). AI-legible: assistant turns interleave prose with
 * tool-call cards. The header carries the honest-AI label (EU AI Act spirit,
 * doc 03 §9). Follows the canonical chat-container flex height contract
 * (design-contract §6) — header + single scrolling list + pinned composer, no
 * hardcoded viewport heights. Fills whatever height its parent provides.
 */
export function SetupChat({
  turns,
  streaming,
  onSend,
}: {
  turns: ChatTurn[];
  streaming: boolean;
  onSend: (message: string) => void;
}) {
  const t = useTranslations("setup.chat");
  const tAi = useTranslations("setup.ai");
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, streaming]);

  function submit() {
    const msg = value.trim();
    if (!msg || streaming) return;
    onSend(msg);
    setValue("");
  }

  const turnTransition = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, stiffness: 500, damping: 30 };

  return (
    <ChatShell height="fill">
      {/* Honest-AI header — fixed, never scrolls */}
      <header className="flex shrink-0 items-center gap-2.5 border-b border-line px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Sparkles className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{t("title")}</p>
          <p className="truncate text-xs text-fg-muted">{tAi("disclaimer")}</p>
        </div>
      </header>

      {/* Conversation — the single scroll region */}
      <ChatScroll className="px-4 py-4">
        <AnimatePresence initial={false}>
          {turns.map((turn) => (
            <motion.div
              key={turn.id}
              layout={!prefersReducedMotion}
              initial={
                prefersReducedMotion ? false : { opacity: 0, y: 8 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={turnTransition}
              className="flex flex-col gap-2"
            >
              {turn.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[min(78%,620px)] rounded-card bg-accent-soft px-4 py-3 text-sm text-fg">
                    {turn.content}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {turn.content && (
                    <div className="max-w-[min(78%,620px)] rounded-card bg-surface-2 px-4 py-3 text-sm leading-relaxed text-fg">
                      {turn.content}
                    </div>
                  )}
                  {turn.toolCalls.length > 0 && (
                    <div className="flex max-w-[min(78%,620px)] flex-col gap-1.5">
                      {turn.toolCalls.map((c, i) => (
                        <ToolCallCard key={i} card={c} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {streaming && <ThinkingIndicator label={t("thinking")} />}
        <div ref={bottomRef} />
      </ChatScroll>

      {/* Composer — pinned, never scrolls away */}
      <ChatComposerBar className="p-3">
        <PromptInput
          value={value}
          onValueChange={setValue}
          onSubmit={submit}
          isLoading={streaming}
          className="shadow-none"
        >
          <PromptInputTextarea
            placeholder={t("placeholder")}
            disabled={streaming}
          />
          <PromptInputActions className="justify-end pt-1">
            <Button
              type="button"
              size="icon-sm"
              onClick={submit}
              disabled={streaming || !value.trim()}
              className={cn("rounded-full")}
              aria-label={t("send")}
            >
              <ArrowUp className="size-4" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </ChatComposerBar>
    </ChatShell>
  );
}

/** Animated "drafting…" indicator — three pulsing dots + label. */
function ThinkingIndicator({ label }: { label: string }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-fg-muted">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-fg-faint"
            animate={
              prefersReducedMotion ? undefined : { opacity: [0.3, 1, 0.3] }
            }
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </span>
      <span className="italic">{label}</span>
    </div>
  );
}
