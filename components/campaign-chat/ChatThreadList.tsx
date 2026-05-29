"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
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
 * Left thread list — the persistence affordance. Newest first, active row
 * marked with the accent (Braun: accent only for active/focus, never as a fill).
 */
export function ChatThreadList({
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
  const t = useTranslations("campaignChat");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line-subtle px-3 py-3">
        <span className="label-eyebrow">{t("threadsTitle")}</span>
        <button
          type="button"
          onClick={onNew}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-ui border border-line bg-surface px-2 py-1 text-[13px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("newChat")}
        </button>
      </div>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {threads.length === 0 ? (
          <p className="px-2 py-3 text-[13px] text-fg-subtle">
            {t("emptyThreads")}
          </p>
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
                      "flex w-full items-center gap-2 rounded-ui border-l-2 px-2.5 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "border-accent bg-surface-2 font-medium text-fg"
                        : "border-transparent text-fg-muted hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {thread.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-subtle">
                      {relativeTime(thread.updated_at)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(thread.id)}
                    aria-label={t("deleteThread")}
                    className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-ui p-1 text-fg-subtle hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:block"
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
