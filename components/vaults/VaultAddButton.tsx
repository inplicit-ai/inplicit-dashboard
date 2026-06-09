"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link2, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Mode = "url" | "text" | "file";

const MODE_OPTIONS: { id: Mode; icon: React.ReactNode; label: string }[] = [
  { id: "url",  icon: <Link2 size={14} aria-hidden />,   label: "URL" },
  { id: "text", icon: <FileText size={14} aria-hidden />, label: "Text" },
  { id: "file", icon: <Upload size={14} aria-hidden />,   label: "Datei" },
];

// Supported file types and their labels
const ACCEPTED = ".pdf,.txt,.md,.csv,.rtf,.json";

/**
 * Extract text from a file in the browser — no S3 or backend needed.
 * Supports PDF (via pdfjs-dist), plain text, markdown, CSV, JSON.
 */
async function extractText(file: File): Promise<string> {
  const { type, name } = file;

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    // Dynamically import pdfjs-dist so it's only bundled when used
    const pdfjsLib = await import("pdfjs-dist");
    // Worker file is copied to /public during build — no bundler magic needed
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(pageText);
    }
    return pages.join("\n\n");
  }

  // ── Plain text, Markdown, CSV, JSON, RTF ─────────────────────────────────
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsText(file, "utf-8");
  });
}

/**
 * "Hinzufügen" button (⌘K) — URL, Text or File upload.
 * File mode extracts text client-side (PDF via pdfjs-dist, others via FileReader)
 * and posts directly as a TEXT vault item — no S3 needed.
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
      setTimeout(() => titleRef.current?.focus(), 80);
    } else {
      setContent("");
      setTitle("");
      setFile(null);
      setError(null);
      setExtracting(false);
    }
  }, [open]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (mode === "file") {
        if (!file) { setError("Bitte eine Datei auswählen."); setSaving(false); return; }

        // Extract text client-side — no S3 needed
        setExtracting(true);
        let extracted: string;
        try {
          extracted = await extractText(file);
        } catch (e) {
          setError((e as Error).message ?? "Text konnte nicht aus der Datei gelesen werden.");
          return;
        } finally {
          setExtracting(false);
        }

        const trimmed = extracted.trim();
        if (!trimmed) {
          setError("Die Datei enthält keinen lesbaren Text. Bitte füge den Inhalt manuell als Text ein.");
          return;
        }

        const res = await fetch(`/dapi/orgs/me/vaults/${vaultId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "TEXT",
            content: trimmed,
            title: title.trim() || file.name,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
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
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const busyLabel = extracting ? "Text wird extrahiert…" : saving ? "Wird gespeichert…" : "Hinzufügen";
  const busy = extracting || saving;

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
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }}
                />
                {file ? (
                  <div className="flex flex-col gap-2">
                    {/* Optional title field for file mode */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                        Titel (optional)
                      </label>
                      <input
                        ref={titleRef}
                        type="text"
                        placeholder={file.name}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
                      />
                    </div>
                    <div className="flex items-center gap-2 rounded-ui border border-line bg-surface px-3 py-2.5">
                      <Upload size={14} className="shrink-0 text-fg-muted" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => { setFile(null); setError(null); }}
                        className="shrink-0 text-fg-subtle hover:text-fg"
                      >
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
                    <span className="text-[11px] text-fg-subtle">PDF, TXT, MD, CSV, JSON</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="text-[12px] text-danger" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={busy || (mode !== "file" && !content.trim()) || (mode === "file" && !file)}
            >
              {busyLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
