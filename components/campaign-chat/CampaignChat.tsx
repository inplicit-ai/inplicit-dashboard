"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Pencil, Plus, Trash2, X } from "lucide-react";

import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";
import type {
  ChatMessage,
  ChatThreadDetail,
  ChatThreadSummary,
  SendChatMessageResponse,
} from "@/lib/api";
import { ChatConversation } from "./ChatConversation";

// Client components talk to the backend via the same-origin /dapi proxy
// (forwards the session cookie). Mirrors the RagSearch.tsx pattern.
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
 * Stored per-campaign RAG chat ("Fragen"), in the white-modernist claude.ai
 * style — mirrors the cross-campaign Wissens-Chat: a single full-height chat
 * column with a floating burger toggle (top-left) that opens a Card popover
 * holding the thread list, rather than a permanent left sidebar. Threads persist
 * server-side; the active thread's messages load on select.
 */
export function CampaignChat({ campaignId }: { campaignId: string }) {
  const t = useTranslations("campaignChat");
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      const list = await dapi<ChatThreadSummary[]>(
        `campaigns/${campaignId}/chat/threads`,
      );
      setThreads(list);
      return list;
    } catch (e) {
      setError((e as Error).message);
      return [];
    }
  }, [campaignId]);

  const loadThread = useCallback(
    async (threadId: string) => {
      setActiveId(threadId);
      setError(null);
      try {
        const detail = await dapi<ChatThreadDetail>(
          `campaigns/${campaignId}/chat/threads/${threadId}`,
        );
        setMessages(detail.messages);
      } catch (e) {
        setError((e as Error).message);
        setMessages([]);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  // Dismiss the popover on Escape (mirrors Wissens-Chat).
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function ensureActiveThread(): Promise<string | null> {
    if (activeId) return activeId;
    try {
      const created = await dapi<ChatThreadSummary>(
        `campaigns/${campaignId}/chat/threads`,
        { method: "POST" },
      );
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
      const created = await dapi<ChatThreadSummary>(
        `campaigns/${campaignId}/chat/threads`,
        { method: "POST" },
      );
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
      await dapi<void>(`campaigns/${campaignId}/chat/threads/${threadId}`, {
        method: "DELETE",
      });
      setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
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
      await dapi<void>(`campaigns/${campaignId}/chat/threads/${threadId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: trimmed }),
      });
      setThreads((prev) =>
        prev.map((th) => (th.id === threadId ? { ...th, title: trimmed } : th)),
      );
    } catch {
      // silently ignore — old title stays
    }
  }

  async function onSend(content: string) {
    setError(null);
    const threadId = await ensureActiveThread();
    if (!threadId) return;

    // Optimistic user bubble.
    const optimistic: ChatMessage = {
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
      const res = await dapi<SendChatMessageResponse>(
        `campaigns/${campaignId}/chat/threads/${threadId}/messages`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        res.user_message,
        res.assistant_message,
      ]);
      void loadThreads(); // refresh title / order
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError((e as Error).message || t("errorGeneric"));
    } finally {
      setPending(false);
    }
  }

  // Full-height chat-container (chat-fill contract): a single conversation
  // column with a floating burger toggle that opens the thread-list card.
  return (
    <div className="relative flex h-full min-h-0 overflow-hidden border-t border-line bg-canvas">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Floating burger toggle + live status */}
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
            <StatusDisc state={pending ? "live" : "idle"} size="sm" />
          </div>
        </div>

        <ChatConversation
          campaignId={campaignId}
          messages={messages}
          pending={pending}
          error={error}
          onSend={onSend}
        />
      </div>

      {/* Conversation Card — opens from the burger, floats over the chat. Hugs
          its content and only scrolls inside itself once it would outgrow
          ~60vh. Mirrors the Wissens-Chat popover exactly. */}
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
                  void loadThread(id);
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
  const t = useTranslations("campaignChat");
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
