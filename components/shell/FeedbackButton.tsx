"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconMessage } from "@/components/icons";

const JAM_URL = process.env.NEXT_PUBLIC_JAM_RECORDING_URL ?? "";

export function FeedbackButton() {
  const t = useTranslations("feedback");
  const [open, setOpen] = useState(false);

  function handleRecord() {
    if (JAM_URL) window.open(JAM_URL, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="shell-locale">
          <IconMessage size={15} className="shell-locale__icon" aria-hidden="true" />
          <span className="text-[length:var(--text-caption)] font-medium">{t("trigger")}</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleRecord} disabled={!JAM_URL}>
            <Video className="h-4 w-4" />
            {t("record")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
