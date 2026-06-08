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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { VaultItem } from "@/lib/api";

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
  vaultId,
}: {
  item: VaultItem;
  vaultId: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(item.title ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
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

  async function handleRename() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/dapi/orgs/me/vaults/${vaultId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
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
      const res = await fetch(`/dapi/orgs/me/vaults/${vaultId}/items/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204 && res.status !== 404) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setDeleteOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  const label = itemLabel(item);
  const summary = item.summary;
  const SUMMARY_CUTOFF = 100;
  const summaryTruncated = summary && summary.length > SUMMARY_CUTOFF && !summaryExpanded;
  const summaryText = summaryTruncated ? summary.slice(0, SUMMARY_CUTOFF) + "…" : summary;

  return (
    <li className="flex items-start gap-2.5 px-3 py-2.5">
      <span className="mt-0.5 shrink-0 rounded border border-line bg-surface-2 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-subtle">
        {item.kind}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-fg">{label}</p>
        {item.kind === "URL" && item.content && (
          <p className="truncate text-[11px] text-fg-faint">{item.content}</p>
        )}
        {/* Auto-generated summary */}
        {summaryText && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
            {summaryText}
            {summaryTruncated && (
              <button
                type="button"
                onClick={() => setSummaryExpanded(true)}
                className="ml-1 text-fg-subtle underline hover:text-fg"
              >
                mehr anzeigen
              </button>
            )}
          </p>
        )}
      </div>

      {!item.embedded && (
        <span className="mt-0.5 shrink-0 text-[10px] text-fg-faint">indexiert…</span>
      )}

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
