"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link2, Plus, Upload, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Mode = "url" | "text" | "file";
type RoleMode = "csv" | "doc" | "text";

const MODE_OPTIONS: { id: Mode; icon: React.ReactNode; label: string }[] = [
  { id: "url",  icon: <Link2 size={14} aria-hidden />,   label: "URL" },
  { id: "text", icon: <FileText size={14} aria-hidden />, label: "Text" },
  { id: "file", icon: <Upload size={14} aria-hidden />,   label: "Datei" },
];

const ROLE_MODE_OPTIONS: { id: RoleMode; icon: React.ReactNode; label: string; hint: string }[] = [
  {
    id: "csv",
    icon: <Users size={15} aria-hidden />,
    label: "Personen (CSV)",
    hint: "Mitarbeiterliste importieren",
  },
  {
    id: "doc",
    icon: <Upload size={15} aria-hidden />,
    label: "Dokument",
    hint: "Arbeitsvertrag, Rollenprofil, Taxonomie",
  },
  {
    id: "text",
    icon: <FileText size={15} aria-hidden />,
    label: "Text",
    hint: "Rollenbeschreibung, Anforderungen",
  },
];

// Supported file types and their labels
const ACCEPTED = ".pdf,.txt,.md,.csv,.rtf,.json";
const CSV_ACCEPTED = ".csv,.xlsx,.xls,.tsv";


/**
 * "Hinzufügen" button (⌘K) — context-aware:
 * - folder "org"   → URL / Text / File upload (PDF extraction client-side)
 * - folder "roles" → "Rollen hinzufügen": CSV / Dokument / Text, mit Rollenauswahl
 */
export function VaultAddButton({
  vaultId,
}: {
  vaultId: string;
  folder?: "org" | "roles" | "integrations";
  roles?: TwinRole[];
  roleVaults?: Record<string, string>;
}) {
  const isRolesMode = folder === "roles";

  const [open, setOpen] = useState(false);
  // Org mode
  const [mode, setMode] = useState<Mode>("url");
  // Roles mode
  const [roleMode, setRoleMode] = useState<RoleMode>("doc");
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id ?? "");

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
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
      if (roles[0]) setSelectedRoleId(roles[0].id);
      setTimeout(() => titleRef.current?.focus(), 80);
    } else {
      setContent("");
      setTitle("");
      setFile(null);
      setError(null);
      setExtracting(false);
    }
  }, [open, roles]);

  // The vault to write to: use the role's own vault if available, else fall back to org vault
  const targetVaultId =
    isRolesMode && selectedRoleId
      ? (roleVaults[selectedRoleId] ?? vaultId)
      : vaultId;

  const effectiveMode: Mode =
    isRolesMode
      ? roleMode === "text" ? "text" : "file"
      : mode;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (effectiveMode === "file") {
        if (!file) { setError("Bitte eine Datei auswählen."); setSaving(false); return; }

        // Upload directly to backend — server extracts text + converts to Markdown via Mistral.
        // The original file is stored in Postgres so users can download it later.
        setExtracting(true);
        try {
          const form = new FormData();
          form.append("file", file, file.name);
          if (title.trim()) form.append("title", title.trim());

          const res = await fetch(`/dapi/orgs/me/vaults/${targetVaultId}/items/upload-direct`, {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
        } finally {
          setExtracting(false);
        }
      } else {
        const trimmed = content.trim();
        if (!trimmed) { setError("Inhalt darf nicht leer sein."); setSaving(false); return; }
        if (effectiveMode === "url") {
          try { new URL(trimmed); } catch {
            setError("Bitte eine gültige URL eingeben (z. B. https://example.com).");
            setSaving(false);
            return;
          }
        }
        const res = await fetch(`/dapi/orgs/me/vaults/${vaultId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "TEXT",
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

  const busyLabel = extracting ? "Wird hochgeladen & konvertiert…" : saving ? "Wird gespeichert…" : "Hinzufügen";
  const busy = extracting || saving;
  const canSubmit = effectiveMode === "file" ? !!file : !!content.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shell-locale"
        title={isRolesMode ? "Rollen-Kontext hinzufügen" : "Kontext hinzufügen (⌘K)"}
      >
        <Plus size={14} className="shell-locale__icon" aria-hidden />
        <span className="text-[length:var(--text-caption)] font-medium">
          Hinzufügen
        </span>
        {!isRolesMode && (
          <kbd className="ml-1 hidden rounded bg-surface-2 px-1 py-0.5 text-[10px] font-mono text-fg-faint sm:inline">
            ⌘K
          </kbd>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRolesMode ? "Rollen-Kontext hinzufügen" : "Kontext hinzufügen"}
            </DialogTitle>
          </DialogHeader>

          {/* ── Roles mode ── */}
          {isRolesMode && (
            <>
              {/* Role selector */}
              {roles.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                    Für Rolle
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="rounded-ui border border-line bg-surface px-2.5 py-2 text-[13px] text-fg outline-none focus:border-line-strong"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Role content type tiles */}
              <div className="grid grid-cols-3 gap-2">
                {ROLE_MODE_OPTIONS.map((rm) => (
                  <button
                    key={rm.id}
                    type="button"
                    onClick={() => { setRoleMode(rm.id); setFile(null); setContent(""); setError(null); }}
                    className={`flex flex-col items-center gap-1.5 rounded-ui border p-3 text-center transition-colors ${
                      roleMode === rm.id
                        ? "border-line-strong bg-surface shadow-sm"
                        : "border-line text-fg-muted hover:border-line-strong hover:text-fg"
                    }`}
                  >
                    <span className={roleMode === rm.id ? "text-fg" : "text-fg-subtle"}>
                      {rm.icon}
                    </span>
                    <span className="text-[12px] font-medium leading-tight">
                      {rm.label}
                    </span>
                    <span className="text-[10px] leading-tight text-fg-faint">
                      {rm.hint}
                    </span>
                  </button>
                ))}
              </div>

              {/* Role mode fields */}
              <RoleModeFields
                roleMode={roleMode}
                file={file}
                title={title}
                content={content}
                onFile={(f) => { setFile(f); setError(null); }}
                onTitleChange={setTitle}
                onContentChange={setContent}
                titleRef={titleRef}
                fileRef={fileRef}
              />
            </>
          )}

          {/* ── Org mode ── */}
          {!isRolesMode && (
            <>
              {/* Type selector */}
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

              {/* Fields */}
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
                      onKeyDown={(e) => e.key === "Enter" && void save()}
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
                  <FileDropzone
                    file={file}
                    title={title}
                    accept={ACCEPTED}
                    hint="PDF, TXT, MD, CSV, JSON"
                    onFile={(f) => { setFile(f); setError(null); }}
                    onTitleChange={setTitle}
                    onClear={() => { setFile(null); setError(null); }}
                    titleRef={titleRef}
                    fileRef={fileRef}
                  />
                )}
              </div>
            </>
          )}

          {error && (
            <p className="text-[12px] text-danger" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={() => void save()}
              disabled={busy || !canSubmit}
            >
              {busyLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RoleModeFields({
  roleMode,
  file,
  title,
  content,
  onFile,
  onTitleChange,
  onContentChange,
  titleRef,
  fileRef,
}: {
  roleMode: RoleMode;
  file: File | null;
  title: string;
  content: string;
  onFile: (f: File | null) => void;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (roleMode === "csv") {
    return (
      <FileDropzone
        file={file}
        title={title}
        accept={CSV_ACCEPTED}
        hint="CSV, Excel — Spalten: Name, E-Mail, Abteilung"
        onFile={onFile}
        onTitleChange={onTitleChange}
        onClear={() => onFile(null)}
        titleRef={titleRef}
        fileRef={fileRef}
      />
    );
  }
  if (roleMode === "doc") {
    return (
      <FileDropzone
        file={file}
        title={title}
        accept={ACCEPTED}
        hint="PDF, DOCX, TXT — Arbeitsverträge, Rollenprofile, Taxonomie"
        onFile={onFile}
        onTitleChange={onTitleChange}
        onClear={() => onFile(null)}
        titleRef={titleRef}
        fileRef={fileRef}
      />
    );
  }
  // text
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
          Titel
        </label>
        <input
          ref={titleRef}
          type="text"
          placeholder="z. B. Rollenprofil Produktmanager"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
          Inhalt *
        </label>
        <textarea
          placeholder="Rollenbeschreibung, Anforderungen, Verantwortlichkeiten…"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={4}
          className="resize-none rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
        />
      </div>
    </div>
  );
}

function FileDropzone({
  file,
  title,
  accept,
  hint,
  onFile,
  onTitleChange,
  onClear,
  titleRef,
  fileRef,
}: {
  file: File | null;
  title: string;
  accept: string;
  hint: string;
  onFile: (f: File) => void;
  onTitleChange: (v: string) => void;
  onClear: () => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      {file ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              Titel (optional)
            </label>
            <input
              ref={titleRef}
              type="text"
              placeholder={file.name}
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
            />
          </div>
          <div className="flex items-center gap-2 rounded-ui border border-line bg-surface px-3 py-2.5">
            <Upload size={14} className="shrink-0 text-fg-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{file.name}</span>
            <button type="button" onClick={onClear} className="shrink-0 text-fg-subtle hover:text-fg">
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-ui border-2 border-dashed border-line py-6 text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <Upload size={20} aria-hidden />
          <span className="text-[13px] font-medium">Datei auswählen</span>
          <span className="text-[11px] text-fg-subtle">{hint}</span>
        </button>
      )}
    </div>
  );
}
