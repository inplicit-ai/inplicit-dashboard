"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { clientApi } from "@/lib/client-api";

/**
 * 3-dot menu on a CONTEXT section card. Actions: rename, delete.
 *
 * ROLE / CAMPAIGN sections are system-managed (they live and die with their
 * role/campaign) — they MUST NOT render this menu. The caller gates that by
 * only mounting it for `kind === "CONTEXT"`.
 */
export function VaultCardMenu({
  sectionId,
  sectionName,
}: {
  sectionId: string;
  sectionName: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(sectionName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  function flashAndRefresh() {
    setFlash(true);
    setTimeout(() => setFlash(false), 1500);
    router.refresh();
  }

  async function handleEdit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await clientApi.vault.sections.rename(sectionId, trimmed);
      setEditOpen(false);
      flashAndRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      await clientApi.vault.sections.delete(sectionId);
      setDeleteOpen(false);
      flashAndRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      // Always reset — the original code left the spinner spinning on success.
      setSaving(false);
    }
  }

  return (
    <>
      <div ref={menuRef} className="relative shrink-0">
        {flash && (
          <span className="absolute -left-20 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 text-[10px] font-medium text-success">
            <Check size={11} aria-hidden /> gespeichert
          </span>
        )}
        <button
          type="button"
          aria-label="Bereich-Aktionen"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <MoreHorizontal size={15} aria-hidden />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-ui border border-line bg-surface shadow-md">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] text-fg hover:bg-surface-2"
              onClick={() => {
                setMenuOpen(false);
                setName(sectionName);
                setError(null);
                setEditOpen(true);
              }}
            >
              <Pencil size={13} className="text-fg-subtle" aria-hidden />
              Umbenennen
            </button>
            <div className="h-px bg-line-subtle" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] text-danger hover:bg-danger-soft"
              onClick={() => { setMenuOpen(false); setError(null); setDeleteOpen(true); }}
            >
              <Trash2 size={13} aria-hidden />
              Löschen
            </button>
          </div>
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bereich umbenennen</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              Name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleEdit()}
              className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
            />
          </div>
          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={() => void handleEdit()} disabled={saving || !name.trim()}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bereich löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-fg-muted">
            <span className="font-medium text-fg">{sectionName}</span> und alle enthaltenen Einträge werden dauerhaft gelöscht.
          </p>
          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void handleDelete()} disabled={saving}>
              {saving ? "Löschen…" : "Endgültig löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
