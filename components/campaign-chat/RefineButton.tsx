"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
          <ul className="divide-y divide-line-subtle overflow-hidden rounded-card border border-line">
            {info.fields.map((f) => (
              <FieldRow key={f.field} field={f} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ field }: { field: RefineFieldLock }) {
  const t = useTranslations("campaignChat");
  return (
    <li className="flex items-center justify-between gap-3 bg-surface px-3 py-2.5 text-sm">
      <span className="capitalize text-fg">
        {field.field.replace(/_/g, " ")}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
          field.locked
            ? "border-line bg-surface-2 text-fg-subtle"
            : "border-accent-muted bg-accent-soft text-accent",
        )}
      >
        {field.locked && <Lock className="h-3 w-3" />}
        {t(`refineMode.${field.mode}`)}
      </span>
    </li>
  );
}
