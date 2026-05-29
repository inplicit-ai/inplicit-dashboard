"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Filter as FilterIcon,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eyebrow } from "@/components/PageChrome";
import { cn } from "@/lib/utils";
import type { Utterance, VseInsight } from "@/lib/api";

interface Props {
  utterances: Utterance[];
  insights: VseInsight[];
  processingStatus?: string;
}

type Filters = {
  speaker: Array<Utterance["speaker"]>;
  phase: string[];
  hasInsight: ("yes" | "no")[];
};

const SPEAKER_LABEL: Record<Utterance["speaker"], string> = {
  agent: "Agent",
  participant: "Teilnehmer",
};

const PHASE_LABEL: Record<string, string> = {
  open: "Open Discovery",
  validation: "Validierung",
};

const SPEAKER_STYLES: Record<Utterance["speaker"], string> = {
  agent: "bg-accent-soft text-accent-strong border-accent-muted",
  participant: "bg-gap-soft text-gap border-gap-muted",
};

const PHASE_STYLES: Record<string, string> = {
  open: "bg-surface-2 text-fg-muted border-line",
  validation: "bg-gap-soft text-gap border-gap-muted",
};

export function InterviewDetailView({
  utterances,
  insights,
  processingStatus,
}: Props) {
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUtteranceId, setExpandedUtteranceId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    speaker: [],
    phase: [],
    hasInsight: [],
  });

  const insightsByUtterance = useMemo(() => {
    const map = new Map<string, VseInsight[]>();
    for (const insight of insights) {
      for (const uid of insight.utterance_ids ?? []) {
        const list = map.get(uid) ?? [];
        list.push(insight);
        map.set(uid, list);
      }
    }
    return map;
  }, [insights]);

  const selected = useMemo(
    () => insights.find((i) => i.id === selectedInsightId) ?? null,
    [insights, selectedInsightId],
  );

  const highlightedUtteranceIds = useMemo(
    () => new Set(selected?.utterance_ids ?? []),
    [selected],
  );

  const turnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!selected || selected.utterance_ids.length === 0) return;
    const firstId = selected.utterance_ids.find((id) => turnRefs.current.has(id));
    if (!firstId) return;
    const node = turnRefs.current.get(firstId);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    setExpandedUtteranceId(firstId);
  }, [selected]);

  const filteredUtterances = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return utterances.filter((u) => {
      const matchSearch = q === "" || u.text.toLowerCase().includes(q);
      const matchSpeaker =
        filters.speaker.length === 0 || filters.speaker.includes(u.speaker);
      const matchPhase =
        filters.phase.length === 0 || filters.phase.includes(u.phase);
      const hasInsight = insightsByUtterance.has(u.id);
      const matchInsight =
        filters.hasInsight.length === 0 ||
        (hasInsight && filters.hasInsight.includes("yes")) ||
        (!hasInsight && filters.hasInsight.includes("no"));
      return matchSearch && matchSpeaker && matchPhase && matchInsight;
    });
  }, [utterances, searchQuery, filters, insightsByUtterance]);

  const activeFiltersCount =
    filters.speaker.length + filters.phase.length + filters.hasInsight.length;

  return (
    <>
      {/* ─── Insights ─────────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader
          eyebrow="Schlüssel-Insights"
          title="Was aus diesem Gespräch hervorging"
          count={insights.length}
        />
        {insights.length === 0 ? (
          <div className="card card--compact">
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <p className="text-sm font-semibold text-fg">
                Noch keine Insights extrahiert.
              </p>
              <p className="text-xs text-fg-muted">
                Sie erscheinen, sobald die Auswertung abgeschlossen ist
                {processingStatus && ` (aktuell: ${processingStatus})`}.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                selected={insight.id === selectedInsightId}
                onSelect={() =>
                  setSelectedInsightId((c) => (c === insight.id ? null : insight.id))
                }
              />
            ))}
          </div>
        )}

        {selected && (
          <p className="mt-3 text-sm text-fg-muted">
            <span>{selected.utterance_ids.length} Stellen markiert.</span>{" "}
            <button
              type="button"
              className="text-accent-strong underline underline-offset-2 hover:text-fg"
              onClick={() => setSelectedInsightId(null)}
            >
              Auswahl zurücksetzen
            </button>
          </p>
        )}
      </section>

      {/* ─── Transcript-as-Logs ───────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader
          eyebrow="Transkript"
          title="Vollständiger Verlauf"
          count={utterances.length}
        />

        <div className="card card--flush">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-line bg-surface-2 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <Input
                placeholder="Im Transkript suchen…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters((c) => !c)}
              className="relative"
            >
              <FilterIcon className="h-4 w-4" />
              <span className="ml-2">Filter</span>
              {activeFiltersCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-soft px-1.5 text-xs font-medium text-accent-strong">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          <div className="flex min-h-0">
            {/* Filter panel */}
            <AnimatePresence initial={false}>
              {showFilters && (
                <motion.div
                  key="filters"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-r border-line bg-surface-2"
                >
                  <FilterPanel
                    filters={filters}
                    onChange={setFilters}
                    utterances={utterances}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Log rows */}
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredUtterances.length > 0 ? (
                  filteredUtterances.map((u, index) => (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.15) }}
                    >
                      <UtteranceRow
                        u={u}
                        relatedInsights={insightsByUtterance.get(u.id) ?? []}
                        highlighted={highlightedUtteranceIds.has(u.id)}
                        expanded={expandedUtteranceId === u.id}
                        onToggle={() =>
                          setExpandedUtteranceId((c) => (c === u.id ? null : u.id))
                        }
                        registerRef={(el) => {
                          if (el) turnRefs.current.set(u.id, el);
                          else turnRefs.current.delete(u.id);
                        }}
                      />
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-12 text-center text-fg-muted"
                  >
                    {utterances.length === 0
                      ? "Kein Transkript vorhanden."
                      : "Keine Zeilen passen zu deinen Filtern."}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Insight card ────────────────────────────────────────────────────────────

function InsightCard({
  insight,
  selected,
  onSelect,
}: {
  insight: VseInsight;
  selected: boolean;
  onSelect: () => void;
}) {
  const quoteCount = insight.utterance_ids?.length ?? 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-card border bg-surface p-6 text-left transition-all hover:-translate-y-0.5",
        selected
          ? "border-accent-strong ring-1 ring-accent-strong"
          : "border-line hover:border-line-strong",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {insight.department && (
          <Badge variant="outline" className="text-xs">
            {insight.department}
          </Badge>
        )}
        {insight.phase === "validation" && (
          <Badge className="bg-gap-soft text-gap border-gap-muted">
            Validierungsphase
          </Badge>
        )}
        {insight.origin_solution === "AI" && (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Idee inferiert
          </Badge>
        )}
        {quoteCount > 0 && (
          <span className="ml-auto font-mono text-xs text-fg-subtle">
            {quoteCount} {quoteCount === 1 ? "Zitat" : "Zitate"}
          </span>
        )}
      </div>
      <p className="text-base font-medium leading-relaxed text-fg">
        {insight.problem_statement}
      </p>
      {insight.human_solution && (
        <p className="mt-2 text-sm text-fg-muted">
          <strong className="text-fg">Idee:</strong> {insight.human_solution}
        </p>
      )}
      {insight.business_opportunity && (
        <p className="mt-1 text-sm text-fg-muted">
          <strong className="text-fg">Chance:</strong> {insight.business_opportunity}
        </p>
      )}
    </button>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: number;
}) {
  return (
    <header className="mb-4 flex items-end justify-between gap-4">
      <div className="space-y-1.5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-xl font-semibold tracking-tight text-fg">{title}</h2>
      </div>
      <span className="font-mono text-sm text-fg-subtle">{count}</span>
    </header>
  );
}

// ─── Utterance row ───────────────────────────────────────────────────────────

function UtteranceRow({
  u,
  relatedInsights,
  highlighted,
  expanded,
  onToggle,
  registerRef,
}: {
  u: Utterance;
  relatedInsights: VseInsight[];
  highlighted: boolean;
  expanded: boolean;
  onToggle: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  const time =
    typeof u.timestamp_start === "number" ? formatTime(u.timestamp_start) : "—";

  return (
    <div
      ref={registerRef}
      className={cn(
        "border-b border-line-subtle last:border-b-0 scroll-m-24 transition-colors",
        highlighted && "bg-accent-soft",
      )}
    >
      <motion.button
        onClick={onToggle}
        className="w-full p-4 text-left transition-colors hover:bg-surface-2"
      >
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            className="flex-shrink-0 text-fg-subtle"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>

          <Badge
            variant="outline"
            className={cn("flex-shrink-0 capitalize", SPEAKER_STYLES[u.speaker])}
          >
            {SPEAKER_LABEL[u.speaker]}
          </Badge>

          <time className="hidden w-16 flex-shrink-0 font-mono text-xs text-fg-subtle sm:block">
            {time}
          </time>

          <Badge
            variant="outline"
            className={cn(
              "hidden flex-shrink-0 capitalize sm:inline-flex",
              PHASE_STYLES[u.phase] ?? PHASE_STYLES.open,
            )}
          >
            {PHASE_LABEL[u.phase] ?? u.phase}
          </Badge>

          <p className="flex-1 truncate text-sm text-fg-muted">{u.text}</p>

          {relatedInsights.length > 0 && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 font-mono text-xs text-accent-strong">
              <Sparkles className="h-3 w-3" />
              {relatedInsights.length}
            </span>
          )}
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-line-subtle bg-surface-2"
          >
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Wortlaut
                </p>
                <p className="rounded-ui border border-line-subtle bg-surface p-3 text-sm leading-relaxed text-fg whitespace-pre-wrap">
                  {u.text}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Meta label="Zeit" value={time} mono />
                <Meta label="Phase" value={PHASE_LABEL[u.phase] ?? u.phase} />
                <Meta label="Index" value={`#${u.utterance_index}`} mono />
              </div>

              {relatedInsights.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                    Beigetragen zu
                  </p>
                  <div className="flex flex-col gap-2">
                    {relatedInsights.map((ins) => (
                      <div
                        key={ins.id}
                        className="rounded-ui border border-line bg-surface p-3"
                      >
                        <div className="mb-1 flex items-center gap-2 text-xs">
                          <Sparkles className="h-3 w-3 text-accent-strong" />
                          <span className="font-mono uppercase tracking-wide text-accent-strong">
                            Insight
                          </span>
                          {ins.department && (
                            <Badge variant="outline" className="text-xs">
                              {ins.department}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-fg">{ins.problem_statement}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p className={cn("text-fg", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

// ─── Filter panel ────────────────────────────────────────────────────────────

function FilterPanel({
  filters,
  onChange,
  utterances,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  utterances: Utterance[];
}) {
  const speakers = Array.from(
    new Set(utterances.map((u) => u.speaker)),
  ) as Array<Utterance["speaker"]>;
  const phases = Array.from(new Set(utterances.map((u) => u.phase)));

  function toggle<K extends keyof Filters>(key: K, value: Filters[K][number]) {
    const current = filters[key] as Array<Filters[K][number]>;
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next } as Filters);
  }

  function clearAll() {
    onChange({ speaker: [], phase: [], hasInsight: [] });
  }

  const hasActive =
    filters.speaker.length + filters.phase.length + filters.hasInsight.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full w-60 flex-col gap-5 overflow-y-auto p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">Filter</h3>
        {hasActive && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-xs">
            Zurücksetzen
          </Button>
        )}
      </div>

      <FilterGroup label="Sprecher">
        {speakers.map((s) => (
          <FilterToggle
            key={s}
            selected={filters.speaker.includes(s)}
            onClick={() => toggle("speaker", s)}
            label={SPEAKER_LABEL[s]}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Phase">
        {phases.map((p) => (
          <FilterToggle
            key={p}
            selected={filters.phase.includes(p)}
            onClick={() => toggle("phase", p)}
            label={PHASE_LABEL[p] ?? p}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Insight-Bezug">
        <FilterToggle
          selected={filters.hasInsight.includes("yes")}
          onClick={() => toggle("hasInsight", "yes")}
          label="Mit Insight"
        />
        <FilterToggle
          selected={filters.hasInsight.includes("no")}
          onClick={() => toggle("hasInsight", "no")}
          label="Ohne Insight"
        />
      </FilterGroup>
    </motion.div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function FilterToggle({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ x: 2 }}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-ui border px-3 py-2 text-sm transition-colors",
        selected
          ? "border-accent-strong bg-accent-soft text-accent-strong"
          : "border-line text-fg-muted hover:border-fg-subtle hover:bg-surface",
      )}
    >
      <span>{label}</span>
      {selected && <Check className="h-3.5 w-3.5" />}
    </motion.button>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
