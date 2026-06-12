"use client";

import { useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { clientApi } from "@/lib/client-api";
import type { VaultSearchHit } from "@/lib/api";

/**
 * Org-wide semantic search over the single Kontext vault. One request to
 * `GET /api/orgs/me/vault/search?q=` (no `section` ⇒ the whole vault); the
 * backend resolves the org vault itself, so there is no per-vault fanout.
 */
export function VaultSearchDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<VaultSearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Reset transient state in the open handler — not in an effect — so the next
   *  open starts clean without a setState-in-effect cascade. */
  function handleOpenChange(next: boolean) {
    if (next) {
      setQuery("");
      setHits(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
    setOpen(next);
  }

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await clientApi.vault.search(trimmed);
      setHits([...data].sort((a, b) => b.score - a.score));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span onClick={() => handleOpenChange(true)}>{trigger}</span>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kontext durchsuchen</DialogTitle>
          </DialogHeader>

          {/* Search input */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              placeholder="Frage oder Begriff eingeben…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void runSearch(query)}
              className="w-full rounded-ui border border-line bg-surface py-2.5 pl-9 pr-10 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
            />
            {loading ? (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-fg-subtle" />
            ) : query ? (
              <button
                type="button"
                onClick={() => { setQuery(""); setHits(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg"
              >
                <X size={14} aria-hidden />
              </button>
            ) : null}
          </div>

          <Button
            size="sm"
            onClick={() => void runSearch(query)}
            disabled={!query.trim() || loading}
            className="self-start"
          >
            {loading ? "Suche läuft…" : "Suchen"}
          </Button>

          {/* Results */}
          {error && (
            <p className="text-[12px] text-danger" role="alert">{error}</p>
          )}

          {hits !== null && (
            hits.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-fg-muted">
                Keine Ergebnisse für „{query}&ldquo;.
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-line-subtle overflow-y-auto rounded-ui border border-line">
                {hits.map((h, i) => (
                  <li key={`${h.item_id}-${i}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-fg">
                          {h.title ?? "Ohne Titel"}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-fg-muted">
                          {h.snippet}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-fg-subtle">
                        {(h.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {hits === null && !loading && (
            <p className="text-[12px] text-fg-subtle">
              Durchsucht den gesamten Kontext deiner Organisation.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
