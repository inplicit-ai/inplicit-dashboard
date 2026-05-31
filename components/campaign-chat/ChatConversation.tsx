"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ChatComposerBar,
  ChatScrollAnchored,
  ChatShell,
} from "@/components/ui/chat-shell";
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { ConversationTurn } from "@/components/ui/conversation-turn";
import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api";
import { CitationChip } from "./CitationChip";

/**
 * Conversation surface for the stored per-campaign RAG chat, recomposed onto the
 * 21st.dev AI-conversation pattern (manifesto §chat-surfaces): calm
 * ConversationTurn rows — user = near-black fill, assistant = a borderless 68ch
 * reading column — inside the canonical ChatShell envelope. ONE scroll region
 * with stick-to-bottom + a floating "scroll to bottom" pill; pinned composer
 * carrying the lone amber focus ring. Citations render as mono chips under the
 * assistant turn (anon_id · #index) that deep-link into the click-to-quote view.
 * Amber appears ONLY on the focused composer + the live "searching" disc.
 */
export function ChatConversation({
  campaignId,
  messages,
  pending,
  error,
  onSend,
}: {
  campaignId: string;
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
  onSend: (content: string) => void;
}) {
  const t = useTranslations("campaignChat");
  const [draft, setDraft] = useState("");

  const canSend = draft.trim().length > 0 && !pending;

  function submit() {
    const content = draft.trim();
    if (!content || pending) return;
    onSend(content);
    setDraft("");
  }

  const isEmpty = messages.length === 0;

  return (
    <ChatShell height="fill">
      <ChatScrollAnchored
        dep={[messages.length, error]}
        live={pending}
        scrollLabel={t("send")}
        className="px-4 py-6 sm:px-8"
      >
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <MessageTurn key={m.id} message={m} campaignId={campaignId} />
              ))}
            </AnimatePresence>
            {pending && <ThinkingRow label={t("thinking")} />}
            {error && <ErrorRow message={error} />}
          </div>
        )}
      </ChatScrollAnchored>

      <ChatComposerBar className="px-4 py-3 sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            value={draft}
            onValueChange={setDraft}
            onSubmit={submit}
            isLoading={pending}
            className="shadow-none"
          >
            <PromptInputTextarea
              placeholder={t("placeholder")}
              disabled={pending}
            />
            <PromptInputActions className="justify-end pt-1">
              <Button
                type="button"
                size="icon-sm"
                onClick={submit}
                disabled={!canSend}
                aria-label={t("send")}
                className="rounded-full"
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

/** Printed-plate empty state — hairline, mono caption, the honest-AI label. */
function EmptyState() {
  const t = useTranslations("campaignChat");
  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center gap-5 py-10 text-center">
      <StatusDisc state="idle" size="lg" />
      <div className="space-y-2">
        <h2 className="text-[length:var(--text-body-lg)] font-semibold tracking-tight text-fg">
          {t("emptyTitle")}
        </h2>
        <p className="mx-auto max-w-[60ch] text-[length:var(--text-body-lg)] leading-relaxed text-fg-muted">
          {t("emptyBody")}
        </p>
      </div>
      <span className="label-eyebrow text-fg-faint">{t("aiLabel")}</span>
    </div>
  );
}

/** Live "searching interviews…" — the single amber pulse while a turn streams. */
function ThinkingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 text-[13px] text-fg-muted">
      <StatusDisc state="live" size="sm" />
      <span className="italic">{label}</span>
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-card border border-pain-muted bg-pain-soft px-4 py-3 text-sm text-danger">
      <StatusDisc state="error" size="sm" className="mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function MessageTurn({
  message,
  campaignId,
}: {
  message: ChatMessage;
  campaignId: string;
}) {
  const t = useTranslations("campaignChat");
  const reduce = useReducedMotion();
  const isUser = message.role === "user";

  const enter = {
    initial: { opacity: 0, y: reduce ? 0 : 6 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduce ? 0.2 : 0.28,
      ease: [0.2, 0.65, 0.3, 0.9] as const,
    },
  };

  if (isUser) {
    return (
      <motion.div {...enter} className="flex w-full flex-col items-end">
        <ConversationTurn role="user">{message.content}</ConversationTurn>
      </motion.div>
    );
  }

  return (
    <motion.div {...enter} className="flex w-full flex-col">
      <ConversationTurn role="assistant">
        <p className={cn(message.declined && "text-fg-muted")}>
          {message.content}
        </p>

        {message.citations.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-line-subtle pt-3.5">
            <span className="label-eyebrow">{t("citationsLabel")}</span>
            {message.citations.map((c, i) => (
              <CitationChip
                key={`${c.vse_insight_id}-${i}`}
                citation={c}
                campaignId={campaignId}
              />
            ))}
          </div>
        )}
      </ConversationTurn>

      {/* Provenance footer — honest-AI label + cache state in mono. */}
      <div className="mt-1.5 flex items-center gap-2 pl-1">
        <span className="label-eyebrow text-fg-faint">{t("aiLabel")}</span>
        {message.cached && (
          <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-fg-subtle">
            {t("cachedNote")}
          </span>
        )}
      </div>
    </motion.div>
  );
}
