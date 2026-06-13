"use client";

import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeptCombobox } from "./DeptCombobox";
import type { Employee } from "@/lib/api";

export function EditPersonDialog({
  employee,
  action,
  roleListId,
  deptListId: _deptListId,
  deptOptions = [],
}: {
  employee: Employee;
  action: (formData: FormData) => Promise<void>;
  roleListId: string;
  deptListId: string;
  deptOptions?: string[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`${employee.name ?? employee.email} bearbeiten`}
        className="text-xs text-fg-muted hover:text-fg"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Person bearbeiten</DialogTitle>
            <DialogDescription>
              Ändere Name, E-Mail, Abteilung oder Rolle.
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
            <input type="hidden" name="id" value={employee.id} />
            <Input
              name="name"
              placeholder="Name"
              defaultValue={employee.name ?? ""}
              className="text-sm"
            />
            <Input
              name="email"
              type="email"
              required
              placeholder="person@firma.de"
              defaultValue={employee.email}
              className="text-sm"
            />
            <DeptCombobox
              name="department"
              options={deptOptions}
              placeholder="Abteilung (optional)"
              defaultValue={employee.department ?? ""}
            />
            <Input
              name="role"
              list={roleListId}
              placeholder="Rolle (optional)"
              defaultValue={employee.role_name ?? ""}
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
                Speichern
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
