"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * 3-dot menu on a vault card.
 * Actions: Kontext hinzufügen (→ VaultAddButton trigger), Umbenennen, Löschen.
 */
export function VaultCardMenu({
  vaultId,
  vaultName,
  vaultDescription,
  onAddContext,
}: {
  vaultId: string;
  vaultName: string;
  vaultDescription?: string | null;
  onAddContext?: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(vaultName);
  const [description, setDescription] = useState(vaultDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function handleEdit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/dapi/orgs/me/vaults/${vaultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, description: description.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setEditOpen(false);
      router.refresh();
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
      const res = await fetch(`/dapi/orgs/me/vaults/${vaultId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204 && res.status !== 404) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setDeleteOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="Tresor-Aktionen"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <MoreHorizontal size={15} aria-hidden />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-ui border border-line bg-surface shadow-md">
            {onAddContext && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] text-fg hover:bg-surface-2"
                onClick={() => { setMenuOpen(false); onAddContext(); }}
              >
                <Plus size={13} className="text-fg-subtle" aria-hidden />
                Kontext hinzufügen
              </button>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] text-fg hover:bg-surface-2"
              onClick={() => {
                setMenuOpen(false);
                setName(vaultName);
                setDescription(vaultDescription ?? "");
                setError(null);
                setEditOpen(true);
              }}
            >
              <Pencil size={13} className="text-fg-subtle" aria-hidden />
              Kontext bearbeiten
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kontext bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
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
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                Beschreibung
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kurze Beschreibung (optional)"
                className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
              />
            </div>
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
            <DialogTitle>Tresor löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-fg-muted">
            <span className="font-medium text-fg">{vaultName}</span> und alle enthaltenen Einträge werden dauerhaft gelöscht.
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
