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
import { ConversationTurn } from "@/components/ui/conversation-turn";
import { StatusDisc } from "@/components/ui/status-disc";
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
 * The setup agent chat pane (doc 03 §7), rebuilt onto the 21st.dev AI-conversation
 * pattern: calm ConversationTurn rows (user = near-black bubble, assistant = a
 * borderless 68ch reading column) inside the canonical ChatShell flex envelope.
 * Assistant turns interleave prose with tool-call cards rendered in the
 * agent-plan status language (StatusDisc + DataChip). The header carries the
 * honest-AI label (EU AI Act spirit, doc 03 §9). One scroll region with
 * stick-to-bottom + a floating "scroll to bottom" pill; pinned composer with the
 * lone amber focus ring. NO 100vh math — fills whatever height its parent gives.
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
      {/* Honest-AI header — fixed, never scrolls. Status disc ties the agent to
          the spine language; it pulses amber only while the agent is drafting. */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3.5">
        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-ui ring-1 ring-line">
          <Image
            src="/logo_icon.svg"
            alt="Inplicit"
            width={28}
            height={28}
            className="size-7"
            priority
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight text-fg">
            {t("title")}
          </p>
          <p className="truncate text-[13px] text-fg-muted">
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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <AnimatePresence initial={false}>
            {turns.map((turn) => (
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
                  <ConversationTurn role="user">{turn.content}</ConversationTurn>
                ) : (
                  <ConversationTurn role="assistant">
                    {turn.content && <p>{turn.content}</p>}
                    {turn.toolCalls.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        {turn.toolCalls.map((c, i) => (
                          <ToolCallCard
                            key={i}
                            card={c}
                            onReply={streaming ? undefined : onSend}
                          />
                        ))}
                      </div>
                    )}
                  </ConversationTurn>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {streaming && <ThinkingIndicator label={t("thinking")} />}
        </div>
      </ChatScrollAnchored>

      {/* Composer — pinned, never scrolls away. */}
      <ChatComposerBar className="p-3 sm:px-5">
        <div className="mx-auto w-full max-w-3xl">
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
        </div>
      </ChatComposerBar>
    </ChatShell>
  );
}

/** Animated "drafting…" indicator — the live status disc + label. */
function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 text-[13px] text-fg-muted">
      <StatusDisc state="live" size="sm" />
      <span className="italic">{label}</span>
    </div>
  );
}
