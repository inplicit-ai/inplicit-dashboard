"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Composer } from "@/components/ui/composer";
import { Card } from "@/components/ui/card";
import { DataChip } from "@/components/ui/data-chip";
import { searchVault } from "@/lib/vaults/upload";
import type { VaultSearchHit } from "@/lib/api";

/* ────────────────────────────────────────────────────────────────────────────
 * VaultSearchBox — the search-first header control.
 *
 * Embeds the query via the vault search endpoint and renders cited snippet
 * rows above the composer (RagSearch register). No generation — pure retrieval.
 * ────────────────────────────────────────────────────────────────────────── */

export function VaultSearchBox({ vaultId }: { vaultId: string | null }) {
  const t = useTranslations("vaultHub");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<VaultSearchHit[] | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  async function run(raw: string) {
    const q = raw.trim();
    if (!q || !vaultId) return;
    setLoading(true);
    setError(null);
    setLastQuery(q);
    try {
      setHits(await searchVault(vaultId, q));
    } catch (e) {
      setError((e as Error).message);
      setHits(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {(error || hits) && (
        <SearchResults
          error={error}
          hits={hits}
          query={lastQuery}
          emptyLabel={t("searchEmpty", { query: lastQuery })}
          resultsLabel={(n) => t("searchResults", { count: n })}
        />
      )}
      <Composer
        value={query}
        onValueChange={setQuery}
        onSubmit={(v) => void run(v)}
        placeholder={t("searchPlaceholder")}
        isLoading={loading}
        disabled={!vaultId}
      />
      {!hits && !error && (
        <p className="px-1 text-[length:var(--text-caption)] text-fg-subtle">
          {t("searchHint")}
        </p>
      )}
    </div>
  );
}

function SearchResults({
  error,
  hits,
  query,
  emptyLabel,
  resultsLabel,
}: {
  error: string | null;
  hits: VaultSearchHit[] | null;
  query: string;
  emptyLabel: string;
  resultsLabel: (n: number) => string;
}) {
  if (error) {
    return (
      <Card className="gap-0 border-danger/30 bg-danger-soft p-4 text-[length:var(--text-body-sm)] text-danger">
        {error}
      </Card>
    );
  }
  if (!hits) return null;
  if (hits.length === 0) {
    return (
      <Card className="gap-0 p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted"
          >
            <Search className="h-4 w-4" />
          </span>
          <p className="text-[length:var(--text-body-sm)] text-fg-muted">
            {emptyLabel}
          </p>
        </div>
      </Card>
    );
  }
  return (
    <Card variant="ledger" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line-subtle px-5 py-3">
        <span className="inline-flex items-center gap-2 text-[length:var(--text-body-sm)] font-medium text-fg">
          <Search className="h-4 w-4 text-fg-subtle" aria-hidden />
          {resultsLabel(hits.length)}
        </span>
        <span className="truncate text-[length:var(--text-caption)] text-fg-subtle">
          {query}
        </span>
      </div>
      <ul className="divide-y divide-line-subtle">
        {hits.map((h) => (
          <li key={h.item_id} className="px-5 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[length:var(--text-body-sm)] font-medium text-fg">
                {h.title}
              </span>
              <DataChip tone="neutral" mono>
                {(h.score * 100).toFixed(0)}%
              </DataChip>
            </div>
            <p className="mt-1 line-clamp-2 text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted">
              {h.snippet}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
