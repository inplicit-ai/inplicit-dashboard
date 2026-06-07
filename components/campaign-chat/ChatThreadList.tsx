"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatThreadSummary } from "@/lib/api";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86_400_000;
  if (diff < day) return "1d";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w`;
  return `${Math.floor(diff / (30 * day))}mo`;
}

/**
 * Left thread rail — a calm claude.ai-style conversation list. A clean header
 * with a sentence-case title + a soft "new chat" button, then thread rows: title
 * in one weight, relative time as a right-aligned sans tabular-nums metric. The
 * active row gets a soft surface fill + a 2px inset accent tick (the lone amber
 * in the rail).
 */
export function ChatThreadList({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  busy,
}: {
  threads: ChatThreadSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  busy: boolean;
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-4">
        <span className="text-[length:var(--text-meta)] font-semibold text-fg-subtle">
          {t("threadsTitle")}
        </span>
        <button
          type="button"
          onClick={onNew}
          disabled={busy}
          aria-label={t("newChat")}
          className="inline-flex items-center gap-1.5 rounded-ui border border-line bg-surface px-2.5 py-1.5 text-[length:var(--text-meta)] font-medium text-fg-muted shadow-sm transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("newChat")}
        </button>
      </div>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-2">
        {threads.length === 0 ? (
          <p className="px-2 py-3 text-[length:var(--text-meta)] text-fg-subtle">
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
                      <span className="shrink-0 text-[length:var(--text-caption)] tabular-nums text-fg-subtle">
                        {relativeTime(thread.updated_at)}
                      </span>
                    </button>
                  )}
                  {!isEditing && (
                    <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEdit(thread)}
                        aria-label="Umbenennen"
                        className="rounded-ui p-1 text-fg-subtle transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(thread.id)}
                        aria-label={t("deleteThread")}
                        className="rounded-ui p-1 text-fg-subtle transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
    </div>
  );
}
