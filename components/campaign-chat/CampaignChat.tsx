"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  ChatMessage,
  ChatThreadDetail,
  ChatThreadSummary,
  SendChatMessageResponse,
} from "@/lib/api";
import { ChatThreadList } from "./ChatThreadList";
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
 * Stored per-campaign RAG chat: left thread list + AI Elements conversation.
 * Threads persist server-side; the active thread's messages load on select.
 */
export function CampaignChat({ campaignId }: { campaignId: string }) {
  const t = useTranslations("campaignChat");
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Full-height chat-container (chat-fill contract): the page supplies the
  // height envelope; this fills it as a `flex min-h-0` row. Each pane (thread
  // rail + conversation) owns its own scroll region.
  return (
    <div className="flex h-full min-h-0 overflow-hidden border-t border-line bg-canvas">
      <aside className="hidden w-72 shrink-0 border-r border-line bg-surface sm:flex sm:min-h-0 sm:flex-col">
        <ChatThreadList
          threads={threads}
          activeId={activeId}
          onSelect={loadThread}
          onNew={onNew}
          onDelete={onDelete}
          busy={busy}
        />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatConversation
          campaignId={campaignId}
          messages={messages}
          pending={pending}
          error={error}
          onSend={onSend}
        />
      </div>
    </div>
  );
}
