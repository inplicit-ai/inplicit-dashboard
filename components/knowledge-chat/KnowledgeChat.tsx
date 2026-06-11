"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp, Menu, MessageSquareText, Pencil, Plus, Trash2, X } from "lucide-react";

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
import { DataChip } from "@/components/ui/data-chip";
import { NoEvidenceCard } from "@/components/chat/NoEvidenceCard";
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
 * Cross-campaign Knowledge Chat (O-8), in the white-modernist claude.ai style: a
 * calm conversation thread rail + clean roomy turns inside the canonical
 * ChatShell envelope. The org-specific scope ("searching N campaigns") rides as
 * a DataChip in the fixed header; citations carry the campaign so org-level
 * answers never mislabel a hit. The server re-validates every campaign against
 * org_id — the client never supplies a campaign set.
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

  async function onRename(threadId: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await dapi<void>(`orgs/me/rag-threads/${threadId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: trimmed }),
      });
      setThreads((prev) =>
        prev.map((th) => (th.id === threadId ? { ...th, title: trimmed } : th)),
      );
    } catch {
      // silently ignore — the old title stays
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

  // Full-height chat-container. No fixed header bar — just the chat area with a
  // floating burger icon (top-left). Clicking it opens a Card popover (not a
  // full-height drawer): the card hugs its content and only scrolls inside
  // itself once the thread list would outgrow the page.
  const [menuOpen, setMenuOpen] = useState(false);

  // Dismiss the popover on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden border-t border-line bg-canvas">
      {/* Chat column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Floating burger toggle + scope chip */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-3 py-2.5">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t("threadsTitle")}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-ui border border-line bg-surface text-fg-muted shadow-sm transition-colors hover:bg-surface-2 hover:text-fg"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <div className="pointer-events-auto flex items-center gap-2">
            {scope !== null && (
              <DataChip tone="neutral" mono>
                {t("scope", { count: scope })}
              </DataChip>
            )}
            <StatusDisc state={pending ? "live" : "idle"} size="sm" />
          </div>
        </div>

        <Conversation
          messages={messages}
          pending={pending}
          error={error}
          onSend={onSend}
        />
      </div>

      {/* Conversation Card — opens from the burger, floats over the chat so
          nothing below it moves. Hugs its content (3 threads → 3 rows) and only
          scrolls inside itself once it would outgrow ~60vh. */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Transparent click-catcher to dismiss on an outside click. */}
            <div
              className="absolute inset-0 z-30"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.2, 0.65, 0.3, 0.9] }}
              style={{ transformOrigin: "top left" }}
              className="absolute left-3 top-[3.25rem] z-40 flex max-h-[min(60vh,32rem)] w-72 flex-col overflow-hidden rounded-card border-[length:var(--border-card)] border-solid border-line bg-card shadow-card-hover"
            >
              {/* Card header: black "Neuer Chat" button + X close. */}
              <div className="shrink-0 border-b border-line p-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void onNew();
                      setMenuOpen(false);
                    }}
                    disabled={busy}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-ui bg-fg px-3 py-2 text-[length:var(--text-meta)] font-semibold text-canvas transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("newChat")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Schließen"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui border border-line text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <ThreadList
                threads={threads}
                activeId={activeId}
                onSelect={(id) => {
                  loadThread(id);
                  setMenuOpen(false);
                }}
                onDelete={onDelete}
                onRename={onRename}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Slim thread list used inside the popover card. */
function ThreadList({
  threads,
  activeId,
  onSelect,
  onDelete,
  onRename,
}: {
  threads: ChatThreadSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const t = useTranslations("knowledgeChat");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(thread: ChatThreadSummary) {
    setEditingId(thread.id);
    setEditValue(thread.title);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit(id: string) {
    onRename(id, editValue);
    setEditingId(null);
  }

  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-1.5">
      {threads.length === 0 ? (
        <p className="px-3 py-4 text-[length:var(--text-meta)] text-fg-subtle">
          {t("emptyThreads")}
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {threads.map((thread) => {
            const active = thread.id === activeId;
            const isEditing = editingId === thread.id;
            return (
              <li key={thread.id} className="group relative">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(thread.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(thread.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full rounded-ui bg-surface-2 px-3 py-2 text-[length:var(--text-meta)] text-fg outline-none ring-2 ring-inset ring-accent"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-ui px-3 py-2.5 pr-16 text-left text-[length:var(--text-meta)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      active
                        ? "bg-surface-2 font-medium text-fg shadow-[inset_2px_0_0_var(--color-accent)]"
                        : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{thread.title}</span>
                  </button>
                )}
                {!isEditing && (
                  <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => startEdit(thread)}
                      aria-label="Umbenennen"
                      className="rounded-ui p-1 text-fg-subtle transition-colors hover:text-fg"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(thread.id)}
                      aria-label={t("deleteThread")}
                      className="rounded-ui p-1 text-fg-subtle transition-colors hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
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
          <KnowledgeEmptyState />
        ) : (
          <div className="flex w-full flex-col gap-7">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <MessageTurn key={m.id} message={m} />
              ))}
            </AnimatePresence>
            {pending && (
              <div className="flex items-center gap-2 text-[length:var(--text-meta)] text-fg-muted">
                <StatusDisc state="live" size="sm" />
                <span>{t("thinking")}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2.5 rounded-md border border-pain-muted bg-pain-soft px-4 py-3 text-[length:var(--text-body)] text-danger">
                <StatusDisc state="error" size="sm" className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </ChatScrollAnchored>

      <ChatComposerBar className="px-4 py-3 sm:px-8 sm:py-4">
        <div className="w-full">
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

function KnowledgeEmptyState() {
  const t = useTranslations("knowledgeChat");
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
        <div className="max-w-[80%] rounded-lg rounded-br-sm bg-cta px-4 py-2.5 text-[length:var(--text-body-lg)] leading-[1.6] text-cta-fg">
          {message.content}
        </div>
      </motion.div>
    );
  }
  // No evidence across campaigns or Kontext → offer the email fallback.
  if (message.declined) {
    return (
      <motion.div {...enter} className="flex w-full flex-col">
        <NoEvidenceCard
          title={t("noEvidenceTitle")}
          body={t("noEvidenceBody")}
          cta={t("noEvidenceCta")}
          comingSoon={t("noEvidenceComingSoon")}
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[length:var(--text-caption)] text-fg-faint">
            {t("aiLabel")}
          </span>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div {...enter} className="flex w-full flex-col">
      <div className="w-full max-w-[68ch] text-[length:var(--text-body-lg)] leading-[1.65] text-fg">
        <p className="whitespace-pre-wrap">
          {message.content}
        </p>
        {message.citations.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line-subtle pt-4">
            <span className="text-[length:var(--text-caption)] font-medium text-fg-subtle">
              {t("citationsLabel")}
            </span>
            {message.citations.map((c, i) => (
              <OrgCitationChip key={`${c.vse_insight_id}-${i}`} citation={c} />
            ))}
          </div>
        )}
      </div>
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
