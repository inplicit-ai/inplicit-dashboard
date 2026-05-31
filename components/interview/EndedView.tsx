"use client";

import { CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { StatBand, type StatBandCell } from "@/components/ui/stat-band";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";

interface Props {
  lang: Lang;
  summary: string | null;
  /** Wall-clock elapsed seconds (optional — drives the duration cell). */
  elapsedS?: number;
  /** Number of exchanged turns (optional — drives the utterances cell). */
  utteranceCount?: number;
}

function fmtDuration(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * EndedView — the quiet completion card (white-modernist).
 *
 * A centered white Card: a soft success medallion, a confident thank-you title,
 * a calm body, and a StatBand summarising the run (duration / turns / status).
 * Numbers render in clean sans tabular-nums.
 */
export function EndedView({ lang, summary, elapsedS, utteranceCount }: Props) {
  const c = roomCopy(lang);

  const synthLabel =
    lang === "en"
      ? "Queued"
      : lang === "fr"
        ? "En file"
        : lang === "es"
          ? "En cola"
          : "In Warteschlange";

  const durationLabel =
    lang === "en"
      ? "Duration"
      : lang === "fr"
        ? "Durée"
        : lang === "es"
          ? "Duración"
          : "Dauer";

  const turnsLabel =
    lang === "en"
      ? "Turns"
      : lang === "fr"
        ? "Échanges"
        : lang === "es"
          ? "Turnos"
          : "Beiträge";

  const statusLabel =
    lang === "en"
      ? "Synthesis"
      : lang === "fr"
        ? "Synthèse"
        : lang === "es"
          ? "Síntesis"
          : "Auswertung";

  const cells: StatBandCell[] = [];
  if (typeof elapsedS === "number") {
    cells.push({ label: durationLabel, value: fmtDuration(elapsedS) });
  }
  if (typeof utteranceCount === "number") {
    cells.push({ label: turnsLabel, value: utteranceCount });
  }
  cells.push({ label: statusLabel, value: synthLabel });

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle2 aria-hidden className="h-6 w-6 text-success" />
          </div>

          <h1 className="mt-5 text-[length:var(--text-display)] font-semibold tracking-[-0.02em] text-fg">
            {c.endedTitle}
          </h1>
          <p className="mt-3 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed text-fg-muted">
            {summary ?? c.endedBody}
          </p>

          <StatBand cells={cells} className="mt-6" />
        </CardContent>
      </Card>
    </div>
  );
}
