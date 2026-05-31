"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Filter as FilterIcon, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ledger } from "@/components/ui/ledger";
import { LedgerRow } from "@/components/ui/ledger-row";
import { Folio } from "@/components/ui/folio";
import { DataChip } from "@/components/ui/data-chip";
import { type StatusState } from "@/components/ui/status-disc";
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

// participant turns carry the gap tint (their voice is the evidence);
// agent turns stay neutral. Disc keeps both on the same spine x-axis.
const SPEAKER_DISC: Record<Utterance["speaker"], StatusState> = {
  agent: "idle",
  participant: "done",
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
      {/* ─── § INSIGHTS — evidence tree ─────────────────────────────────────── */}
      <section className="mb-10">
        <Folio index="§" label="Schlüssel-Insights" count={insights.length} />

        {insights.length === 0 ? (
          <EmptyPlate
            caption={`Noch keine Insights extrahiert${
              processingStatus ? ` — aktuell: ${processingStatus}` : ""
            }. Sie erscheinen, sobald die Auswertung abgeschlossen ist.`}
          />
        ) : (
          <Ledger>
            {insights.map((insight, i) => (
              <InsightRow
                key={insight.id}
                index={`I-${String(i + 1).padStart(2, "0")}`}
                insight={insight}
                selected={insight.id === selectedInsightId}
                onSelect={() =>
                  setSelectedInsightId((c) => (c === insight.id ? null : insight.id))
                }
              />
            ))}
          </Ledger>
        )}

        {selected && (
          <p className="mt-3 text-sm text-fg-muted">
            <span className="font-mono tabular-nums">
              {selected.utterance_ids.length}
            </span>{" "}
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

      {/* ─── § TRANSCRIPT — the spine register ──────────────────────────────── */}
      <section className="mb-8">
        <Folio
          index="§"
          label="Transkript"
          count={utterances.length}
          action={
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters((c) => !c)}
              className="relative"
            >
              <FilterIcon className="h-4 w-4" />
              <span className="ml-2">Filter</span>
              {activeFiltersCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-accent-soft px-1.5 font-mono text-xs tabular-nums text-accent-strong">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          }
        />

        {/* Search */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            placeholder="Im Transkript suchen…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        <div className="flex min-h-0 gap-4">
          {/* Filter panel */}
          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                key="filters"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 220, opacity: 1 }}
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

          {/* Transcript ledger */}
          <div className="min-w-0 flex-1">
            {filteredUtterances.length > 0 ? (
              <Ledger framed>
                {filteredUtterances.map((u) => (
                  <UtteranceRow
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
              </Ledger>
            ) : (
              <EmptyPlate
                caption={
                  utterances.length === 0
                    ? "Kein Transkript vorhanden."
                    : "Keine Zeilen passen zu deinen Filtern."
                }
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Insight row (expandable evidence branch) ─────────────────────────────────

function InsightRow({
  index,
  insight,
  selected,
  onSelect,
}: {
  index: string;
  insight: VseInsight;
  selected: boolean;
  onSelect: () => void;
}) {
  const quoteCount = insight.utterance_ids?.length ?? 0;
  return (
    <LedgerRow
      index={index}
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn(selected && "text-accent-strong")}>
            {insight.problem_statement}
          </span>
          {insight.department && <DataChip tone="neutral">{insight.department}</DataChip>}
          {insight.phase === "validation" && (
            <DataChip tone="gap">Validierung</DataChip>
          )}
          {insight.origin_solution === "AI" && (
            <DataChip tone="opportunity">Idee inferiert</DataChip>
          )}
        </span>
      }
      status={selected ? "live" : "done"}
      pulse={false}
      metric={
        <span className="inline-flex items-center gap-1">
          <span className="font-mono tabular-nums">{quoteCount}</span>
          <span className="text-fg-subtle">{quoteCount === 1 ? "Zitat" : "Zitate"}</span>
        </span>
      }
      expandable
      onToggle={onSelect}
      open={selected}
    >
      <div className="flex flex-col gap-1 pb-2 pt-1">
        <TriadLine tone="pain" label="Problem" value={insight.problem_statement} />
        {insight.human_solution && (
          <TriadLine tone="opportunity" label="Idee" value={insight.human_solution} />
        )}
        {insight.business_opportunity && (
          <TriadLine tone="success" label="Chance" value={insight.business_opportunity} />
        )}
      </div>
    </LedgerRow>
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
    <div className="flex items-baseline gap-3 pl-[calc(var(--spine-w,28px)+var(--tree-indent,24px))]">
      <span className="shrink-0">
        <DataChip tone={tone}>{label}</DataChip>
      </span>
      <p className="text-sm leading-relaxed text-fg-muted">{value}</p>
    </div>
  );
}

// ─── Utterance row (transcript spine register) ────────────────────────────────

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
      className={cn("scroll-m-24 transition-colors", highlighted && "bg-accent-soft")}
    >
      <LedgerRow
        index={`#${u.utterance_index}`}
        title={
          <span className="flex min-w-0 items-center gap-3">
            <DataChip tone={u.speaker === "participant" ? "gap" : "neutral"}>
              {SPEAKER_LABEL[u.speaker]}
            </DataChip>
            <span className="truncate text-fg-muted">{u.text}</span>
          </span>
        }
        status={SPEAKER_DISC[u.speaker]}
        metric={
          <span className="inline-flex items-center gap-3">
            <span className="hidden font-mono tabular-nums text-fg-subtle sm:inline">
              {time}
            </span>
            {relatedInsights.length > 0 && (
              <DataChip tone="opportunity" mono>
                {relatedInsights.length}
              </DataChip>
            )}
          </span>
        }
        expandable
        open={expanded}
        onToggle={onToggle}
      >
        <div className="flex flex-col gap-4 pb-3 pl-[calc(var(--spine-w,28px)+var(--tree-indent,24px))] pt-1 pr-4">
          <div>
            <p className="label-eyebrow mb-2">Wortlaut</p>
            <p className="rounded-ui border border-line-subtle bg-surface p-4 text-[length:var(--text-body-lg)] leading-relaxed text-fg whitespace-pre-wrap">
              {u.text}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <DataChip tone="neutral" mono>
              {time}
            </DataChip>
            <DataChip tone={u.phase === "validation" ? "gap" : "neutral"}>
              {PHASE_LABEL[u.phase] ?? u.phase}
            </DataChip>
            <DataChip tone="neutral" mono>
              #{u.utterance_index}
            </DataChip>
          </div>

          {relatedInsights.length > 0 && (
            <div>
              <p className="label-eyebrow mb-2">Beigetragen zu</p>
              <div className="flex flex-col gap-2">
                {relatedInsights.map((ins) => (
                  <div
                    key={ins.id}
                    className="rounded-ui border border-line bg-surface p-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <DataChip tone="opportunity">Insight</DataChip>
                      {ins.department && <DataChip tone="neutral">{ins.department}</DataChip>}
                    </div>
                    <p className="text-sm text-fg">{ins.problem_statement}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </LedgerRow>
    </div>
  );
}

// ─── Empty plate ──────────────────────────────────────────────────────────────

function EmptyPlate({ caption }: { caption: string }) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-fg-subtle">
        {caption}
      </p>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full w-[220px] flex-col gap-5 overflow-y-auto pr-1"
    >
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">Filter</span>
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
      <p className="label-eyebrow">{label}</p>
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
          : "border-line text-fg-muted hover:border-fg-subtle hover:bg-surface-2",
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
