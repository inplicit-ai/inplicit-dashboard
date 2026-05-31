"use client";

import { PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatBand, type StatBandCell } from "@/components/ui/stat-band";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";

interface Props {
  lang: Lang;
  elapsedS: number;
  /** When set, renders a Resume CTA (e.g. arriving via a resume link). */
  onResume?: () => void;
  /** True when the disconnect already emailed a resume link. */
  emailed?: boolean;
}

/**
 * ResumeView — the welcome-back card (white-modernist).
 *
 * A centered white Card: a soft medallion, a warm welcome title, the
 * welcome-back body, and a StatBand pinning the saved position. Either a
 * near-black Resume CTA or a quiet note that a link was emailed.
 */
export function ResumeView({ lang, elapsedS, onResume, emailed }: Props) {
  const c = roomCopy(lang);
  const mins = Math.round(elapsedS / 60);

  const positionLabel =
    lang === "es" ? "Posición" : "Position";
  const minUnit =
    lang === "de" ? "Min" : "min";

  const cells: StatBandCell[] = [
    { label: positionLabel, value: `${mins} ${minUnit}` },
  ];

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2">
            <PlayCircle aria-hidden className="h-6 w-6 text-fg-subtle" />
          </div>

          <h1 className="mt-5 text-[length:var(--text-display)] font-semibold tracking-[-0.02em] text-fg">
            {c.resumeTitle}
          </h1>
          <p className="mt-3 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed text-fg-muted">
            {c.resumeBody(mins)}
          </p>

          <StatBand cells={cells} className="mt-6" />

          {onResume && (
            <Button
              type="button"
              size="lg"
              onClick={onResume}
              className="mt-6 w-full"
            >
              {c.resumeCta}
            </Button>
          )}
          {emailed && !onResume && (
            <p className="mt-6 border-t border-line-subtle pt-4 text-[length:var(--text-caption)] leading-relaxed text-fg-subtle">
              {lang === "en"
                ? "We've emailed you a link to rejoin when you're ready."
                : lang === "fr"
                  ? "Nous vous avons envoyé un lien par e-mail pour reprendre."
                  : lang === "es"
                    ? "Te hemos enviado por correo un enlace para retomar."
                    : "Wir haben dir einen Link per E-Mail geschickt, um später fortzufahren."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
