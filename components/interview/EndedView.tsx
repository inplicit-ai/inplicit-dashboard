"use client";

import { StatusDisc } from "@/components/ui/status-disc";
import { SpecBlock, type SpecRow } from "@/components/ui/spec-block";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";

interface Props {
  lang: Lang;
  summary: string | null;
  /** Wall-clock elapsed seconds (optional — drives the duration spec row). */
  elapsedS?: number;
  /** Number of exchanged turns (optional — drives the utterances spec row). */
  utteranceCount?: number;
}

function fmtDuration(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * EndedView — the quiet instrument-plate (manifesto: interview-experience).
 *
 * A single done StatusDisc on the spine, a folio-style eyebrow, and a mono
 * SpecBlock summarising the run (duration / utterances / status → synthesis
 * queued). No gradient avatar, no glow — monochrome, since nothing is live.
 */
export function EndedView({ lang, summary, elapsedS, utteranceCount }: Props) {
  const c = roomCopy(lang);

  const synthLabel =
    lang === "en"
      ? "→ synthesis queued"
      : lang === "fr"
        ? "→ synthèse en file"
        : lang === "es"
          ? "→ síntesis en cola"
          : "→ Auswertung in Warteschlange";

  const rows: SpecRow[] = [];
  if (typeof elapsedS === "number") {
    rows.push({ label: c.remaining, value: fmtDuration(elapsedS) });
  }
  if (typeof utteranceCount === "number") {
    rows.push({ label: "n=", value: utteranceCount });
  }
  rows.push({ label: "Status", value: synthLabel });

  return (
    <div className="iv-plate">
      <div className="iv-plate__head">
        <span className="iv-plate__spine" aria-hidden>
          <StatusDisc state="done" size="lg" />
        </span>
        <div className="iv-plate__title-block">
          <span className="eyebrow">{c.endedEyebrow}</span>
          <h1 className="title iv-plate__title">{c.endedTitle}</h1>
        </div>
      </div>

      <p className="body-lg iv-plate__body">{summary ?? c.endedBody}</p>

      <SpecBlock rows={rows} className="iv-plate__spec" />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .iv-plate { min-height: 100dvh; display: flex; flex-direction: column; justify-content: center; gap: var(--space-6); max-width: 68ch; margin: 0 auto; padding: var(--space-8) var(--space-6); background: var(--color-surface); }
        .iv-plate__head { display: grid; grid-template-columns: 28px 1fr; align-items: start; gap: var(--space-4); }
        .iv-plate__spine { display: flex; align-items: center; justify-content: center; padding-top: 2px; }
        .iv-plate__title-block { display: flex; flex-direction: column; gap: var(--space-2); }
        .iv-plate__title { letter-spacing: -0.02em; }
        .iv-plate__body { padding-left: calc(28px + var(--space-4)); max-width: 60ch; color: var(--color-text-secondary); }
        .iv-plate__spec { margin-left: calc(28px + var(--space-4)); max-width: 360px; }
        @media (max-width: 640px) {
          .iv-plate { padding: var(--space-6) var(--space-4); }
          .iv-plate__body, .iv-plate__spec { padding-left: 0; margin-left: 0; }
        }
      `,
        }}
      />
    </div>
  );
}
