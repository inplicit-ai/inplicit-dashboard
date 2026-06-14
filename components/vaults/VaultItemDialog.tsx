"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clientApi } from "@/lib/client-api";
import type { VaultItem } from "@/lib/api";

/**
 * Item-detail popup: shows exactly what was extracted/stored for one vault item
 * (markdown for OCR'd PDFs — tables/headings preserved). Fetches lazily by id
 * when opened, so search hits (which carry only `item_id`) can open it directly.
 *
 * Content is rendered as monospace preformatted text — a faithful view of the
 * stored markdown. (A rich markdown renderer can replace the <pre> later without
 * touching the data flow.)
 */
export function VaultItemDialog({
  itemId,
  open,
  onOpenChange,
  fallbackTitle,
}: {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown in the header until the full item loads (e.g. the search hit title). */
  fallbackTitle?: string | null;
}) {
  const [item, setItem] = useState<VaultItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !itemId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItem(null);
    clientApi.vault.items
      .get(itemId)
      .then((data) => {
        if (!cancelled) setItem(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, itemId]);

  const title = item?.title ?? fallbackTitle ?? "Ohne Titel";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={16} className="shrink-0 text-fg-muted" aria-hidden />
            <span className="truncate">{title}</span>
          </DialogTitle>
        </DialogHeader>

        {item && <ItemMeta item={item} />}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-fg-muted">
            <Loader2 size={15} className="animate-spin" aria-hidden />
            Lädt…
          </div>
        )}

        {error && (
          <p className="py-4 text-[12px] text-danger" role="alert">
            {error}
          </p>
        )}

        {item && !loading && <ItemBody item={item} />}
      </DialogContent>
    </Dialog>
  );
}

/** Kind + mime + index status row. */
function ItemMeta({ item }: { item: VaultItem }) {
  const kindLabel =
    item.kind === "FILE" && item.mime?.includes("pdf") ? "PDF" : item.kind;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="rounded bg-surface-2 px-1.5 py-0.5 font-medium text-fg-subtle">
        {kindLabel}
      </span>
      {item.index_error ? (
        <span className="inline-flex items-center gap-1 rounded bg-danger-soft px-1.5 py-0.5 text-danger">
          <AlertTriangle size={11} aria-hidden /> Indexierung fehlgeschlagen
        </span>
      ) : item.embedded ? (
        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-fg-subtle">
          Durchsuchbar
        </span>
      ) : null}
    </div>
  );
}

/** Extracted content (markdown) as preformatted monospace, or an empty-state. */
function ItemBody({ item }: { item: VaultItem }) {
  const content = item.content?.trim();
  if (!content) {
    return (
      <p className="py-6 text-center text-[13px] text-fg-muted">
        {item.index_error
          ? "Aus dieser Datei konnte kein Text extrahiert werden."
          : "Noch kein Text extrahiert."}
      </p>
    );
  }
  return (
    <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-ui border border-line bg-surface-2 p-4 font-mono text-[12px] leading-relaxed text-fg">
      {content}
    </pre>
  );
}
