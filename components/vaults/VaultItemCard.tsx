import { FileText, Link2, Upload, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DataChip } from "@/components/ui/data-chip";
import { IndexStatusPill } from "@/components/vaults/IndexStatusPill";
import type { VaultItem } from "@/lib/api";

/* ────────────────────────────────────────────────────────────────────────────
 * VaultItemCard — one item row per kind (FILE / TEXT / URL).
 *
 * Leads with a kind glyph, shows title + preview + scope/mime chips, and ends
 * with the index-status pill ("durchsuchbar" / "wird indexiert"). Server-safe.
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

export function VaultItemCard({
  item,
  kindLabel,
  indexedLabel,
  indexingLabel,
}: {
  item: VaultItem;
  kindLabel: string;
  indexedLabel: string;
  indexingLabel: string;
}) {
  const Icon = KIND_ICON[item.kind];
  return (
    <Card className="gap-2 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-ui border border-line bg-surface-2 text-fg-muted">
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span className="truncate text-[length:var(--text-body-sm)] font-medium text-fg">
              {item.title ?? item.id}
            </span>
            <IndexStatusPill
              embedded={item.embedded}
              indexedLabel={indexedLabel}
              indexingLabel={indexingLabel}
            />
          </div>
          {item.content && (
            <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted">
              {item.content}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <DataChip tone="neutral" mono>
              {kindLabel}
            </DataChip>
            {item.mime && (
              <DataChip tone="neutral" mono>
                {item.mime}
              </DataChip>
            )}
            {typeof item.byte_size === "number" && (
              <DataChip tone="neutral" mono>
                {formatBytes(item.byte_size)}
              </DataChip>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
