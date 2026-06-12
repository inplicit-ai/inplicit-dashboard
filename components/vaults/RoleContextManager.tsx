"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { clientApi } from "@/lib/client-api";

type Mode = "text" | "url" | "file";

/**
 * Add context to a single role. Context lives in the role's ROLE section of the
 * org's single vault. The section is resolved (find-or-create) on the first add
 * via `sections.resolveRole(roleId)` so empty roles don't accumulate empty
 * sections. After every change we `router.refresh()` so the server-rendered
 * item list (and the index-status pill) update.
 *
 * `sectionId` is the role's existing ROLE section, or `null` when it has none yet.
 */
export function RoleContextManager({
  roleId,
  sectionId: initialSectionId,
}: {
  roleId: string;
  sectionId: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  // Survives across adds before the server refresh lands, so a second add in the
  // same session reuses the just-resolved section instead of resolving again.
  const sectionIdRef = useRef<string | null>(initialSectionId);

  const [mode, setMode] = useState<Mode>("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Resolve the role's ROLE section, creating it on first use. Idempotent. */
  async function ensureSection(): Promise<string> {
    if (sectionIdRef.current) return sectionIdRef.current;
    const section = await clientApi.vault.sections.resolveRole(roleId);
    sectionIdRef.current = section.id;
    return section.id;
  }

  async function addTextOrUrl() {
    const content = (mode === "url" ? url : text).trim();
    if (!content) return;
    if (mode === "url" && !/^https?:\/\//.test(content)) {
      setError("Bitte eine gültige URL angeben (http/https).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const sid = await ensureSection();
      await clientApi.vault.items.add(sid, {
        kind: mode === "url" ? "URL" : "TEXT",
        title: title.trim() || undefined,
        content,
      });
      setTitle("");
      setText("");
      setUrl("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const sid = await ensureSection();
      for (const file of list) {
        await clientApi.vault.items.uploadDirect(sid, file);
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const modes: { key: Mode; label: string; icon: typeof FileText }[] = [
    { key: "text", label: "Text", icon: FileText },
    { key: "url", label: "Link", icon: Link2 },
    { key: "file", label: "Datei", icon: Upload },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      {/* Mode toggle */}
      <div className="inline-flex w-full rounded-ui border border-line bg-surface-2 p-0.5">
        {modes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode(key);
              setError(null);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors",
              mode === key
                ? "bg-fg text-canvas"
                : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon size={13} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {mode === "text" && (
        <div className="flex flex-col gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel (optional)"
            className="h-9 text-sm"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kontext für diese Rolle — z. B. typische Aufgaben, Systeme, Fachbegriffe, Eigenheiten…"
            rows={5}
            className="w-full resize-y rounded-ui border border-line bg-surface px-3.5 py-2.5 text-[length:var(--text-body-sm)] text-fg outline-none transition-colors placeholder:text-fg-faint focus-visible:border-line-strong"
          />
          <Button
            type="button"
            size="sm"
            onClick={addTextOrUrl}
            disabled={busy || !text.trim()}
            className="self-end"
          >
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
            Hinzufügen
          </Button>
        </div>
      )}

      {mode === "url" && (
        <div className="flex flex-col gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel (optional)"
            className="h-9 text-sm"
          />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            type="url"
            className="h-9 text-sm"
          />
          <Button
            type="button"
            size="sm"
            onClick={addTextOrUrl}
            disabled={busy || !url.trim()}
            className="self-end"
          >
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
            Hinzufügen
          </Button>
        </div>
      )}

      {mode === "file" && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-ui border border-dashed px-4 py-8 text-center transition-colors",
            dragOver
              ? "border-accent bg-accent-soft"
              : "border-line hover:border-line-strong hover:bg-surface-2",
          )}
        >
          {busy ? (
            <Loader2 size={20} className="animate-spin text-fg-muted" aria-hidden />
          ) : (
            <Upload size={20} className="text-fg-muted" aria-hidden />
          )}
          <span className="text-[length:var(--text-body-sm)] font-medium text-fg">
            Datei hierher ziehen oder klicken
          </span>
          <span className="text-[length:var(--text-caption)] text-fg-subtle">
            PDF, DOCX, TXT … — Text wird extrahiert und indexiert
          </span>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files);
            }}
          />
        </button>
      )}

      {error && (
        <p className="text-[length:var(--text-caption)] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
