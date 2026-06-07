"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { Textarea } from "@/components/ui/textarea";
import { IconMessage } from "@/components/icons";

/**
 * Feedback affordance in the topbar (WHY-100).
 *
 * Minimal modal stub: lets a user jot a note about the current page. The full
 * vision — "starts an Inplicit interview about the current page" — is a larger
 * piece of work that needs a backend endpoint and the interview-agent wiring,
 * so it is intentionally deferred below.
 *
 * TODO(WHY-100): replace the local-only submit with the real flow that launches
 * an Inplicit interview seeded by the current `pathname`. Needs a backend
 * endpoint (POST feedback / start-interview) and a decision on where the
 * resulting interview surfaces. Until then this only closes the dialog.
 */
export function FeedbackButton() {
  const t = useTranslations("feedback");
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit() {
    // TODO(WHY-100): persist / start interview. No backend yet — close only.
    setMessage("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <IconMessage size={15} aria-hidden="true" />
          <span>{t("trigger")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("placeholder")}
          rows={4}
          aria-label={t("title")}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={message.trim().length === 0}>
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
