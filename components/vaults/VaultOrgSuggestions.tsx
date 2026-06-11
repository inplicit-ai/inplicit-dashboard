"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, GitBranch, LayoutGrid, Plus, TrendingUp, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { VaultItem } from "@/lib/api";

type Suggestion = {
  icon: React.ReactNode;
  label: string;
  hint: string;
  keywords: string[];
  placeholder: string;
};

const SUGGESTIONS: Suggestion[] = [
  {
    icon: <Users size={16} aria-hidden />,
    label: "Organigramm",
    hint: "Struktur & Hierarchie",
    keywords: ["organigramm", "struktur", "hierarchie"],
    placeholder: "Beschreibe die Unternehmensstruktur, Hierarchien und Reporting-Linien…",
  },
  {
    icon: <TrendingUp size={16} aria-hidden />,
    label: "Finanzberichte",
    hint: "Umsatz, Budget, Prognosen",
    keywords: ["finanz", "budget", "umsatz", "prognose"],
    placeholder: "Füge Umsatzdaten, Budgetpläne oder Finanzprognosen ein…",
  },
  {
    icon: <GitBranch size={16} aria-hidden />,
    label: "Prozesse & Flowcharts",
    hint: "Abläufe & Workflows",
    keywords: ["prozess", "workflow", "ablauf", "flowchart"],
    placeholder: "Beschreibe wichtige Arbeitsprozesse, Workflows oder Abläufe…",
  },
  {
    icon: <LayoutGrid size={16} aria-hidden />,
    label: "Produktstrategie",
    hint: "Vision, Roadmap, OKRs",
    keywords: ["strategie", "roadmap", "okr", "vision"],
    placeholder: "Teile die Produktvision, Roadmap-Punkte oder OKRs…",
  },
  {
    icon: <FileText size={16} aria-hidden />,
    label: "Unternehmensrichtlinien",
    hint: "Policies, Handbücher",
    keywords: ["richtlinie", "policy", "handbuch", "compliance"],
    placeholder: "Füge relevante Richtlinien, Policies oder Handbücher ein…",
  },
];

/**
 * Suggestion cards in the org vault overview. Each card opens a quick-add text
 * dialog pre-scoped to that content type. Suggestions disappear once a matching
 * item exists in the vault.
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
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-fg-faint">
        Vorschläge
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {visible.map((s) => (
          <SuggestionCard key={s.label} suggestion={s} vaultId={vaultId} />
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  vaultId,
}: {
  suggestion: Suggestion;
  vaultId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(suggestion.label);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setTitle(suggestion.label);
    setContent("");
    setError(null);
    setOpen(true);
  }

  async function save() {
    const trimmed = content.trim();
    if (!trimmed) { setError("Inhalt darf nicht leer sein."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/dapi/orgs/me/vaults/${vaultId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "TEXT",
          content: trimmed,
          title: title.trim() || suggestion.label,
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
        onClick={openDialog}
        className="flex items-start gap-2 rounded-ui border border-line px-2.5 py-2 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
      >
        <span className="mt-0.5 shrink-0 text-fg-faint">{suggestion.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-fg-muted">{suggestion.label}</p>
          <p className="text-[10px] text-fg-faint">{suggestion.hint}</p>
        </div>
        <Plus size={12} className="ml-auto mt-0.5 shrink-0 text-fg-faint" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-fg-muted">{suggestion.icon}</span>
              {suggestion.label}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                Titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                Inhalt *
              </label>
              <textarea
                autoFocus
                placeholder={suggestion.placeholder}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="resize-none rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
              />
            </div>
          </div>

          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving || !content.trim()}>
              {saving ? "Wird gespeichert…" : "Hinzufügen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
