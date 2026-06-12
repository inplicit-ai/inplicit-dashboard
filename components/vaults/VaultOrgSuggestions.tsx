"use client";

import { createElement, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  FileText,
  GitBranch,
  LayoutGrid,
  Link2,
  Loader2,
  Plus,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
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
import { clientApi } from "@/lib/client-api";
import { VaultItemRow } from "@/components/vaults/VaultItemRow";
import { VaultCardMenu } from "@/components/vaults/VaultCardMenu";
import type { VaultItem, VaultSection } from "@/lib/api";

/* ────────────────────────────────────────────────────────────────────────────
 * VaultSectionGrid — the unified section-card grid for the org's single vault.
 *
 * Every section (the 6 seeded CONTEXT sections + any custom) renders an
 * identical card showing its item_count (including 0), a few top items, and an
 * add-item affordance. The card menu (rename / delete) only appears for CONTEXT
 * sections; ROLE / CAMPAIGN sections are system-managed and read-only.
 * ────────────────────────────────────────────────────────────────────────── */

/** Fixed icon by seeded CONTEXT-section name. Falls back to a folder glyph. */
const SECTION_ICON: Record<string, LucideIcon> = {
  Allgemein: LayoutGrid,
  Organigramm: Users,
  Finanzen: TrendingUp,
  Prozesse: GitBranch,
  Produktstrategie: Building2,
  Unternehmensrichtlinien: ShieldCheck,
};

function iconFor(name: string): LucideIcon {
  return SECTION_ICON[name.trim()] ?? FileText;
}

/** Stable icon component keyed by section name. Uses `createElement` so the icon
 *  isn't bound to a capitalized local in render (react-hooks/static-components). */
function SectionIcon({ name, size }: { name: string; size: number }) {
  return createElement(iconFor(name), { size, "aria-hidden": true });
}

export function VaultSectionGrid({
  sections,
  itemsBySection,
  canWrite,
}: {
  sections: VaultSection[];
  /** Top items per section id (server-fetched; may be partial). */
  itemsBySection: Record<string, VaultItem[]>;
  canWrite: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((section) => (
        <SectionCardView
          key={section.id}
          section={section}
          items={itemsBySection[section.id] ?? []}
          canWrite={canWrite}
        />
      ))}
    </div>
  );
}

function SectionCardView({
  section,
  items,
  canWrite,
}: {
  section: VaultSection;
  items: VaultItem[];
  canWrite: boolean;
}) {
  const isContext = section.kind === "CONTEXT";
  const count = section.item_count ?? items.length;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui border border-line bg-surface-2 text-fg-muted">
            <SectionIcon name={section.name} size={15} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-fg">{section.name}</p>
            <p className="mt-0.5 text-[length:var(--text-caption)] text-fg-muted">
              {count === 0
                ? "Noch keine Einträge"
                : `${count} Eintrag${count !== 1 ? "e" : ""}`}
              {!isContext && (
                <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-fg-subtle">
                  {section.kind === "ROLE" ? "Rolle" : "Kampagne"}
                </span>
              )}
            </p>
          </div>
        </div>
        {/* Rename / delete — CONTEXT sections only. ROLE/CAMPAIGN are managed. */}
        {canWrite && isContext && (
          <VaultCardMenu sectionId={section.id} sectionName={section.name} />
        )}
      </div>

      {/* Top items (cap at 5) */}
      {items.length > 0 && (
        <ul className="divide-y divide-line-subtle rounded-ui border border-line">
          {items.slice(0, 5).map((it) => (
            <VaultItemRow key={it.id} item={it} sectionId={section.id} />
          ))}
          {count > 5 && (
            <li className="px-3 py-2 text-[length:var(--text-caption)] text-fg-muted">
              + {count - 5} weitere
            </li>
          )}
        </ul>
      )}

      {/* Add affordance — ALWAYS visible (no activeId gating). */}
      {canWrite && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-fg-muted"
          onClick={() => setAddOpen(true)}
        >
          <Plus size={14} aria-hidden />
          Kontext hinzufügen
        </Button>
      )}

      {addOpen && (
        <AddItemDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          sectionId={section.id}
          sectionName={section.name}
        />
      )}
    </Card>
  );
}

// ── Add-context dialog (Text / Link / Datei) ──────────────────────────────────

type Mode = "text" | "url" | "file";

function AddItemDialog({
  open,
  onOpenChange,
  sectionId,
  sectionName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sectionId: string;
  sectionName: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMode("text");
    setTitle("");
    setText("");
    setUrl("");
    setError(null);
    setDone(false);
  }

  /** Flash a brief success, refresh, then close. */
  function succeed() {
    setDone(true);
    router.refresh();
    setTimeout(() => {
      onOpenChange(false);
      reset();
    }, 700);
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
      await clientApi.vault.items.add(sectionId, {
        kind: mode === "url" ? "URL" : "TEXT",
        title: title.trim() || undefined,
        content,
      });
      succeed();
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
        await clientApi.vault.items.uploadDirect(
          sectionId,
          file,
          title.trim() || undefined,
        );
      }
      succeed();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const modes: { key: Mode; label: string; icon: LucideIcon }[] = [
    { key: "text", label: "Text", icon: FileText },
    { key: "url", label: "Link", icon: Link2 },
    { key: "file", label: "Datei", icon: Upload },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-fg-muted"><SectionIcon name={sectionName} size={16} /></span>
            {sectionName}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex items-center gap-2 py-6 text-success">
            <Check size={16} aria-hidden />
            <span className="text-[length:var(--text-body-sm)] font-medium">
              Hinzugefügt
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Mode toggle */}
            <div className="inline-flex w-full rounded-ui border border-line bg-surface-2 p-0.5">
              {modes.map(({ key, label, icon: ModeIcon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setMode(key); setError(null); }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors",
                    mode === key ? "bg-fg text-canvas" : "text-fg-muted hover:text-fg",
                  )}
                >
                  <ModeIcon size={13} aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            {/* Title — always visible */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel (optional)"
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
        )}

        {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
