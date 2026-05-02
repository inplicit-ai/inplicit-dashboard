import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Utterance, VseInsight } from "../lib/api.ts";

interface Props {
  utterances: Utterance[];
  insights: VseInsight[];
  processingStatus?: string;
}

export default function InterviewDetailView(
  { utterances, insights, processingStatus }: Props,
) {
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(
    null,
  );

  const selected = useMemo(
    () => insights.find((i) => i.id === selectedInsightId) ?? null,
    [insights, selectedInsightId],
  );

  const highlightedUtteranceIds = useMemo(
    () => new Set(selected?.utterance_ids ?? []),
    [selected],
  );

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const turnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!selected || selected.utterance_ids.length === 0) return;
    const firstId = selected.utterance_ids.find((id) =>
      turnRefs.current.has(id)
    );
    if (!firstId) return;
    const node = turnRefs.current.get(firstId);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selected]);

  function toggle(id: string) {
    setSelectedInsightId((current) => (current === id ? null : id));
  }

  return (
    <>
      <section class="section">
        <SectionHeader
          eyebrow="Schlüssel-Insights"
          title="Was aus diesem Gespräch hervorging"
          count={insights.length}
        />
        {insights.length === 0
          ? (
            <div class="card">
              <div class="empty-state">
                <p class="empty-state__title">
                  Noch keine Insights extrahiert.
                </p>
                <p>
                  Sie erscheinen, sobald die Auswertung abgeschlossen ist
                  {processingStatus && ` (aktuell: ${processingStatus})`}.
                </p>
              </div>
            </div>
          )
          : (
            <div class="list-stack">
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  selected={insight.id === selectedInsightId}
                  onSelect={() => toggle(insight.id)}
                />
              ))}
            </div>
          )}

        {selected && (
          <p class="iv-detail__hint">
            <span>{selected.utterance_ids.length} Stellen markiert.</span>{" "}
            <button
              type="button"
              class="iv-detail__hint-clear"
              onClick={() => setSelectedInsightId(null)}
            >
              Auswahl zurücksetzen
            </button>
          </p>
        )}
      </section>

      <section class="section">
        <SectionHeader
          eyebrow="Transkript"
          title="Vollständiger Verlauf"
          count={utterances.length}
        />
        {utterances.length === 0
          ? (
            <div class="card">
              <div class="empty-state">
                <p class="empty-state__title">
                  Kein Transkript vorhanden.
                </p>
              </div>
            </div>
          )
          : (
            <div class="transcript" ref={transcriptRef}>
              {utterances.map((u) => (
                <Turn
                  key={u.id}
                  u={u}
                  highlighted={highlightedUtteranceIds.has(u.id)}
                  registerRef={(el) => {
                    if (el) turnRefs.current.set(u.id, el);
                    else turnRefs.current.delete(u.id);
                  }}
                />
              ))}
            </div>
          )}
      </section>

      <style>
        {`
        .iv-detail__hint {
          margin-top: var(--space-3);
          font-size: var(--text-meta);
          color: var(--color-text-secondary);
        }
        .iv-detail__hint-clear {
          background: none;
          border: 0;
          padding: 0;
          color: var(--color-accent-strong);
          cursor: pointer;
          font: inherit;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .iv-detail__hint-clear:hover { color: var(--color-text-primary); }

        .insight-card {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          padding: var(--space-6);
          width: 100%;
          text-align: left;
          font: inherit;
          color: inherit;
          cursor: pointer;
          transition:
            border-color 0.15s var(--ease-smooth),
            box-shadow 0.15s var(--ease-smooth),
            background-color 0.15s var(--ease-smooth);
        }
        .insight-card:hover { border-color: var(--color-text-tertiary); }
        .insight-card:focus-visible {
          outline: 2px solid var(--color-accent-strong);
          outline-offset: 2px;
        }
        .insight-card--selected {
          border-color: var(--color-accent-strong);
          box-shadow: 0 0 0 1px var(--color-accent-strong) inset;
        }
        .insight-card__head {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-3);
        }
        .insight-card__count {
          margin-left: auto;
          font-family: var(--font-mono);
          font-size: var(--text-meta);
          color: var(--color-text-tertiary);
        }
        .insight-card__body {
          font-size: var(--text-body-lg);
          font-weight: 500;
          line-height: 1.5;
          color: var(--color-text-primary);
          margin: 0;
        }

        .transcript {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          padding: var(--space-6) var(--space-7);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }
        .turn {
          display: grid;
          grid-template-columns: 7.5rem 1fr;
          gap: var(--space-5);
          align-items: start;
          scroll-margin-top: var(--space-8);
        }
        .turn__meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: var(--text-caption);
          color: var(--color-text-tertiary);
          padding-top: 3px;
        }
        .turn__speaker {
          font-family: var(--font-mono);
          font-size: var(--text-eyebrow);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-secondary);
        }
        .turn__speaker--agent { color: var(--color-accent-strong); }
        .turn__phase {
          font-size: var(--text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .turn__phase--validation { color: var(--color-gap); }
        .turn__text {
          font-size: var(--text-body);
          line-height: 1.65;
          color: var(--color-text-primary);
          white-space: pre-wrap;
          padding-left: var(--space-4);
          border-left: 1px solid var(--color-border-subtle);
          transition:
            background-color 0.2s var(--ease-smooth),
            border-left-color 0.2s var(--ease-smooth);
        }
        .turn--agent .turn__text { color: var(--color-text-primary); }
        .turn--participant .turn__text {
          color: var(--color-text-primary);
          font-weight: 500;
        }
        .turn--highlighted .turn__text {
          background: color-mix(
            in srgb,
            var(--color-accent-strong) 12%,
            transparent
          );
          border-left-color: var(--color-accent-strong);
          border-radius: var(--radius-sm);
        }

        @media (max-width: 640px) {
          .turn { grid-template-columns: 1fr; gap: var(--space-2); }
          .turn__text { padding-left: 0; border-left: 0; }
          .turn--highlighted .turn__text {
            border-left: 0;
            padding-left: var(--space-3);
          }
        }
        `}
      </style>
    </>
  );
}

function SectionHeader(
  { eyebrow, title, count }: {
    eyebrow: string;
    title: string;
    count: number;
  },
) {
  return (
    <header class="section-header">
      <div>
        <span class="eyebrow">{eyebrow}</span>
        <h2 class="section-header__title">{title}</h2>
      </div>
      <span class="section-header__count">{count}</span>
    </header>
  );
}

function InsightCard(
  { insight, selected, onSelect }: {
    insight: VseInsight;
    selected: boolean;
    onSelect: () => void;
  },
) {
  const quoteCount = insight.utterance_ids?.length ?? 0;
  return (
    <button
      type="button"
      class={`insight-card${selected ? " insight-card--selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={selected
        ? "Auswahl aufheben"
        : "Stellen im Transkript hervorheben"}
    >
      <div class="insight-card__head">
        {insight.department && (
          <span class="caption">{insight.department}</span>
        )}
        {insight.phase === "validation" && (
          <span class="badge badge--gap">Validierungsphase</span>
        )}
        {insight.origin_solution === "AI" && (
          <span class="badge badge--knowledge">Idee inferiert</span>
        )}
        {quoteCount > 0 && (
          <span class="insight-card__count">
            {quoteCount} {quoteCount === 1 ? "Zitat" : "Zitate"}
          </span>
        )}
      </div>
      <p class="insight-card__body">{insight.problem_statement}</p>
      {insight.human_solution && (
        <p class="caption" style="margin-top: var(--space-2)">
          <strong>Idee:</strong> {insight.human_solution}
        </p>
      )}
      {insight.business_opportunity && (
        <p class="caption" style="margin-top: var(--space-1)">
          <strong>Chance:</strong> {insight.business_opportunity}
        </p>
      )}
    </button>
  );
}

function Turn(
  { u, highlighted, registerRef }: {
    u: Utterance;
    highlighted: boolean;
    registerRef: (el: HTMLDivElement | null) => void;
  },
) {
  const speakerLabel = u.speaker === "agent" ? "Agent" : "Teilnehmer";
  const phaseLabel = u.phase === "validation" ? "Validierung" : "Open";
  return (
    <div
      ref={registerRef}
      class={`turn turn--${u.speaker}${
        highlighted ? " turn--highlighted" : ""
      }`}
    >
      <div class="turn__meta">
        <span class={`turn__speaker turn__speaker--${u.speaker}`}>
          {speakerLabel}
        </span>
        <span
          class={`turn__phase ${
            u.phase === "validation" ? "turn__phase--validation" : ""
          }`}
        >
          {phaseLabel}
        </span>
        {typeof u.timestamp_start === "number" && (
          <span class="caption tabular">{formatTime(u.timestamp_start)}</span>
        )}
      </div>
      <div class="turn__text">{u.text}</div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
