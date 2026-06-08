"use client";

import { useRef, useState } from "react";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * "Person hinzufügen" button + dialog.
 *
 * The actual form action is a server action passed in as a prop so this client
 * component stays thin and the page stays a server component.
 */
export function AddPersonDialog({
  action,
  roleListId,
}: {
  action: (formData: FormData) => Promise<void>;
  roleListId: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Person hinzufügen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Person hinzufügen</DialogTitle>
            <DialogDescription>
              E-Mail ist erforderlich. Die Rolle bestimmt den Interview-Kontext —
              eine neue Rolle wird automatisch angelegt.
            </DialogDescription>
          </DialogHeader>

          <form
            ref={formRef}
            action={async (fd) => {
              await action(fd);
              setOpen(false);
            }}
            className="flex flex-col gap-3"
          >
            <Input name="name" placeholder="Name" className="text-sm" />
            <Input
              name="email"
              type="email"
              required
              placeholder="person@firma.de"
              className="text-sm"
            />
            <Input
              name="department"
              placeholder="Abteilung (optional)"
              className="text-sm"
            />
            <Input
              name="role"
              list={roleListId}
              placeholder="Rolle (optional)"
              className="text-sm"
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" size="sm">
                <UserPlus className="h-4 w-4" />
                Hinzufügen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
