"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Employee } from "@/lib/api";

/**
 * "Neue Abteilung" dialog — creates a team/department by PATCHing the
 * `department` field on selected employees. No backend endpoint needed;
 * department is a free-text string on each employee record.
 */
export function CreateTeamDialog({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function reset() {
    setName("");
    setSelected(new Set());
    setError(null);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Bitte einen Namen eingeben."); return; }
    if (selected.size === 0) { setError("Mindestens eine Person auswählen."); return; }

    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        Array.from(selected).map((id) => {
          const emp = employees.find((e) => e.id === id);
          if (!emp) return Promise.resolve();
          return fetch(`/dapi/orgs/me/employees/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emp.email, department: trimmed }),
          }).then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => ({})) as { error?: string };
              throw new Error(body.error ?? `HTTP ${res.status}`);
            }
          });
        }),
      );
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Group employees: unassigned to any dept, or already in a dept
  const unassigned = employees.filter((e) => !e.department);
  const byDept = employees.reduce<Record<string, Employee[]>>((acc, e) => {
    if (e.department) {
      acc[e.department] ??= [];
      acc[e.department].push(e);
    }
    return acc;
  }, {});

  return (
    <>
      <Button
        variant="outline"
        onClick={() => { reset(); setOpen(true); }}
        className="gap-1.5"
      >
        <Plus size={15} aria-hidden />
        Neue Abteilung
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abteilung anlegen</DialogTitle>
          </DialogHeader>

          {/* Team name */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              Name der Abteilung *
            </label>
            <input
              autoFocus
              type="text"
              placeholder="z. B. Produkt, Engineering, Sales"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void save()}
              className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
            />
          </div>

          {/* Person selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              Personen zuordnen
            </label>
            <div className="max-h-56 overflow-y-auto rounded-ui border border-line divide-y divide-line-subtle">
              {employees.length === 0 && (
                <p className="px-3 py-3 text-[12px] text-fg-muted">Noch keine Personen in der Belegschaft.</p>
              )}

              {/* Unassigned first */}
              {unassigned.map((e) => (
                <PersonRow key={e.id} emp={e} selected={selected.has(e.id)} onToggle={toggle} />
              ))}

              {/* Already-in-dept: show as separate groups */}
              {Object.entries(byDept).map(([dept, emps]) => (
                <div key={dept}>
                  <div className="bg-surface-2 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">{dept}</span>
                  </div>
                  {emps.map((e) => (
                    <PersonRow key={e.id} emp={e} selected={selected.has(e.id)} onToggle={toggle} />
                  ))}
                </div>
              ))}
            </div>
            {selected.size > 0 && (
              <p className="text-[11px] text-fg-subtle">
                {selected.size} Person{selected.size !== 1 ? "en" : ""} ausgewählt
                {selected.size > 0 && name.trim() && ` → werden „${name.trim()}" zugewiesen`}
              </p>
            )}
          </div>

          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving || !name.trim() || selected.size === 0}>
              {saving ? "Wird gespeichert…" : "Abteilung anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PersonRow({
  emp,
  selected,
  onToggle,
}: {
  emp: Employee;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(emp.id)}
        className="h-3.5 w-3.5 rounded accent-fg"
      />
      <Users size={13} className="shrink-0 text-fg-faint" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-fg">{emp.name || emp.email}</p>
        {emp.name && <p className="truncate text-[11px] text-fg-subtle">{emp.email}</p>}
      </div>
    </label>
  );
}
