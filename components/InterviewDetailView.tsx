"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Filter as FilterIcon,
  Inbox,
  Lightbulb,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataChip } from "@/components/ui/data-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
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
      {/* ─── Insights ──────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading title="Schlüssel-Insights" count={insights.length} />

        {insights.length === 0 ? (
          <Card>
            <EmptyState
              icon={Inbox}
              title="Noch keine Insights"
              hint={`Insights erscheinen, sobald die Auswertung abgeschlossen ist${
                processingStatus ? ` — aktuell: ${processingStatus}` : ""
              }.`}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {insights.map((insight, i) => (
              <InsightCard
                key={insight.id}
                index={i + 1}
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
          <p className="mt-4 text-[length:var(--text-meta)] text-fg-muted">
            <span className="tabular-nums">{selected.utterance_ids.length}</span>{" "}
            Stellen markiert.{" "}
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

      {/* ─── Transcript ────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeading
          title="Transkript"
          count={utterances.length}
          action={
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters((c) => !c)}
            >
              <FilterIcon className="h-3.5 w-3.5" />
              Filter
              {activeFiltersCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-soft px-1.5 text-[length:var(--text-caption)] tabular-nums text-accent-strong">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          }
        />

        {/* Search */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            placeholder="Im Transkript suchen…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex min-h-0 gap-4">
          {/* Filter panel */}
          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                key="filters"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 232, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 overflow-hidden"
              >
                <FilterPanel
                  filters={filters}
                  onChange={setFilters}
                  utterances={utterances}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transcript list */}
          <div className="min-w-0 flex-1">
            {filteredUtterances.length > 0 ? (
              <div className="flex flex-col gap-2">
                {filteredUtterances.map((u) => (
                  <UtteranceCard
                    key={u.id}
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
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={Inbox}
                  title={
                    utterances.length === 0
                      ? "Kein Transkript vorhanden"
                      : "Keine Treffer"
                  }
                  hint={
                    utterances.length === 0
                      ? "Sobald das Gespräch läuft, erscheinen die Wortbeiträge hier."
                      : "Keine Zeilen passen zu deinen Filtern."
                  }
                />
              </Card>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Insight card (expandable VSE triad) ──────────────────────────────────────

function InsightCard({
  index,
  insight,
  selected,
  onSelect,
}: {
  index: number;
  insight: VseInsight;
  selected: boolean;
  onSelect: () => void;
}) {
  const quoteCount = insight.utterance_ids?.length ?? 0;
  return (
    <Card
      interactive
      onClick={onSelect}
      className={cn("p-5", selected && "ring-1 ring-accent-muted")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 text-[length:var(--text-caption)] tabular-nums text-fg-subtle">
            I-{String(index).padStart(2, "0")}
          </span>
          <h3
            className={cn(
              "font-semibold tracking-[-0.01em] text-fg",
              selected && "text-accent-strong",
            )}
          >
            {insight.problem_statement}
          </h3>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-fg-subtle transition-transform",
            selected && "rotate-180",
          )}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {insight.department && <DataChip tone="neutral">{insight.department}</DataChip>}
        {insight.phase === "validation" && <DataChip tone="gap">Validierung</DataChip>}
        {insight.origin_solution === "AI" && (
          <DataChip tone="opportunity">Idee inferiert</DataChip>
        )}
        <span className="ml-auto text-[length:var(--text-caption)] tabular-nums text-fg-subtle">
          {quoteCount} {quoteCount === 1 ? "Zitat" : "Zitate"}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-3 border-t border-line-subtle pt-4">
              <TriadLine tone="pain" label="Problem" value={insight.problem_statement} />
              {insight.human_solution && (
                <TriadLine tone="opportunity" label="Idee" value={insight.human_solution} />
              )}
              {insight.business_opportunity && (
                <TriadLine
                  tone="success"
                  label="Chance"
                  value={insight.business_opportunity}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function TriadLine({
  tone,
  label,
  value,
}: {
  tone: "pain" | "opportunity" | "success";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="shrink-0">
        <DataChip tone={tone}>{label}</DataChip>
      </span>
      <p className="text-[length:var(--text-body)] leading-relaxed text-fg-muted">
        {value}
      </p>
    </div>
  );
}

// ─── Utterance card (transcript row) ──────────────────────────────────────────

function UtteranceCard({
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
    <div ref={registerRef} className="scroll-m-24">
      <Card
        interactive
        onClick={onToggle}
        className={cn("p-4", highlighted && "ring-1 ring-accent-muted")}
      >
        <div className="flex items-center gap-3">
          <DataChip tone={u.speaker === "participant" ? "gap" : "neutral"}>
            {SPEAKER_LABEL[u.speaker]}
          </DataChip>
          <span className={cn("min-w-0 flex-1 text-fg-muted", !expanded && "truncate")}>
            {u.text}
          </span>
          <span className="hidden shrink-0 items-center gap-2 text-[length:var(--text-caption)] tabular-nums text-fg-subtle sm:inline-flex">
            <span>{time}</span>
            {relatedInsights.length > 0 && (
              <span className="inline-flex items-center gap-1 text-accent-strong">
                <Lightbulb className="h-3 w-3" />
                {relatedInsights.length}
              </span>
            )}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex flex-col gap-4 border-t border-line-subtle pt-4">
                <p className="rounded-md border border-line-subtle bg-surface-2 p-4 text-[length:var(--text-body-lg)] leading-relaxed whitespace-pre-wrap text-fg">
                  {u.text}
                </p>

                <div className="flex flex-wrap gap-2">
                  <DataChip tone="neutral">{time}</DataChip>
                  <DataChip tone={u.phase === "validation" ? "gap" : "neutral"}>
                    {PHASE_LABEL[u.phase] ?? u.phase}
                  </DataChip>
                  <DataChip tone="neutral">#{u.utterance_index}</DataChip>
                </div>

                {relatedInsights.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {relatedInsights.map((ins) => (
                      <div
                        key={ins.id}
                        className="rounded-md border border-line bg-surface p-3"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <DataChip tone="opportunity">Insight</DataChip>
                          {ins.department && (
                            <DataChip tone="neutral">{ins.department}</DataChip>
                          )}
                        </div>
                        <p className="text-[length:var(--text-body)] text-fg">
                          {ins.problem_statement}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

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
    <div className="flex h-full w-[232px] flex-col gap-5 overflow-y-auto pr-1">
      <div className="flex items-center justify-between">
        <span className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
          Filter
        </span>
        {hasActive && (
          <Button variant="ghost" size="xs" onClick={clearAll}>
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
    </div>
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
      <p className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
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
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-ui border px-3 py-2 text-[length:var(--text-body-sm)] transition-colors",
        selected
          ? "border-accent-muted bg-accent-soft text-accent-strong"
          : "border-line text-fg-muted hover:border-line-strong hover:bg-surface-2",
      )}
    >
      <span>{label}</span>
      {selected && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
