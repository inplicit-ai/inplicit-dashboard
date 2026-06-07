import { StatusBadge } from "@/components/ui/status-badge";

/* ────────────────────────────────────────────────────────────────────────────
 * IndexStatusPill — the per-item "searchable / indexing" pill.
 *
 * `embedded === true`  → green "durchsuchbar" (the item is in the vector index).
 * `embedded === false` → amber "wird indexiert" (still being processed).
 *
 * Pure wrapper over the shared StatusBadge so the index state speaks the same
 * status language as every other lifecycle pill. Server-safe.
 * ────────────────────────────────────────────────────────────────────────── */

export function IndexStatusPill({
  embedded,
  indexedLabel,
  indexingLabel,
}: {
  embedded: boolean;
  indexedLabel: string;
  indexingLabel: string;
}) {
  return embedded ? (
    <StatusBadge status="verified" withIcon label={indexedLabel} />
  ) : (
    <StatusBadge status="live" withIcon label={indexingLabel} />
  );
}
