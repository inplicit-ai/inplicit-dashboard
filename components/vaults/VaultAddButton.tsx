"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { clientApi } from "@/lib/client-api";

/**
 * "Bereich hinzufügen" (⌘K) — creates a new CONTEXT section in the org's single
 * vault. Per-section item adds live on each section card; this control only adds
 * the section itself. ORG_OWNER only (the caller gates mounting on `canWrite`).
 *
 * Previously this button branched into a "roles mode" that wrote into the WRONG
 * target (it fell back to the org vault when a role had no vault yet). Role
 * context now lives on the role's own page (`/vaults/roles/:id`), so that
 * mis-targeting branch is gone entirely.
 */
export function VaultAddButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /** Open/close in one handler — resets transient state on close + focuses on
   *  open, without a setState-in-effect cascade. */
  function handleOpenChange(next: boolean) {
    if (next) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setName("");
      setError(null);
    }
    setOpen(next);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await clientApi.vault.sections.create(trimmed);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="shell-locale"
        title="Bereich hinzufügen (⌘K)"
      >
        <Plus size={14} className="shell-locale__icon" aria-hidden />
        <span className="text-[length:var(--text-caption)] font-medium">
          Bereich hinzufügen
        </span>
        <kbd className="ml-1 hidden rounded bg-surface-2 px-1 py-0.5 text-[10px] font-mono text-fg-faint sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Neuer Bereich</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void save()}
              placeholder="z. B. Wettbewerbsanalyse"
              className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
            />
          </div>
          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving || !name.trim()}>
              {saving && <Loader2 size={14} className="animate-spin" aria-hidden />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
