"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusDisc } from "@/components/ui/status-disc";
import { DataChip, type DataChipTone } from "@/components/ui/data-chip";
import { clientApi } from "@/lib/client-api";
import { ApiError, type RefineFieldLock, type RefineInfo } from "@/lib/api";

async function fetchRefineInfo(campaignId: string): Promise<RefineInfo> {
  const res = await fetch(`/dapi/campaigns/${campaignId}/refine`);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as RefineInfo;
}

/**
 * "Refine campaign" re-entry. The primary action reopens EDDA on the campaign's
 * existing draft (its intermediate state) so the user can keep refining by
 * conversation: it resolves the launched campaign back to its `campaign_configs`
 * draft and routes to the setup chat.
 *
 * Fallback: older campaigns created before the setup agent existed have no
 * draft (the backend answers 404). For those we keep the previous behaviour —
 * a dialog that surfaces the server-enforced lock matrix (which structural
 * fields stay editable once interviews exist). Any other error is shown inline.
 */
export function RefineButton({ campaignId }: { campaignId: string }) {
  const t = useTranslations("campaignChat");
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock-matrix fallback dialog state (legacy campaigns only).
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [info, setInfo] = useState<RefineInfo | null>(null);

  async function onClick() {
    if (opening) return;
    setError(null);
    setOpening(true);
    try {
      const ref = await clientApi.setup.resolveDraft(campaignId);
      router.push(`/campaigns/new/${ref.draft_id}`);
      // Keep the spinner until the route transition unmounts us.
      return;
    } catch (e) {
      // No draft bound to this campaign → fall back to the lock-matrix dialog.
      if (e instanceof ApiError && e.status === 404) {
        await openFallback();
      } else {
        setError(
          e instanceof Error ? e.message : t("refineError"),
        );
      }
    } finally {
      setOpening(false);
    }
  }

  async function openFallback() {
    try {
      if (!info) setInfo(await fetchRefineInfo(campaignId));
      setFallbackOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("refineError"));
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={onClick} disabled={opening}>
        <Sparkles className="h-3.5 w-3.5" />
        {opening ? t("refineOpening") : t("refine")}
      </Button>

      {error && (
        <p className="rounded-ui border border-danger/30 bg-danger-soft px-3 py-2 text-[length:var(--text-body)] text-danger">
          {error}
        </p>
      )}

      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("refineTitle")}</DialogTitle>
            <DialogDescription>{t("refineBody")}</DialogDescription>
          </DialogHeader>

          {info && (
            <ul className="overflow-hidden rounded-card border border-line shadow-card">
              {info.fields.map((f) => (
                <FieldRow key={f.field} field={f} />
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** mode → DataChip tint. Editable is the only unlocked, "go" state. */
const MODE_TONE: Record<string, DataChipTone> = {
  editable: "success",
  append_only: "neutral",
  future_only: "warning",
  locked: "neutral",
};

/** A refine-field row: a status disc encodes lock state, a DataChip carries the
 *  server-enforced edit mode. */
function FieldRow({ field }: { field: RefineFieldLock }) {
  const t = useTranslations("campaignChat");
  return (
    <li className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3 border-b border-line-subtle bg-surface px-4 py-3 text-[length:var(--text-body)] last:border-b-0">
      <span className="flex justify-center">
        <StatusDisc state={field.locked ? "idle" : "done"} size="sm" />
      </span>
      <span className="truncate capitalize text-fg">
        {field.field.replace(/_/g, " ")}
      </span>
      <DataChip tone={MODE_TONE[field.mode] ?? "neutral"}>
        {t(`refineMode.${field.mode}`)}
      </DataChip>
    </li>
  );
}
