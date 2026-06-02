"use client";

import { useState } from "react";
import Image from "next/image";
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
import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";
import { ToolChecklist } from "./ToolChecklist";

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: SetupToolCallCard[];
};

/**
 * The setup agent chat pane (doc 03 §7), in the white-modernist claude.ai style:
 * calm roomy turns — user = near-black bubble, assistant = a borderless reading
 * column — inside the canonical ChatShell flex envelope. Assistant turns
 * interleave prose with clean tool-call cards. A clean header carries the
 * honest-AI label (EU AI Act spirit, doc 03 §9). One scroll region with
 * stick-to-bottom + a floating "scroll to bottom" pill; a pinned claude.ai
 * composer. NO 100vh math — fills whatever height its parent gives.
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
      {/* Honest-AI header — fixed, never scrolls. The live disc pulses amber
          only while the agent is drafting. */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-canvas px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
          <Image
            src="/logo_icon.svg"
            alt="Inplicit"
            width={22}
            height={22}
            className="size-[22px]"
            priority
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[length:var(--text-subtitle)] font-semibold tracking-[-0.01em] text-fg">
            {t("title")}
          </p>
          <p className="truncate text-[length:var(--text-meta)] text-fg-muted">
            {tAi("disclaimer")}
          </p>
        </div>
        <StatusDisc state={streaming ? "live" : "idle"} size="sm" />
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
                  ) : (
                    <div className="w-full max-w-[68ch] text-[length:var(--text-body-lg)] leading-[1.65] text-fg">
                      {turn.content && (
                        <p className="whitespace-pre-wrap">{turn.content}</p>
                      )}
                      <ToolChecklist
                        cards={turn.toolCalls}
                        onReply={streaming ? undefined : onSend}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {streaming && <DraftingShimmer label={t("thinking")} />}
        </div>
      </ChatScrollAnchored>

      {/* Composer — pinned, never scrolls away. */}
      <ChatComposerBar className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="mx-auto w-full max-w-3xl">
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
            <PromptInputActions className="justify-end pt-1.5">
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

/** "Still drafting…" trailer — a shimmering label sweeping while EDDA streams
 * its next tool calls. Reduced-motion collapses the sweep to a static label. */
function DraftingShimmer({ label }: { label: string }) {
  return (
    <div className="text-[length:var(--text-meta)]">
      <span className="edda-shimmer">{label}</span>
    </div>
  );
}
