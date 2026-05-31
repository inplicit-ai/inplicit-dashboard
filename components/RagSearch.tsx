"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Composer, type ComposerSuggestion } from "@/components/ui/composer";
import { SectionHeading } from "@/components/ui/section-heading";
import { CardGrid, EntityCard } from "@/components/ui/card-grid";
import { Card } from "@/components/ui/card";

// Stage-1 vector search: embed → Qdrant → cited insight rows. Stage-2
// (LLM-summarized cite-or-decline answer) hangs off the same endpoint later;
// the result-row shape here is what that variant will render too.

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

const SUGGESTIONS: ComposerSuggestion[] = [
  {
    label: "Onboarding-Pain",
    value: "Welche Onboarding-Probleme erwähnen neue Mitarbeitende?",
  },
  {
    label: "Tool-Workarounds",
    value: "Welche Tools werden umgangen, doppelt genutzt oder selbst gebaut?",
  },
  {
    label: "Team-Reibung",
    value: "Wo entsteht Reibung zwischen Abteilungen oder Teams?",
  },
  {
    label: "Top-Schmerzen",
    value: "Was sind die meistgenannten Pain-Points über alle Kampagnes hinweg?",
  },
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

  function onSuggestion(s: ComposerSuggestion) {
    const prompt = s.value ?? s.label;
    setQuery(prompt);
    void runSearch(prompt);
  }

  const hasResults = response && response.results.length > 0;
  const isEmpty = response && response.results.length === 0;

  return (
    <div className="space-y-4">
      {/* Cited evidence — rendered ABOVE the composer. */}
      {(error || response) && (
        <ResultsArea
          error={error}
          response={response}
          isEmpty={Boolean(isEmpty)}
          hasResults={Boolean(hasResults)}
        />
      )}

      {/* Composer — the one elevated input; amber lives only on its focus ring. */}
      <Composer
        value={query}
        onValueChange={setQuery}
        onSubmit={(v) => void runSearch(v)}
        placeholder="Finde Insights aus deinen Kampagnes…"
        isLoading={loading}
        suggestions={SUGGESTIONS}
        onSuggestionSelect={onSuggestion}
      />
    </div>
  );
}

// ─── Cited results ──────────────────────────────────────────────────────────

function ResultsArea({
  error,
  response,
  isEmpty,
  hasResults,
}: {
  error: string | null;
  response: SearchResponse | null;
  isEmpty: boolean;
  hasResults: boolean;
}) {
  if (error) {
    return (
      <Card className="gap-0 border-danger/30 bg-danger-soft p-4 text-sm text-danger">
        {error}
      </Card>
    );
  }

  if (!response) return null;

  if (isEmpty) {
    return (
      <Card className="gap-0 p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted"
          >
            <Search className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-fg">Keine Belege gefunden</p>
            <p className="text-xs text-fg-muted">
              Für „{response.query}&rdquo; konnten wir nichts in deinen
              Kampagnes finden.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!hasResults) return null;

  const count = response.results.length;

  return (
    <section>
      <SectionHeading
        title="Belege"
        count={count}
        action={
          <span className="text-[length:var(--text-meta)] tabular-nums text-fg-subtle">
            {response.searched_campaigns} Kampagnes
          </span>
        }
      />
      <CardGrid>
        {response.results.map((r) => (
          <ResultCard key={r.vse_insight_id} r={r} />
        ))}
      </CardGrid>
    </section>
  );
}

function ResultCard({ r }: { r: SearchResult }) {
  return (
    <EntityCard
      href={`/campaigns/${r.campaign_id}/interviews/${r.interview_id}`}
      title={r.problem_statement}
      meta={
        <span className="inline-flex flex-wrap items-center gap-2">
          {r.department && (
            <span className="badge badge--knowledge">{r.department}</span>
          )}
          <span className="font-mono tabular-nums">{r.anon_id}</span>
        </span>
      }
      footer={
        <span className="tabular-nums text-fg-muted">
          {(r.score * 100).toFixed(0)}% Relevanz
        </span>
      }
    />
  );
}
