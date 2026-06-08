"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CampaignActionsMenuProps {
  campaignId: string;
  currentName: string;
  /** After delete, redirect here (default: /campaigns). */
  afterDeleteHref?: string;
}

export function CampaignActionsMenu({
  campaignId,
  currentName,
  afterDeleteHref = "/campaigns",
}: CampaignActionsMenuProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
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

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/dapi/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setRenameOpen(false);
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
      const res = await fetch(`/dapi/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      // 204 = deleted, 404 = already gone (soft-delete already processed)
      if (!res.ok && res.status !== 204 && res.status !== 404) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setDeleteOpen(false);
      router.push(afterDeleteHref);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <>
      {/* Trigger + popover menu */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label="Kampagnen-Aktionen"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="flex h-8 w-8 items-center justify-center rounded-ui text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <MoreHorizontal size={16} aria-hidden />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-ui border border-line bg-surface shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-fg hover:bg-surface-2"
              onClick={() => {
                setMenuOpen(false);
                setName(currentName);
                setError(null);
                setRenameOpen(true);
              }}
            >
              <Pencil size={13} className="text-fg-subtle" aria-hidden />
              Umbenennen
            </button>
            <div className="h-px bg-line-subtle" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-danger-soft"
              onClick={() => {
                setMenuOpen(false);
                setError(null);
                setDeleteOpen(true);
              }}
            >
              <Trash2 size={13} aria-hidden />
              Löschen
            </button>
          </div>
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kampagne umbenennen</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              Name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
              placeholder="Kampagne"
            />
          </div>
          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRenameOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={handleRename} disabled={saving || !name.trim()}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kampagne löschen?</DialogTitle>
            <DialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Interviews
              und Insights dieser Kampagne werden dauerhaft gelöscht.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Löschen…" : "Endgültig löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
