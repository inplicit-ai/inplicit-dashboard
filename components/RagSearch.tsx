"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  GitBranch,
  Network,
  Search,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { StatusDisc } from "@/components/ui/status-disc";

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

const SUGGESTIONS: Array<{
  label: string;
  prompt: string;
  icon: LucideIcon;
}> = [
  {
    label: "Onboarding-Pain",
    prompt: "Welche Onboarding-Probleme erwähnen neue Mitarbeitende?",
    icon: Sparkles,
  },
  {
    label: "Tool-Workarounds",
    prompt: "Welche Tools werden umgangen, doppelt genutzt oder selbst gebaut?",
    icon: Wrench,
  },
  {
    label: "Team-Reibung",
    prompt: "Wo entsteht Reibung zwischen Abteilungen oder Teams?",
    icon: Network,
  },
  {
    label: "Top-Schmerzen",
    prompt:
      "Was sind die meistgenannten Pain-Points über alle Kampagnes hinweg?",
    icon: GitBranch,
  },
];

export function RagSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  function onSuggestion(prompt: string) {
    setQuery(prompt);
    textareaRef.current?.focus();
    void runSearch(prompt);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  const canSend = query.trim().length > 0 && !loading;
  const hasResults = response && response.results.length > 0;
  const isEmpty = response && response.results.length === 0;

  return (
    <div className="space-y-4">
      {/* Cited evidence — rendered ABOVE the composer as a ledger of rows. */}
      {(error || response) && (
        <ResultsArea
          error={error}
          response={response}
          isEmpty={Boolean(isEmpty)}
          hasResults={Boolean(hasResults)}
        />
      )}

      {/* Composer — the one elevated input; amber lives only on its focus ring
          and the live streaming indicator. */}
      <div className="rag__card">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Finde Insights aus deinen Kampagnes…"
          rows={2}
          className="rag__input"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSend}
          aria-label="Suche starten"
          className="rag__send"
        >
          {loading ? (
            <span className="rag__send-loading" aria-hidden="true" />
          ) : (
            <ArrowUp width={14} height={14} />
          )}
        </button>
      </div>

      {/* Reply-suggestion chips — square data-chips, not pills. */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => onSuggestion(s.prompt)}
              title={s.prompt}
              className="badge badge--knowledge inline-flex items-center gap-1.5 transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
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
      <div className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!response) return null;

  if (isEmpty) {
    return (
      <div className="rounded-card border border-line bg-surface px-5 py-4">
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
      </div>
    );
  }

  if (!hasResults) return null;

  const count = response.results.length;

  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between gap-4 border-b border-line-subtle pb-2">
        <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
          § BELEGE
        </span>
        <span className="font-mono text-xs tabular-nums text-fg-muted">
          n={count} · {response.searched_campaigns} kmp
        </span>
      </header>

      <div className="evidence-tree">
        {response.results.map((r) => (
          <ResultRow key={r.vse_insight_id} r={r} />
        ))}
      </div>
    </section>
  );
}

function ResultRow({ r }: { r: SearchResult }) {
  return (
    <div className="tree-node">
      <Link
        href={`/campaigns/${r.campaign_id}/interviews/${r.interview_id}`}
        className="tree-row tree-row--button tree-row--parent group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="tree-row__lead">
          <StatusDisc state="done" />
          <span className="tree-row__label">{r.problem_statement}</span>
        </div>
        <div className="tree-row__meta">
          {r.department && (
            <span className="badge badge--knowledge">{r.department}</span>
          )}
          <span className="badge badge--knowledge font-mono tabular-nums">
            {r.anon_id}
          </span>
          <span className="font-mono tabular-nums text-fg-muted">
            {(r.score * 100).toFixed(0)}%
          </span>
          <ArrowRight className="h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
        </div>
      </Link>
    </div>
  );
}
