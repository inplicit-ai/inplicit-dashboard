"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api";
import { CitationChip } from "./CitationChip";

/**
 * Conversation surface for the stored per-campaign RAG chat. Follows the
 * chat-container flex contract (design-contract §6): the parent owns the height,
 * this is a `flex-1 min-h-0` column with a SINGLE scrolling message region and a
 * pinned composer that never scrolls away. Stick-to-bottom is a lightweight
 * ref+effect (no extra dep): scroll to the end whenever the list grows or a turn
 * is in flight.
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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  const canSend = draft.trim().length > 0 && !pending;

  function submit() {
    const content = draft.trim();
    if (!content || pending) return;
    onSend(content);
    setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The single scroll region. */}
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <MessageRow key={m.id} message={m} campaignId={campaignId} />
              ))}
            </AnimatePresence>
            {pending && <ThinkingRow label={t("thinking")} />}
            {error && <ErrorRow message={error} />}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Pinned composer — never scrolls away. */}
      <div className="shrink-0 border-t border-line bg-canvas px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-card border border-line bg-surface p-2 transition-colors focus-within:border-accent">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("placeholder")}
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fg outline-none placeholder:text-fg-faint"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label={t("send")}
            className="grid size-8 shrink-0 place-items-center rounded-ui bg-fg text-canvas transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const t = useTranslations("campaignChat");
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-4 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Sparkles className="h-5 w-5" />
      </span>
      <div className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight text-fg">
          {t("emptyTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-fg-muted">{t("emptyBody")}</p>
      </div>
      <p className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-medium text-fg-subtle">
        {t("aiLabel")}
      </p>
    </div>
  );
}

function ThinkingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-fg-subtle">
      <span className="rag__send-loading" aria-hidden="true" />
      {label}
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

function MessageRow({
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
      <motion.div {...enter} className="flex justify-end">
        <div className="max-w-[min(78%,620px)] rounded-card bg-accent-soft px-4 py-3 text-sm leading-relaxed text-fg">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...enter} className="flex flex-col gap-2">
      <span className="label-eyebrow text-fg-subtle">{t("assistant")}</span>
      <div className="max-w-[min(78%,620px)] rounded-card bg-surface-2 px-4 py-3">
        <p
          className={cn(
            "text-sm leading-relaxed",
            message.declined ? "text-fg-muted" : "text-fg",
          )}
        >
          {message.content}
        </p>

        {message.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line-subtle pt-3">
            <span className="text-[11px] text-fg-subtle">
              {t("citationsLabel")}:
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

      <div className="flex items-center gap-2 pl-1">
        <span className="text-[10px] text-fg-faint">{t("aiLabel")}</span>
        {message.cached && (
          <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-fg-subtle">
            {t("cachedNote")}
          </span>
        )}
      </div>
    </motion.div>
  );
}
