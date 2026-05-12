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
import { cn } from "@/lib/utils";

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

const SUGGESTIONS: Array<{
  label: string;
  prompt: string;
  icon: LucideIcon;
  tone: "amber" | "green" | "violet" | "blue";
}> = [
  {
    label: "Onboarding-Pain",
    prompt: "Welche Onboarding-Probleme erwähnen neue Mitarbeitende?",
    icon: Sparkles,
    tone: "amber",
  },
  {
    label: "Tool-Workarounds",
    prompt: "Welche Tools werden umgangen, doppelt genutzt oder selbst gebaut?",
    icon: Wrench,
    tone: "green",
  },
  {
    label: "Team-Reibung",
    prompt: "Wo entsteht Reibung zwischen Abteilungen oder Teams?",
    icon: Network,
    tone: "violet",
  },
  {
    label: "Top-Schmerzen",
    prompt:
      "Was sind die meistgenannten Pain-Points über alle Kampagnes hinweg?",
    icon: GitBranch,
    tone: "blue",
  },
];

const TONE_CLASSES: Record<(typeof SUGGESTIONS)[number]["tone"], string> = {
  amber: "text-[#d4891a] dark:text-[#f5a623]",
  green: "text-success",
  violet: "text-[#7c3aed] dark:text-[#b39bff]",
  blue: "text-accent",
};

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
      {/* Results — rendered ABOVE the prompt card */}
      {(error || response) && (
        <ResultsArea
          error={error}
          response={response}
          isEmpty={Boolean(isEmpty)}
          hasResults={Boolean(hasResults)}
        />
      )}

      {/* Prompt card */}
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

      {/* Suggestion pills — concrete RAG examples */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => onSuggestion(s.prompt)}
              title={s.prompt}
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted shadow-sm transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", TONE_CLASSES[s.tone])} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

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
      <div className="rounded-card border border-pain/30 bg-pain-soft px-4 py-3 text-sm text-pain">
        {error}
      </div>
    );
  }

  if (!response) return null;

  // Empty: single small box with the message
  if (isEmpty) {
    return (
      <div className="rounded-card border border-line bg-surface px-5 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted"
          >
            <Search className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-fg">
              Keine Belege gefunden
            </p>
            <p className="text-xs text-fg-muted">
              Für „{response.query}&rdquo; konnten wir nichts in deinen Kampagnes finden.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasResults) return null;

  const count = response.results.length;
  const single = count === 1;

  return (
    <section className="space-y-3">
      <p className="px-1 text-xs text-fg-muted">
        {count} Beleg{count === 1 ? "" : "e"} aus {response.searched_campaigns}{" "}
        Kampagne{response.searched_campaigns === 1 ? "" : "s"} für „{response.query}&rdquo;.
      </p>

      <div
        className={cn(
          "grid gap-3",
          single ? "grid-cols-1 md:max-w-xl" : "sm:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {response.results.map((r) => (
          <ResultCard key={r.vse_insight_id} r={r} />
        ))}
      </div>
    </section>
  );
}

function ResultCard({ r }: { r: SearchResult }) {
  return (
    <Link
      href={`/campaigns/${r.campaign_id}/interviews/${r.interview_id}`}
      className="group flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-sm transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-snug text-fg">{r.problem_statement}</p>
        <span className="shrink-0 rounded-full border border-line bg-canvas px-2 py-0.5 font-mono text-[10px] font-semibold text-fg-muted">
          {(r.score * 100).toFixed(0)}%
        </span>
      </div>

      {r.human_solution && (
        <p className="border-l-2 border-accent-muted pl-3 text-xs italic leading-snug text-fg-muted">
          „{r.human_solution}&rdquo;
        </p>
      )}

      <div className="mt-auto flex items-center gap-2">
        {r.department && (
          <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[10px] font-medium text-fg-muted">
            {r.department}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-fg-subtle transition-colors group-hover:text-fg">
          Interview öffnen
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
