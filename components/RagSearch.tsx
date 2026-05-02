"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUp, Sparkles } from "lucide-react";
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { Button } from "@/components/ui/button";

// Stage-1 vector search: embed → Qdrant → cited insight rows. Stage-2
// (LLM-summarized cite-or-decline answer) hangs off the same endpoint later;
// the result-card shape here is what that variant will render too.

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

export function RagSearch() {
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
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as SearchResponse;
      setResponse(data);
    } catch (e) {
      setError((e as Error).message);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit() {
    void runSearch(query);
  }

  function onSuggestion(s: string) {
    setQuery(s);
    void runSearch(s);
  }

  const hasSearched = response !== null;

  return (
    <div className="w-full">
      <PromptInput
        isLoading={loading}
        value={query}
        onValueChange={setQuery}
        onSubmit={onSubmit}
        className="rounded-card pt-1"
      >
        <div className="flex flex-col">
          <PromptInputTextarea
            placeholder="Frag deine Audit-Daten — z. B. „Wo nutzen Vertriebler das CRM nicht?“"
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3]"
          />
          <PromptInputActions className="mt-3 flex w-full items-center justify-between gap-2 px-3 pb-3">
            <div className="flex items-center gap-2 text-xs text-fg-subtle">
              <Sparkles className="h-3.5 w-3.5" />
              <span>RAG · {response?.searched_campaigns ?? "—"} Audits indiziert</span>
            </div>
            <Button
              size="icon"
              disabled={!query.trim() || loading}
              onClick={onSubmit}
              className="size-9 rounded-full"
              aria-label="Suche starten"
            >
              {loading ? (
                <span className="size-3 rounded-sm bg-primary-foreground animate-pulse" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </PromptInputActions>
        </div>
      </PromptInput>

      {!hasSearched && !loading && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <PromptSuggestion key={s} onClick={() => onSuggestion(s)}>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              {s}
            </PromptSuggestion>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-ui border border-pain/40 bg-pain-soft px-4 py-3 text-sm text-pain">
          {error}
        </div>
      )}

      {response && (
        <div className="mt-8">
          <p className="mb-3 text-sm text-fg-muted">
            {response.results.length === 0
              ? `Keine Belege in den Audits gefunden für „${response.query}".`
              : `${response.results.length} Beleg${response.results.length === 1 ? "" : "e"} aus ${response.searched_campaigns} Audit${response.searched_campaigns === 1 ? "" : "s"}.`}
          </p>

          <div className="flex flex-col gap-3">
            {response.results.map((r) => (
              <Link
                key={r.vse_insight_id}
                href={`/campaigns/${r.campaign_id}/interviews/${r.interview_id}`}
                className="group block rounded-card border border-line bg-canvas px-5 py-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-fg-subtle hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-fg leading-relaxed">{r.problem_statement}</p>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-mono text-fg-muted">
                    {(r.score * 100).toFixed(0)}%
                  </span>
                </div>
                {r.human_solution && (
                  <p className="mt-2 text-sm italic text-fg-muted">
                    „{r.human_solution}"
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-accent-strong">
                    {r.anon_id}
                  </span>
                  {r.department && (
                    <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-fg-muted">
                      {r.department}
                    </span>
                  )}
                  <span className="ml-auto text-fg-subtle group-hover:text-fg-muted">
                    Interview öffnen →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
