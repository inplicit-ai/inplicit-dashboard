"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Link2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Mode = "url" | "text";

/**
 * "Kontext hinzufügen" button with ⌘K keyboard shortcut.
 * Opens a dialog to add a URL or Text item to the active vault.
 */
export function VaultAddButton({
  vaultId,
}: {
  vaultId: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("url");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

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

  // Auto-focus first input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 80);
    } else {
      setContent("");
      setTitle("");
      setError(null);
    }
  }, [open, mode]);

  async function save() {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (mode === "url") {
      try { new URL(trimmed); } catch {
        setError("Bitte eine gültige URL eingeben (z. B. https://example.com).");
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/dapi/orgs/me/vaults/${vaultId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: mode === "url" ? "URL" : "TEXT",
          content: trimmed,
          title: title.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
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
        onClick={() => setOpen(true)}
        className="shell-locale"
        title="Kontext hinzufügen (⌘K)"
      >
        <Plus size={14} className="shell-locale__icon" aria-hidden />
        <span className="text-[length:var(--text-caption)] font-medium">
          Hinzufügen
        </span>
        <kbd className="ml-1 hidden rounded bg-surface-2 px-1 py-0.5 text-[10px] font-mono text-fg-faint sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kontext hinzufügen</DialogTitle>
            <DialogDescription>
              Füge eine URL oder einen Text zu diesem Vault hinzu. Inhalte werden
              automatisch indexiert.
            </DialogDescription>
          </DialogHeader>

          {/* Mode switcher */}
          <div className="flex gap-1 rounded-ui border border-line-subtle bg-surface-2 p-1">
            {(["url", "text"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-ui px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  mode === m
                    ? "bg-surface text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {m === "url" ? <Link2 size={13} aria-hidden /> : <FileText size={13} aria-hidden />}
                {m === "url" ? "URL" : "Text"}
              </button>
            ))}
          </div>

          {/* Fields — title first, then content */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                Titel
              </label>
              <input
                ref={firstInputRef as React.RefObject<HTMLInputElement>}
                type="text"
                placeholder={mode === "url" ? "z. B. Unternehmens-Website" : "z. B. Produktstrategie Q3"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
              />
            </div>

            {mode === "url" ? (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                  URL *
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                  className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                  Inhalt *
                </label>
                <textarea
                  placeholder="Füge hier deinen Text ein…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="resize-none rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-[12px] text-danger" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={saving || !content.trim()}
            >
              {saving ? "Wird gespeichert…" : "Hinzufügen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
