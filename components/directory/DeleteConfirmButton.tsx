"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteConfirmButton({
  action,
  employeeId,
  employeeName,
}: {
  action: (formData: FormData) => Promise<void>;
  employeeId: string;
  employeeName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs text-fg-muted hover:bg-pain-soft hover:text-pain"
        aria-label={`${employeeName} entfernen`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Person wirklich entfernen?</DialogTitle>
            <DialogDescription>
              <strong>{employeeName}</strong> wird aus der Belegschaft entfernt.
              Aktive Interviews bleiben erhalten, neue Einladungen werden nicht
              mehr verschickt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <form action={action}>
              <input type="hidden" name="id" value={employeeId} />
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                onClick={() => setOpen(false)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Entfernen
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
