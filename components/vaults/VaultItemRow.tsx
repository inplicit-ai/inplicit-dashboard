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
import type { VaultItem } from "@/lib/api";
import { VaultItemDialog } from "@/components/vaults/VaultItemDialog";

/** Human-readable label for a VaultItem — never shows raw UUIDs. */
function itemLabel(it: VaultItem): string {
  if (it.title) return it.title;
  if (it.kind === "URL" && it.content) {
    try {
      const u = new URL(it.content);
      const readable = (u.hostname + u.pathname).replace(/\/$/, "");
      return readable.length > 60 ? readable.slice(0, 57) + "…" : readable;
    } catch {
      return it.content.slice(0, 60);
    }
  }
  if (it.kind === "TEXT" && it.content) {
    const snippet = it.content.trim().replace(/\s+/g, " ").slice(0, 60);
    return snippet.length < it.content.trim().length ? snippet + "…" : snippet;
  }
  return it.kind === "FILE" ? "Datei" : "Eintrag";
}

export function VaultItemRow({
  item,
  sectionId,
}: {
  item: VaultItem;
  sectionId: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [title, setTitle] = useState(item.title ?? "");
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
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

  /** Brief success flash after a mutation, then refresh the server render. */
  function flashAndRefresh() {
    setFlash(true);
    setTimeout(() => setFlash(false), 1500);
    router.refresh();
  }

  async function handleRename() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await clientApi.vault.items.patch(sectionId, item.id, { title: trimmed });
      setRenameOpen(false);
      flashAndRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      // Always clear the busy flag — the original code leaked a stuck spinner
      // on the SUCCESS path because it only reset on error.
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      await clientApi.vault.items.delete(sectionId, item.id);
      setDeleteOpen(false);
      flashAndRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReindex() {
    setReindexing(true);
    setError(null);
    try {
      await clientApi.vault.items.reindex(sectionId, item.id);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReindexing(false);
    }
  }

  const label = itemLabel(item);

  return (
    <li className="flex items-start gap-2.5 px-3 py-2.5">
      <span className="mt-0.5 shrink-0 rounded border border-line bg-surface-2 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-subtle">
        {item.kind}
      </span>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          title="Extrahierten Inhalt ansehen"
          className="block w-full truncate text-left text-[13px] font-medium text-fg transition-colors hover:text-accent"
        >
          {label}
        </button>
        {item.kind === "URL" && item.content && (
          <p className="truncate text-[11px] text-fg-faint">{item.content}</p>
        )}
      </div>

      {flash ? (
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-success">
          <Check size={11} aria-hidden /> gespeichert
        </span>
      ) : !item.embedded ? (
        <button
          type="button"
          onClick={() => void handleReindex()}
          disabled={reindexing}
          title={
            item.index_error
              ? `Indexierung fehlgeschlagen: ${item.index_error}`
              : "Noch nicht durchsuchbar — klicken zum erneuten Indexieren"
          }
          className="mt-0.5 shrink-0 rounded-full border border-warning/40 bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning transition-colors hover:border-warning disabled:opacity-60"
        >
          {reindexing ? "indexiere…" : "nicht indexiert — erneut versuchen"}
        </button>
      ) : null}

      {/* 3-dot menu */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="Eintrag-Aktionen"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <MoreHorizontal size={13} aria-hidden />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-ui border border-line bg-surface shadow-md">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-fg hover:bg-surface-2"
              onClick={() => {
                setMenuOpen(false);
                setTitle(item.title ?? "");
                setError(null);
                setRenameOpen(true);
              }}
            >
              <Pencil size={12} className="text-fg-subtle" aria-hidden />
              Titel bearbeiten
            </button>
            <div className="h-px bg-line-subtle" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-danger hover:bg-danger-soft"
              onClick={() => {
                setMenuOpen(false);
                setError(null);
                setDeleteOpen(true);
              }}
            >
              <Trash2 size={12} aria-hidden />
              Löschen
            </button>
          </div>
        )}
      </div>

      {/* Detail popup — what was extracted for THIS item (markdown rendered). */}
      <VaultItemDialog item={item} open={detailOpen} onOpenChange={setDetailOpen} />

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Titel bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              Titel
            </label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              placeholder={itemLabel(item)}
              className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
            />
          </div>
          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRenameOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={handleRename} disabled={saving || !title.trim()}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eintrag löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-fg-muted">
            <span className="font-medium text-fg">{label}</span> wird dauerhaft entfernt.
          </p>
          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
              {saving ? "Löschen…" : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
