"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusDisc } from "@/components/ui/status-disc";
import { DataChip, type DataChipTone } from "@/components/ui/data-chip";
import type { RefineFieldLock, RefineInfo } from "@/lib/api";

async function fetchRefineInfo(campaignId: string): Promise<RefineInfo> {
  const res = await fetch(`/dapi/campaigns/${campaignId}/refine`);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as RefineInfo;
}

/**
 * "Refine campaign" re-entry. Opens a dialog that loads the server-enforced
 * lock matrix (which structural fields are editable / locked once interviews
 * exist) before re-entering the setup assistant. The lock is enforced
 * server-side (409); this surface only mirrors it.
 */
export function RefineButton({ campaignId }: { campaignId: string }) {
  const t = useTranslations("campaignChat");
  const [info, setInfo] = useState<RefineInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onOpenChange(open: boolean) {
    if (open && !info) {
      try {
        setInfo(await fetchRefineInfo(campaignId));
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-3.5 w-3.5" />
          {t("refine")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("refineTitle")}</DialogTitle>
          <DialogDescription>{t("refineBody")}</DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-ui border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {info && (
          <ul className="overflow-hidden rounded-card border border-line">
            {info.fields.map((f) => (
              <FieldRow key={f.field} field={f} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** mode → DataChip tint. Editable is the only unlocked, "go" state. */
const MODE_TONE: Record<string, DataChipTone> = {
  editable: "success",
  append_only: "neutral",
  future_only: "warning",
  locked: "neutral",
};

/** A refine-field row in the spine language: a status disc encodes lock state,
 *  a mono-tracked DataChip carries the server-enforced edit mode. */
function FieldRow({ field }: { field: RefineFieldLock }) {
  const t = useTranslations("campaignChat");
  return (
    <li className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3 border-b border-line-subtle bg-surface px-3 py-2.5 text-sm last:border-b-0">
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
