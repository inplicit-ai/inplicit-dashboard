"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatThreadSummary } from "@/lib/api";

/**
 * Conversation switcher — the thread rail collapsed into a single Card.
 *
 * Collapsed, the card is exactly one row tall: the active conversation title
 * with a small "more conversations" line beneath it. Opening it reveals an
 * absolutely-positioned panel listing every conversation, so the chat below
 * never shifts. The panel hugs its content (three threads → three rows) and
 * only scrolls inside itself once it would outgrow the page.
 */
export function ConversationSwitcher({
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
  const t = useTranslations("knowledgeChat");
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = threads.find((th) => th.id === activeId) ?? null;
  const activeTitle = active?.title ?? t("newChat");
  const otherCount = threads.filter((th) => th.id !== activeId).length;

  // Close the panel on an outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function startEdit(thread: ChatThreadSummary) {
    setEditingId(thread.id);
    setEditValue(thread.title);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit(id: string) {
    onRename(id, editValue);
    setEditingId(null);
  }

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
  }

  function handleNew() {
    onNew();
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-xs">
      {/* Collapsed card — the always-visible trigger. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex w-full items-center gap-3 rounded-card border-[length:var(--border-card)] border-solid border-line bg-card px-3.5 py-2.5 text-left shadow-card transition-[box-shadow,border-color] duration-200 ease-[var(--ease-spring)] hover:border-line-strong hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "border-line-strong shadow-card-hover",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[length:var(--text-body)] font-semibold text-fg">
            {activeTitle}
          </span>
          <span className="mt-0.5 block text-[length:var(--text-caption)] text-fg-subtle">
            {t("moreConversations")}
            {otherCount > 0 && (
              <span className="ml-1 text-fg-faint">({otherCount})</span>
            )}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Expanded panel — floats over the chat so nothing below moves. */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: reduce ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -4 }}
            transition={{
              duration: reduce ? 0.12 : 0.16,
              ease: [0.2, 0.65, 0.3, 0.9],
            }}
            className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 flex max-h-[min(60vh,32rem)] flex-col overflow-hidden rounded-card border-[length:var(--border-card)] border-solid border-line bg-card shadow-card-hover"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-line px-3.5 py-2.5">
              <span className="text-[length:var(--text-meta)] font-semibold text-fg-subtle">
                {t("threadsTitle")}
              </span>
              <button
                type="button"
                onClick={handleNew}
                disabled={busy}
                aria-label={t("newChat")}
                className="inline-flex items-center gap-1.5 rounded-ui border border-line bg-surface px-2.5 py-1.5 text-[length:var(--text-meta)] font-medium text-fg-muted shadow-sm transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("newChat")}
              </button>
            </div>
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-1.5">
              {threads.length === 0 ? (
                <p className="px-2 py-3 text-[length:var(--text-meta)] text-fg-subtle">
                  {t("emptyThreads")}
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {threads.map((thread) => {
                    const isActive = thread.id === activeId;
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
                            onClick={() => handleSelect(thread.id)}
                            aria-current={isActive ? "true" : undefined}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-ui px-3 py-2.5 pr-16 text-left text-[length:var(--text-meta)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                              isActive
                                ? "bg-surface-2 font-medium text-fg shadow-[inset_2px_0_0_var(--color-accent)]"
                                : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {thread.title}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
