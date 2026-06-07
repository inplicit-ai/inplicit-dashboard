"use client";

import { useState } from "react";
import {
  FileText,
  Link2,
  Loader2,
  RefreshCw,
  TriangleAlert,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataChip } from "@/components/ui/data-chip";
import { IndexStatusPill } from "@/components/vaults/IndexStatusPill";
import { reindexFileItem } from "@/lib/vaults/upload";
import { cn } from "@/lib/utils";
import type { VaultItem } from "@/lib/api";

/* ────────────────────────────────────────────────────────────────────────────
 * VaultPeekPanel — the calm slide-in peek for one vault item (F2 part b).
 *
 * Reuses the Dialog primitive but anchors it to the right edge as a quiet sheet:
 * extracted-text preview, metadata (kind / size / scope / index status) and a
 * "re-index" action that re-runs ingestion for FILE items. No tokens are
 * touched — positioning is pure className overrides on DialogContent.
 * ────────────────────────────────────────────────────────────────────────── */

const KIND_ICON: Record<VaultItem["kind"], LucideIcon> = {
  FILE: Upload,
  TEXT: FileText,
  URL: Link2,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VaultPeekPanel({
  item,
  vaultId,
  onClose,
  onReindexed,
}: {
  item: VaultItem | null;
  vaultId: string | null;
  onClose: () => void;
  onReindexed: (next: VaultItem) => void;
}) {
  const t = useTranslations("vaultHub");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reindex() {
    if (!item || !vaultId) return;
    setBusy(true);
    setError(null);
    try {
      const next = await reindexFileItem(vaultId, item.id);
      onReindexed(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const open = item !== null;
  const Icon = item ? KIND_ICON[item.kind] : FileText;
  const kindLabel = item
    ? item.kind === "FILE"
      ? t("kindFile")
      : item.kind === "URL"
        ? t("kindUrl")
        : t("kindText")
    : "";
  // Re-index re-runs the finalize ingestion, which only exists for uploaded
  // FILE items (it re-reads the S3 object). Disabled for TEXT / URL.
  const canReindex = item?.kind === "FILE";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton
        // Right-anchored sheet: full-height, fixed width, slides in from the
        // right. Overrides the centered DialogContent positioning only.
        className={cn(
          "top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-md translate-x-0 translate-y-0 rounded-none border-y-0 border-r-0 border-l p-0",
          "data-[state=open]:slide-in-from-right-6 data-[state=closed]:slide-out-to-right-6 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {item && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-line-subtle px-6 pt-6 pb-4 pr-12">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-ui border border-line bg-surface-2 text-fg-muted">
                <Icon size={16} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate">
                  {item.title ?? item.id}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {t("peekTitle")}
                </DialogDescription>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {/* Metadata */}
              <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5">
                <MetaRow label={t("peekKind")}>
                  <DataChip tone="neutral" mono>
                    {kindLabel}
                  </DataChip>
                </MetaRow>
                {item.mime && (
                  <MetaRow label={t("peekMime")}>
                    <DataChip tone="neutral" mono>
                      {item.mime}
                    </DataChip>
                  </MetaRow>
                )}
                {typeof item.byte_size === "number" && (
                  <MetaRow label={t("peekSize")}>
                    <DataChip tone="neutral" mono>
                      {formatBytes(item.byte_size)}
                    </DataChip>
                  </MetaRow>
                )}
                {item.scope && (
                  <MetaRow label={t("peekScope")}>
                    <DataChip tone="neutral" mono>
                      {item.scope}
                    </DataChip>
                  </MetaRow>
                )}
                <MetaRow label={t("peekIndexStatus")}>
                  <IndexStatusPill
                    embedded={item.embedded}
                    indexedLabel={t("indexed")}
                    indexingLabel={t("indexing")}
                  />
                </MetaRow>
              </dl>

              {/* Extracted-text preview */}
              <div className="mt-6">
                <p className="text-[length:var(--text-caption)] font-medium tracking-wide text-fg-subtle uppercase">
                  {t("peekPreview")}
                </p>
                {item.content ? (
                  <p className="mt-2 whitespace-pre-wrap text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted">
                    {item.content}
                  </p>
                ) : (
                  <p className="mt-2 text-[length:var(--text-body-sm)] text-fg-faint italic">
                    {t("noPreview")}
                  </p>
                )}
              </div>
            </div>

            {/* Footer action */}
            <div className="border-t border-line-subtle px-6 py-4">
              {error && (
                <p className="mb-2 flex items-center gap-1.5 text-[length:var(--text-caption)] text-danger">
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                  {error}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={!canReindex || busy}
                onClick={() => void reindex()}
                title={canReindex ? undefined : t("peekReindexFileOnly")}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )}
                {t("peekReindex")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-[length:var(--text-body-sm)] text-fg-subtle">
        {label}
      </dt>
      <dd className="flex justify-end">{children}</dd>
    </>
  );
}
