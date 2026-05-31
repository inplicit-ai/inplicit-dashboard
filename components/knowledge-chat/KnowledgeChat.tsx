"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp, Plus, Trash2 } from "lucide-react";

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
import { DataChip } from "@/components/ui/data-chip";
import { cn } from "@/lib/utils";
import type {
  ChatThreadSummary,
  OrgChatMessage,
  OrgThreadDetail,
  SendOrgChatResponse,
} from "@/lib/api";
import { OrgCitationChip } from "./OrgCitationChip";

// Client → backend via the same-origin /dapi proxy (forwards the session cookie).
async function dapi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/dapi/${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Cross-campaign Knowledge Chat (O-8), recomposed onto the chat-surfaces
 * manifesto: a bound-spine thread rail + the 21st.dev AI-conversation pattern
 * via ConversationTurn inside the canonical ChatShell envelope. The org-specific
 * scope ("searching N campaigns") rides as a mono DataChip in the fixed folio
 * header; citations carry the campaign so org-level answers never mislabel a
 * hit. The server re-validates every campaign against org_id — the client never
 * supplies a campaign set.
 */
export function KnowledgeChat() {
  const t = useTranslations("knowledgeChat");
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OrgChatMessage[]>([]);
  const [scope, setScope] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      const list = await dapi<ChatThreadSummary[]>("orgs/me/rag-threads");
      setThreads(list);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const loadThread = useCallback(async (threadId: string) => {
    setActiveId(threadId);
    setError(null);
    try {
      const detail = await dapi<OrgThreadDetail>(
        `orgs/me/rag-threads/${threadId}`,
      );
      setMessages(detail.messages);
      setScope(detail.scope_campaigns);
    } catch (e) {
      setError((e as Error).message);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  async function ensureActiveThread(): Promise<string | null> {
    if (activeId) return activeId;
    try {
      const created = await dapi<ChatThreadSummary>("orgs/me/rag-threads", {
        method: "POST",
      });
      setThreads((prev) => [created, ...prev]);
      setActiveId(created.id);
      setMessages([]);
      return created.id;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }

  async function onNew() {
    if (busy) return;
    setBusy(true);
    try {
      const created = await dapi<ChatThreadSummary>("orgs/me/rag-threads", {
        method: "POST",
      });
      setThreads((prev) => [created, ...prev]);
      setActiveId(created.id);
      setMessages([]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(threadId: string) {
    try {
      await dapi<void>(`orgs/me/rag-threads/${threadId}`, { method: "DELETE" });
      setThreads((prev) => prev.filter((th) => th.id !== threadId));
      if (activeId === threadId) {
        setActiveId(null);
        setMessages([]);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onSend(content: string) {
    setError(null);
    const threadId = await ensureActiveThread();
    if (!threadId) return;

    const optimistic: OrgChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content,
      citations: [],
      declined: false,
      cached: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setPending(true);

    try {
      const res = await dapi<SendOrgChatResponse>(
        `orgs/me/rag-threads/${threadId}/messages`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        res.user_message,
        res.assistant_message,
      ]);
      void loadThreads();
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError((e as Error).message || t("errorGeneric"));
    } finally {
      setPending(false);
    }
  }

  // Full-height chat-container (design-contract §6): the page supplies the
  // height envelope; this fills it as a `flex min-h-0` row with a bound-spine
  // thread rail and a conversation column whose folio header never scrolls.
  return (
    <div className="flex h-full min-h-0 overflow-hidden border-t border-line bg-canvas">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface sm:flex sm:min-h-0 sm:flex-col">
        <ThreadList
          threads={threads}
          activeId={activeId}
          onSelect={loadThread}
          onNew={onNew}
          onDelete={onDelete}
          busy={busy}
        />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ScopeHeader count={scope} live={pending} />
        <Conversation
          messages={messages}
          pending={pending}
          error={error}
          onSend={onSend}
        />
      </div>
    </div>
  );
}

/** Folio header — eyebrow title, mono scope chip, live disc while searching. */
function ScopeHeader({ count, live }: { count: number | null; live: boolean }) {
  const t = useTranslations("knowledgeChat");
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-8">
      <div className="flex min-w-0 items-baseline gap-3">
        <span className="label-eyebrow">{t("eyebrow")}</span>
        <p className="truncate text-sm font-semibold tracking-tight text-fg">
          {t("title")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {count !== null && (
          <DataChip tone="neutral" mono>
            {t("scope", { count })}
          </DataChip>
        )}
        <StatusDisc state={live ? "live" : "idle"} size="sm" />
      </div>
    </header>
  );
}

/** Bound-spine thread rail — same ledger language as the per-campaign list. */
function ThreadList({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
  busy,
}: {
  threads: ChatThreadSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const t = useTranslations("knowledgeChat");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-3">
        <span className="label-eyebrow">{t("threadsTitle")}</span>
        <button
          type="button"
          onClick={onNew}
          disabled={busy}
          aria-label={t("newChat")}
          className="inline-flex items-center gap-1 rounded-sm border border-line bg-surface px-2 py-1 text-[13px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("newChat")}
        </button>
      </div>
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto py-1">
        {threads.length === 0 ? (
          <p className="px-3 py-3 text-[13px] text-fg-subtle">
            {t("emptyThreads")}
          </p>
        ) : (
          <ul>
            {threads.map((thread) => {
              const active = thread.id === activeId;
              return (
                <li
                  key={thread.id}
                  className="group relative border-b border-line-subtle last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 pr-8 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      active
                        ? "bg-surface-2 font-medium text-fg shadow-[inset_2px_0_0_var(--color-accent)]"
                        : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {thread.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(thread.id)}
                    aria-label={t("deleteThread")}
                    className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-sm p-1 text-fg-subtle transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Conversation({
  messages,
  pending,
  error,
  onSend,
}: {
  messages: OrgChatMessage[];
  pending: boolean;
  error: string | null;
  onSend: (content: string) => void;
}) {
  const t = useTranslations("knowledgeChat");
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
                <MessageTurn key={m.id} message={m} />
              ))}
            </AnimatePresence>
            {pending && (
              <div className="flex items-center gap-2 px-1 text-[13px] text-fg-muted">
                <StatusDisc state="live" size="sm" />
                <span className="italic">{t("thinking")}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2.5 rounded-card border border-pain-muted bg-pain-soft px-4 py-3 text-sm text-danger">
                <StatusDisc state="error" size="sm" className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}
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

function EmptyState() {
  const t = useTranslations("knowledgeChat");
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

function MessageTurn({ message }: { message: OrgChatMessage }) {
  const t = useTranslations("knowledgeChat");
  const reduce = useReducedMotion();

  const enter = {
    initial: { opacity: 0, y: reduce ? 0 : 6 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduce ? 0.2 : 0.28,
      ease: [0.2, 0.65, 0.3, 0.9] as const,
    },
  };

  if (message.role === "user") {
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
              <OrgCitationChip key={`${c.vse_insight_id}-${i}`} citation={c} />
            ))}
          </div>
        )}
      </ConversationTurn>
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
