"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, CheckCircle2, Send, Sparkles } from "lucide-react";

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
  icon: typeof Sparkles;
  tone: "amber" | "green" | "violet";
}> = [
  {
    label: "Zusammenfassen",
    prompt: "Fasse die zentralen Pain-Points der letzten Audits zusammen.",
    icon: Sparkles,
    tone: "amber",
  },
  {
    label: "Reibungspunkte",
    prompt: "Wo gibt es Reibung zwischen Teams?",
    icon: CheckCircle2,
    tone: "green",
  },
  {
    label: "Kernaussagen",
    prompt: "Welche Tools werden umgangen oder doppelt genutzt?",
    icon: Send,
    tone: "violet",
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

  return (
    <div className="rag">
      {/* Prompt card */}
      <div className="rag__card">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Finde Insights aus deinen Audits..."
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

      {/* Suggestion pills */}
      <div className="rag__suggestions">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => onSuggestion(s.prompt)}
              className={`rag__pill rag__pill--${s.tone}`}
            >
              <Icon className="rag__pill-icon" width={13} height={13} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {error && <div className="rag__error">{error}</div>}

      {response && (
        <div className="rag__results">
          <p className="rag__results-meta">
            {response.results.length === 0
              ? `Keine Belege in den Audits gefunden für „${response.query}".`
              : `${response.results.length} Beleg${response.results.length === 1 ? "" : "e"} aus ${response.searched_campaigns} Audit${response.searched_campaigns === 1 ? "" : "s"}.`}
          </p>

          <div className="rag__results-list">
            {response.results.map((r) => (
              <Link
                key={r.vse_insight_id}
                href={`/campaigns/${r.campaign_id}/interviews/${r.interview_id}`}
                className="rag__result"
              >
                <div className="rag__result-head">
                  <p className="rag__result-text">{r.problem_statement}</p>
                  <span className="rag__result-score">
                    {(r.score * 100).toFixed(0)}%
                  </span>
                </div>
                {r.human_solution && (
                  <p className="rag__result-quote">„{r.human_solution}"</p>
                )}
                <div className="rag__result-meta">
                  <span className="rag__chip rag__chip--accent">{r.anon_id}</span>
                  {r.department && (
                    <span className="rag__chip">{r.department}</span>
                  )}
                  <span className="rag__open">Interview öffnen →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
