// RAG Stage-1 search island. Renders a prompt-style search bar above the
// audits overview. Hits /dapi/orgs/me/search, displays cited insight cards.
//
// Stage 2 (LLM-summarized cite-or-decline answer) is layered on top of the
// same endpoint family later — this island already has the result-card shape
// it will render then.

import { useState } from "preact/hooks";
import { IconArrowUp, IconSearch, IconSparkle } from "../components/icons.tsx";

interface SearchResult {
  vse_insight_id: string;
  problem_statement: string;
  human_solution: string | null;
  anon_id: string;
  department: string | null;
  campaign_id: string;
  interview_id: string;
  utterance_ids: string[];
  score: number;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  searched_campaigns: number;
}

const SUGGESTIONS = [
  "Wo verschwenden Mitarbeiter die meiste Zeit?",
  "Welche Tools werden umgangen?",
  "Was sagen Vertriebler über das CRM?",
  "Wo gibt es Reibung zwischen Teams?",
];

export default function RagSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/dapi/orgs/me/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, k: 10 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as SearchResponse;
      setResponse(data);
    } catch (e) {
      setError((e as Error).message);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: Event) {
    e.preventDefault();
    runSearch(query);
  }

  function onSuggestion(s: string) {
    setQuery(s);
    runSearch(s);
  }

  const hasSearched = response !== null;

  return (
    <div class="w-full max-w-container mx-auto">
      {/* Search bar */}
      <form
        onSubmit={onSubmit}
        class="relative rounded-3xl border border-line bg-canvas shadow-sm transition-colors focus-within:border-fg-subtle"
      >
        <div class="flex items-center gap-3 px-5 py-4">
          <IconSearch size={18} />
          <input
            type="text"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder={"Frag deine Audit-Daten — z. B. „Wo nutzen Vertriebler das CRM nicht?“"}
            disabled={loading}
            class="flex-1 bg-transparent text-base text-fg placeholder:text-fg-subtle outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            aria-label="Suche starten"
            class="grid place-items-center size-10 rounded-full bg-cta text-cta-fg transition-opacity disabled:opacity-30 hover:opacity-90"
          >
            {loading
              ? <span class="size-3 rounded-ui bg-cta-fg animate-pulse" />
              : <IconArrowUp size={18} />}
          </button>
        </div>
      </form>

      {/* Suggestion chips — hide once a search has been run */}
      {!hasSearched && !loading && (
        <div class="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestion(s)}
              class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-fg-muted transition-colors hover:border-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <IconSparkle size={14} />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div class="mt-6 rounded-card border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Results */}
      {response && (
        <div class="mt-8">
          <p class="text-sm text-fg-muted mb-3">
            {response.results.length === 0
              ? `Keine Belege in den Audits gefunden für „${response.query}".`
              : `${response.results.length} Beleg${response.results.length === 1 ? "" : "e"} aus ${response.searched_campaigns} Audit${response.searched_campaigns === 1 ? "" : "s"}.`}
          </p>

          <div class="flex flex-col gap-3">
            {response.results.map((r) => (
              <a
                key={r.vse_insight_id}
                href={`/admin/campaigns/${r.campaign_id}/interviews/${r.interview_id}`}
                class="group block rounded-card border border-line bg-canvas px-5 py-4 transition-colors hover:border-fg-subtle hover:bg-surface"
              >
                <div class="flex items-start justify-between gap-4">
                  <p class="text-fg leading-relaxed">{r.problem_statement}</p>
                  <span class="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-mono text-fg-muted">
                    {(r.score * 100).toFixed(0)}%
                  </span>
                </div>
                {r.human_solution && (
                  <p class="mt-2 text-sm italic text-fg-muted">
                    „{r.human_solution}"
                  </p>
                )}
                <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span class="rounded-ui bg-accent-soft px-2 py-0.5 font-mono text-accent-strong">
                    {r.anon_id}
                  </span>
                  {r.department && (
                    <span class="rounded-ui bg-surface-2 px-2 py-0.5 text-fg-muted">
                      {r.department}
                    </span>
                  )}
                  <span class="ml-auto text-fg-subtle group-hover:text-fg-muted">
                    Interview öffnen →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
