"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, Globe, Plus, Sparkles, Trash2 } from "lucide-react";
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
 * Cross-campaign Knowledge Chat (O-8). Reuses the per-campaign chat shape:
 * left thread rail + AI-Elements-style conversation. The org-specific additions
 * are the scope chip ("searching N campaigns") and campaign-labelled citations.
 * The server re-validates every campaign against org_id — the client never
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

  return (
    <div className="flex h-[calc(100vh-16rem)] min-h-[28rem] overflow-hidden rounded-card border border-line bg-canvas">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface sm:block">
        <ThreadList
          threads={threads}
          activeId={activeId}
          onSelect={loadThread}
          onNew={onNew}
          onDelete={onDelete}
          busy={busy}
        />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <ScopeChip count={scope} />
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

function ScopeChip({ count }: { count: number | null }) {
  const t = useTranslations("knowledgeChat");
  if (count === null) return null;
  return (
    <div className="flex items-center gap-2 border-b border-line px-4 py-2 sm:px-8">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-fg-muted">
        <Globe className="h-3 w-3 text-accent" />
        {t("scope", { count })}
      </span>
    </div>
  );
}

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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          {t("threadsTitle")}
        </span>
        <button
          type="button"
          onClick={onNew}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-ui border border-line bg-surface px-2 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("newChat")}
        </button>
      </div>
      <div className="scrollbar-none flex-1 overflow-y-auto px-2 pb-2">
        {threads.length === 0 ? (
          <p className="px-2 py-3 text-xs text-fg-subtle">{t("emptyThreads")}</p>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((thread) => {
              const active = thread.id === activeId;
              return (
                <li key={thread.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-ui border-l-2 px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "border-accent bg-surface-2 text-fg"
                        : "border-transparent text-fg-muted hover:bg-surface-2 hover:text-fg",
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
                    className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-ui p-1 text-fg-subtle hover:text-pain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:block"
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
      <div className="scrollbar-none flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {isEmpty ? (
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
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} />
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

function MessageRow({ message }: { message: OrgChatMessage }) {
  const t = useTranslations("knowledgeChat");
  if (message.role === "user") {
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
            <OrgCitationChip key={`${c.vse_insight_id}-${i}`} citation={c} />
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
