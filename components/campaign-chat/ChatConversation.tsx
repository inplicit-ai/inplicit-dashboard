"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api";
import { CitationChip } from "./CitationChip";

/**
 * AI Elements-style conversation surface, re-themed to white-first Rams tokens.
 * Stick-to-bottom is a lightweight ref+effect (no extra dep): we scroll to the
 * end whenever the message list grows or a turn is in flight.
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
    <div className="flex h-full flex-col">
      <div className="scrollbar-none flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} campaignId={campaignId} />
            ))}
            {pending && (
              <div className="flex items-center gap-2 text-sm text-fg-subtle">
                <span className="rag__send-loading" aria-hidden="true" />
                {t("thinking")}
              </div>
            )}
            {error && (
              <div className="rounded-card border border-pain/30 bg-pain-soft px-4 py-3 text-sm text-pain">
                {error}
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-line px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-card border border-line bg-surface p-2 focus-within:border-accent">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("placeholder")}
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fg outline-none placeholder:text-fg-subtle"
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
      <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-accent">
        <Sparkles className="h-5 w-5" />
      </span>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-fg">
          {t("emptyTitle")}
        </h2>
        <p className="text-sm text-fg-muted">{t("emptyBody")}</p>
      </div>
      <p className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-medium text-fg-subtle">
        {t("aiLabel")}
      </p>
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
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-card bg-surface-2 px-4 py-2.5 text-sm text-fg">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        {t("assistant")}
      </span>
      <div
        className={cn(
          "text-sm leading-relaxed",
          message.declined ? "text-fg-muted" : "text-fg",
        )}
      >
        {message.content}
      </div>

      {message.citations.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
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

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-fg-subtle">{t("aiLabel")}</span>
        {message.cached && (
          <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-fg-subtle">
            {t("cachedNote")}
          </span>
        )}
      </div>
    </div>
  );
}
