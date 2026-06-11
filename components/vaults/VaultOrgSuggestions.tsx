"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, GitBranch, LayoutGrid, Link2, Loader2, Plus, TrendingUp, Upload, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { addVaultItem, uploadFileToVault } from "@/lib/vaults/upload";
import type { VaultItem } from "@/lib/api";

type Suggestion = {
  icon: React.ReactNode;
  label: string;
  hint: string;
  keywords: string[];
};

const SUGGESTIONS: Suggestion[] = [
  {
    icon: <Users size={18} aria-hidden />,
    label: "Organigramm",
    hint: "Struktur & Hierarchie",
    keywords: ["organigramm", "struktur", "hierarchie"],
  },
  {
    icon: <TrendingUp size={18} aria-hidden />,
    label: "Finanzberichte",
    hint: "Umsatz, Budget, Prognosen",
    keywords: ["finanz", "budget", "umsatz", "prognose"],
  },
  {
    icon: <GitBranch size={18} aria-hidden />,
    label: "Prozesse & Flowcharts",
    hint: "Abläufe & Workflows",
    keywords: ["prozess", "workflow", "ablauf", "flowchart"],
  },
  {
    icon: <LayoutGrid size={18} aria-hidden />,
    label: "Produktstrategie",
    hint: "Vision, Roadmap, OKRs",
    keywords: ["strategie", "roadmap", "okr", "vision"],
  },
  {
    icon: <FileText size={18} aria-hidden />,
    label: "Unternehmensrichtlinien",
    hint: "Policies, Handbücher",
    keywords: ["richtlinie", "policy", "handbuch", "compliance"],
  },
];

/**
 * Returns standalone suggestion Card elements meant to be rendered as
 * siblings in the same grid as the vault cards — NOT nested inside one.
 */
export function VaultOrgSuggestions({
  existingItems,
  vaultId,
}: {
  existingItems: VaultItem[];
  vaultId: string;
}) {
  const existingText = existingItems
    .map((it) => (it.title ?? "").toLowerCase())
    .join(" ");

  const visible = SUGGESTIONS.filter(
    (s) => !s.keywords.some((kw) => existingText.includes(kw)),
  ).slice(0, 4);

  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((s) => (
        <SuggestionCard key={s.label} suggestion={s} vaultId={vaultId} />
      ))}
    </>
  );
}

// ── Per-suggestion card ───────────────────────────────────────────────────────

type Mode = "text" | "url" | "file";

function SuggestionCard({
  suggestion,
  vaultId,
}: {
  suggestion: Suggestion;
  vaultId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        interactive
        className="flex cursor-pointer flex-col gap-3 p-5"
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui border border-line bg-surface-2 text-fg-muted">
              {suggestion.icon}
            </span>
            <div>
              <p className="font-semibold text-fg">{suggestion.label}</p>
              <p className="mt-0.5 text-[length:var(--text-caption)] text-fg-muted">
                {suggestion.hint}
              </p>
            </div>
          </div>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-fg-faint">
            <Plus size={13} aria-hidden />
          </span>
        </div>
        <p className="text-[length:var(--text-caption)] text-fg-subtle">
          Klicken um Informationen hinzuzufügen
        </p>
      </Card>

      <AddContextDialog
        open={open}
        onOpenChange={setOpen}
        vaultId={vaultId}
        initialTitle={suggestion.label}
        icon={suggestion.icon}
      />
    </>
  );
}

// ── Add-context dialog (Text / Link / Datei) ──────────────────────────────────

function AddContextDialog({
  open,
  onOpenChange,
  vaultId,
  initialTitle,
  icon,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vaultId: string;
  initialTitle: string;
  icon: React.ReactNode;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("text");
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMode("text");
    setTitle(initialTitle);
    setText("");
    setUrl("");
    setError(null);
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
      await addVaultItem(vaultId, {
        kind: mode === "url" ? "URL" : "TEXT",
        title: title.trim() || undefined,
        content,
      });
      onOpenChange(false);
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
      for (const file of list) {
        await uploadFileToVault(vaultId, file, title.trim() || undefined);
      }
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-fg-muted">{icon}</span>
            {initialTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Mode toggle */}
          <div className="inline-flex w-full rounded-ui border border-line bg-surface-2 p-0.5">
            {modes.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setMode(key); setError(null); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors",
                  mode === key ? "bg-fg text-canvas" : "text-fg-muted hover:text-fg",
                )}
              >
                <Icon size={13} aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {/* Title field — always visible */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel"
            className="h-9 text-sm"
          />

          {mode === "text" && (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Inhalt eingeben…"
                rows={5}
                className="w-full resize-y rounded-ui border border-line bg-surface px-3.5 py-2.5 text-[length:var(--text-body-sm)] text-fg outline-none transition-colors placeholder:text-fg-faint focus-visible:border-line-strong"
              />
              <Button size="sm" onClick={addTextOrUrl} disabled={busy || !text.trim()} className="self-end">
                {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
                Hinzufügen
              </Button>
            </>
          )}

          {mode === "url" && (
            <>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                type="url"
                className="h-9 text-sm"
              />
              <Button size="sm" onClick={addTextOrUrl} disabled={busy || !url.trim()} className="self-end">
                {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
                Hinzufügen
              </Button>
            </>
          )}

          {mode === "file" && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files); }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-ui border border-dashed px-4 py-8 text-center transition-colors",
                dragOver ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong hover:bg-surface-2",
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
                onChange={(e) => { if (e.target.files?.length) void addFiles(e.target.files); }}
              />
            </button>
          )}
        </div>

        {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
