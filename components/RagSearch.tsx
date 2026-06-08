"use client";

import { useEffect, useRef, useState } from "react";
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
    label: "Onboarding-Schmerzen",
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
    value: "Was sind die meistgenannten Schmerzpunkte über alle Kampagnen hinweg?",
  },
];

// ── Animated placeholder ───────────────────────────────────────────────────
const PLACEHOLDER_PHRASES = [
  "Welche Insights stecken in all meinen Kampagnen?",
  "Fasse das Wissen meiner Organisation zusammen.",
  "Wo entstehen Reibungspunkte zwischen Teams?",
  "Was sind die häufigsten Schmerzpunkte?",
  "Welche Prozesse kosten am meisten Energie?",
  "Was wollen Mitarbeitende wirklich verändern?",
];

const TYPE_SPEED = 38;   // ms per character while typing
const DELETE_SPEED = 18; // ms per character while deleting
const PAUSE_AFTER_TYPE = 2200; // ms to display full phrase
const PAUSE_BEFORE_TYPE = 400; // ms pause between phrases

function useAnimatedPlaceholder(active: boolean): string {
  const [displayed, setDisplayed] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting" | "waiting">("typing");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      setDisplayed("");
      return;
    }

    function tick() {
      const phrase = PLACEHOLDER_PHRASES[phraseIdx];

      if (phase === "typing") {
        if (charIdx < phrase.length) {
          setDisplayed(phrase.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
          timeoutRef.current = setTimeout(tick, TYPE_SPEED);
        } else {
          setPhase("pausing");
          timeoutRef.current = setTimeout(tick, PAUSE_AFTER_TYPE);
        }
      } else if (phase === "pausing") {
        setPhase("deleting");
        timeoutRef.current = setTimeout(tick, DELETE_SPEED);
      } else if (phase === "deleting") {
        if (charIdx > 0) {
          setCharIdx((c) => c - 1);
          setDisplayed(phrase.slice(0, charIdx - 1));
          timeoutRef.current = setTimeout(tick, DELETE_SPEED);
        } else {
          setDisplayed("");
          setPhase("waiting");
          timeoutRef.current = setTimeout(tick, PAUSE_BEFORE_TYPE);
        }
      } else {
        // waiting → advance to next phrase
        setPhraseIdx((i) => (i + 1) % PLACEHOLDER_PHRASES.length);
        setCharIdx(0);
        setPhase("typing");
        timeoutRef.current = setTimeout(tick, TYPE_SPEED);
      }
    }

    timeoutRef.current = setTimeout(tick, TYPE_SPEED);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, phase, charIdx, phraseIdx]);

  return displayed;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RagSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);

  // Animate placeholder only when input is empty and not loading
  const animatePlaceholder = query === "" && !loading;
  const animatedPlaceholder = useAnimatedPlaceholder(animatePlaceholder);

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
    <div className="w-full space-y-4">
      {/* Cited evidence — rendered ABOVE the composer. */}
      {(error || response) && (
        <ResultsArea
          error={error}
          response={response}
          isEmpty={Boolean(isEmpty)}
          hasResults={Boolean(hasResults)}
        />
      )}

      {/* Full-width composer */}
      <Composer
        value={query}
        onValueChange={setQuery}
        onSubmit={(v) => void runSearch(v)}
        placeholder={animatedPlaceholder}
        isLoading={loading}
        suggestions={SUGGESTIONS}
        onSuggestionSelect={onSuggestion}
        className="w-full"
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
              Kampagnen finden.
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
            {response.searched_campaigns} Kampagnen
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
