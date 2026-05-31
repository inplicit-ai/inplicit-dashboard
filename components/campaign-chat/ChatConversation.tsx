"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp, MessageSquareText } from "lucide-react";

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
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api";
import { CitationChip } from "./CitationChip";

/**
 * Conversation surface for the stored per-campaign RAG chat, in the
 * white-modernist claude.ai style: calm roomy turns — user = near-black bubble,
 * assistant = a borderless reading column — inside the canonical ChatShell
 * envelope. ONE scroll region with stick-to-bottom + a floating "scroll to
 * bottom" pill; a pinned claude.ai composer. Citations render as soft mono chips
 * under the assistant turn (anon_id · #index) that deep-link into the
 * click-to-quote view. Amber appears ONLY on the focused composer + the live
 * "searching" disc.
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
          <ChatEmptyState />
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

      <ChatComposerBar className="px-4 py-3 sm:px-8 sm:py-4">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            value={draft}
            onValueChange={setDraft}
            onSubmit={submit}
            isLoading={pending}
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

/** Centered friendly empty state with the honest-AI label below. */
function ChatEmptyState() {
  const t = useTranslations("campaignChat");
  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center">
      <EmptyState
        icon={MessageSquareText}
        title={t("emptyTitle")}
        hint={t("emptyBody")}
      />
      <span className="-mt-3 text-[length:var(--text-caption)] text-fg-faint">
        {t("aiLabel")}
      </span>
    </div>
  );
}

/** Live "searching interviews…" — the single amber pulse while a turn streams. */
function ThinkingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[length:var(--text-meta)] text-fg-muted">
      <StatusDisc state="live" size="sm" />
      <span>{label}</span>
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-pain-muted bg-pain-soft px-4 py-3 text-[length:var(--text-body)] text-danger">
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
        <div className="max-w-[80%] rounded-lg rounded-br-sm bg-cta px-4 py-2.5 text-[length:var(--text-body-lg)] leading-[1.6] text-cta-fg">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...enter} className="flex w-full flex-col">
      <div className="w-full max-w-[68ch] text-[length:var(--text-body-lg)] leading-[1.65] text-fg">
        <p className={cn("whitespace-pre-wrap", message.declined && "text-fg-muted")}>
          {message.content}
        </p>

        {message.citations.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line-subtle pt-4">
            <span className="text-[length:var(--text-caption)] font-medium text-fg-subtle">
              {t("citationsLabel")}
            </span>
            {message.citations.map((c, i) => (
              <CitationChip
                key={`${c.vse_insight_id}-${i}`}
                citation={c}
                campaignId={campaignId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Provenance footer — honest-AI label + cache state. */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[length:var(--text-caption)] text-fg-faint">
          {t("aiLabel")}
        </span>
        {message.cached && (
          <span className="rounded-full border border-line-subtle bg-surface-2 px-2 py-0.5 text-[length:var(--text-caption)] text-fg-subtle">
            {t("cachedNote")}
          </span>
        )}
      </div>
    </motion.div>
  );
}
