"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { VaultSearchHit } from "@/lib/api";

/**
 * NOTE ON BACKEND:
 * The current search endpoint is per-vault: GET /api/orgs/me/vaults/{id}/search?q=
 * This component searches all provided vaultIds in parallel and merges results.
 * For large numbers of vaults, a single cross-vault endpoint would be more efficient.
 * Proposed backend endpoint: GET /api/orgs/me/vaults/search?q= (searches all org vaults).
 */

interface HitWithVault extends VaultSearchHit {
  vaultName: string;
  vaultId: string;
}

export function VaultSearchDialog({
  vaults,
  trigger,
}: {
  /** All vault ids + names to search across (org + role vaults). */
  vaults: { id: string; name: string }[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<HitWithVault[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHits(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed || vaults.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        vaults.map(async (v) => {
          try {
            const res = await fetch(
              `/dapi/orgs/me/vaults/${v.id}/search?q=${encodeURIComponent(trimmed)}`,
            );
            if (!res.ok) return [];
            const data = (await res.json()) as VaultSearchHit[];
            return data.map((h) => ({ ...h, vaultName: v.name, vaultId: v.id }));
          } catch {
            return [];
          }
        }),
      );
      // Merge + sort by score desc
      const merged = results
        .flat()
        .sort((a, b) => b.score - a.score);
      setHits(merged);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <Dialog open={open} onOpenChange={setOpen}>
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
                Keine Ergebnisse für „{query}".
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-line-subtle overflow-y-auto rounded-ui border border-line">
                {hits.map((h, i) => (
                  <li key={`${h.item_id}-${i}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-fg">{h.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-fg-muted">
                          {h.snippet}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-fg-subtle">
                          {(h.score * 100).toFixed(0)}%
                        </span>
                        <span className="truncate text-[10px] text-fg-faint">{h.vaultName}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {hits === null && !loading && (
            <p className="text-[12px] text-fg-subtle">
              Durchsucht {vaults.length} Kontext-Bereich{vaults.length !== 1 ? "e" : ""}.
              {/* TODO: Für bessere Performance wäre ein Backend-Endpoint
                  GET /api/orgs/me/vaults/search?q= ideal, der alle Vaults der Org
                  in einer Anfrage durchsucht. Derzeit werden {vaults.length} parallele
                  Requests gesendet. */}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
