"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clientApi } from "@/lib/client-api";
import type { VaultItem } from "@/lib/api";

/**
 * Item-detail popup: shows exactly what was extracted/stored for one vault item,
 * rendered as real markdown (OCR'd PDF tables/headings/lists). Either pass a
 * preloaded `item` (section rows already have it) or an `itemId` to fetch lazily
 * (search hits carry only the id).
 */
export function VaultItemDialog({
  item: preloaded,
  itemId,
  open,
  onOpenChange,
  fallbackTitle,
}: {
  item?: VaultItem | null;
  itemId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown in the header until a fetched item loads (e.g. the search hit title). */
  fallbackTitle?: string | null;
}) {
  const [fetched, setFetched] = useState<VaultItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Preloaded items need no fetch; otherwise resolve by id on open.
    if (preloaded || !open || !itemId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      setFetched(null);
      try {
        const data = await clientApi.vault.items.get(itemId);
        if (!cancelled) setFetched(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, itemId, preloaded]);

  const item = preloaded ?? fetched;
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

/** Markdown element styling via Tailwind arbitrary variants on the container —
 *  no typography plugin, no per-element override map. Tables/headings/lists/code
 *  all get design-token styling; the GFM table plugin handles the table syntax. */
const MD_CLASS = [
  "max-h-[60vh] overflow-auto rounded-ui border border-line bg-surface-2 p-4",
  "text-[13px] leading-relaxed text-fg-muted",
  "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-[15px] [&_h1]:font-semibold [&_h1]:text-fg [&_h1:first-child]:mt-0",
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:text-fg [&_h2:first-child]:mt-0",
  "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-fg [&_h3:first-child]:mt-0",
  "[&_p]:my-2 [&_strong]:font-semibold [&_strong]:text-fg [&_a]:text-accent [&_a]:underline",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:italic",
  "[&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px]",
  "[&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:rounded-ui [&_pre]:border [&_pre]:border-line [&_pre]:bg-surface [&_pre]:p-3 [&_pre]:text-[11px]",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[12px]",
  "[&_th]:border [&_th]:border-line [&_th]:bg-surface [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold [&_th]:text-fg",
  "[&_td]:border [&_td]:border-line [&_td]:px-2 [&_td]:py-1 [&_td]:align-top",
  "[&_hr]:my-3 [&_hr]:border-line",
].join(" ");

/** Extracted content rendered as markdown, or an empty-state. */
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
    <div className={MD_CLASS}>
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
