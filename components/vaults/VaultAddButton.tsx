"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, Link2, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TwinRole } from "@/lib/api";

type Mode = "url" | "text" | "file";

type Folder = "org" | "roles" | "uploads" | "integrations";

const MODE_OPTIONS: { id: Mode; icon: React.ReactNode; label: string }[] = [
  { id: "url",  icon: <Link2 size={14} aria-hidden />,   label: "URL" },
  { id: "text", icon: <FileText size={14} aria-hidden />, label: "Text" },
  { id: "file", icon: <Upload size={14} aria-hidden />,   label: "Datei" },
];

/**
 * "Hinzufügen" button (⌘K) — URL, Text or File upload.
 *
 * - `vaultId`  : active org vault (used when category = "org")
 * - `folder`   : currently selected tab, pre-selects the destination
 * - `roles`    : list of org roles for the "Rollen" destination option
 * - `roleVaults`: map role_id → vault_id (for role-scoped uploads)
 */
export function VaultAddButton({
  vaultId,
  folder = "org",
  roles = [],
  roleVaults = {},
}: {
  vaultId: string;
  folder?: Folder;
  roles?: TwinRole[];
  roleVaults?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("url");
  const [category, setCategory] = useState<"org" | "role">(
    folder === "roles" ? "role" : "org",
  );
  const [roleId, setRoleId] = useState<string>(roles[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (open) {
      setCategory(folder === "roles" ? "role" : "org");
      if (roles[0]) setRoleId(roles[0].id);
      setTimeout(() => titleRef.current?.focus(), 80);
    } else {
      setContent("");
      setTitle("");
      setFile(null);
      setError(null);
    }
  }, [open, folder, roles]);

  // Active vault to write to
  const targetVaultId =
    category === "role" && roleId ? (roleVaults[roleId] ?? vaultId) : vaultId;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (mode === "file") {
        if (!file) { setError("Bitte eine Datei auswählen."); setSaving(false); return; }
        // Step 1: get presigned URL
        const urlRes = await fetch(
          `/dapi/orgs/me/vaults/${targetVaultId}/items/upload-url`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              mime: file.type || "application/octet-stream",
              byteSize: file.size,
            }),
          },
        );
        if (!urlRes.ok) throw new Error((await urlRes.json().catch(() => ({}))).error ?? `HTTP ${urlRes.status}`);
        const { itemId, uploadUrl } = await urlRes.json() as { itemId: string; uploadUrl: string };

        // Step 2: PUT to S3
        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!put.ok) throw new Error(`S3 ${put.status}`);

        // Step 3: finalize
        const fin = await fetch(
          `/dapi/orgs/me/vaults/${targetVaultId}/items/${itemId}/finalize`,
          { method: "POST" },
        );
        if (!fin.ok) throw new Error((await fin.json().catch(() => ({}))).error ?? `HTTP ${fin.status}`);
      } else {
        const trimmed = content.trim();
        if (!trimmed) { setError("Inhalt darf nicht leer sein."); setSaving(false); return; }
        if (mode === "url") {
          try { new URL(trimmed); } catch {
            setError("Bitte eine gültige URL eingeben (z. B. https://example.com).");
            setSaving(false);
            return;
          }
        }
        const res = await fetch(`/dapi/orgs/me/vaults/${targetVaultId}/items`, {
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
          </DialogHeader>

          {/* ── Category selector ── */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              Zielbereich
            </p>
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCategory("org")}
                className={`inline-flex items-center gap-1.5 rounded-ui px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  category === "org"
                    ? "bg-fg text-canvas"
                    : "border border-line text-fg-muted hover:border-line-strong hover:text-fg"
                }`}
              >
                <Building2 size={12} aria-hidden />
                Allgemein &amp; Unternehmen
              </button>
              {roles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCategory("role")}
                  className={`inline-flex items-center gap-1.5 rounded-ui px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                    category === "role"
                      ? "bg-fg text-canvas"
                      : "border border-line text-fg-muted hover:border-line-strong hover:text-fg"
                  }`}
                >
                  Rollen
                </button>
              )}
            </div>
            {category === "role" && roles.length > 0 && (
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="mt-1.5 w-full rounded-ui border border-line bg-surface px-2.5 py-1.5 text-[13px] text-fg outline-none focus:border-line-strong"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* ── Type selector ── */}
          <div className="flex gap-1 rounded-ui border border-line-subtle bg-surface-2 p-1">
            {MODE_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-ui px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  mode === m.id
                    ? "bg-surface text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* ── Fields ── */}
          <div className="flex flex-col gap-3">
            {mode !== "file" && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                  Titel
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  placeholder={mode === "url" ? "z. B. Unternehmens-Website" : "z. B. Produktstrategie Q3"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
                />
              </div>
            )}

            {mode === "url" && (
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
            )}

            {mode === "text" && (
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

            {mode === "file" && (
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="flex items-center gap-2 rounded-ui border border-line bg-surface px-3 py-2.5">
                    <Upload size={14} className="shrink-0 text-fg-muted" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="shrink-0 text-fg-subtle hover:text-fg"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center gap-2 rounded-ui border-2 border-dashed border-line py-6 text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                  >
                    <Upload size={20} aria-hidden />
                    <span className="text-[13px] font-medium">Datei auswählen</span>
                    <span className="text-[11px] text-fg-subtle">PDF, DOCX, TXT, MD …</span>
                  </button>
                )}
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
              disabled={saving || (mode !== "file" && !content.trim()) || (mode === "file" && !file)}
            >
              {saving ? "Wird gespeichert…" : "Hinzufügen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
