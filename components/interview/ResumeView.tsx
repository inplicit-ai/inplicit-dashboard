"use client";

import { StatusDisc } from "@/components/ui/status-disc";
import { SpecBlock, type SpecRow } from "@/components/ui/spec-block";
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
 * ResumeView — the paused / resumable instrument plate (doc 04 §7.5).
 *
 * A quiet plate: an idle spine disc (nothing is live while paused), a folio
 * eyebrow, the welcome-back body, and a mono SpecBlock pinning the position
 * (elapsed minutes). Either a near-black Resume CTA or a note that a resume
 * link was emailed.
 */
export function ResumeView({ lang, elapsedS, onResume, emailed }: Props) {
  const c = roomCopy(lang);
  const mins = Math.round(elapsedS / 60);

  const positionLabel =
    lang === "en"
      ? "Position"
      : lang === "fr"
        ? "Position"
        : lang === "es"
          ? "Posición"
          : "Position";

  const minUnit =
    lang === "de" ? "Min" : lang === "fr" ? "min" : lang === "es" ? "min" : "min";

  const rows: SpecRow[] = [
    { label: positionLabel, value: `${mins} ${minUnit}` },
  ];

  return (
    <div className="iv-resume">
      <div className="iv-resume__plate">
        <div className="iv-resume__head">
          <span className="iv-resume__spine" aria-hidden>
            <StatusDisc state="idle" size="lg" />
          </span>
          <div className="iv-resume__title-block">
            <span className="eyebrow">{c.resumeEyebrow}</span>
            <h1 className="title iv-resume__title">{c.resumeTitle}</h1>
          </div>
        </div>

        <p className="body-lg iv-resume__body">{c.resumeBody(mins)}</p>

        <SpecBlock rows={rows} className="iv-resume__spec" />

        {onResume && (
          <div className="iv-resume__actions">
            <button
              type="button"
              onClick={onResume}
              className="btn btn--primary btn--lg iv-resume__cta"
            >
              {c.resumeCta}
            </button>
          </div>
        )}
        {emailed && !onResume && (
          <p className="caption iv-resume__legal">
            {lang === "en"
              ? "We've emailed you a link to rejoin when you're ready."
              : lang === "fr"
                ? "Nous vous avons envoyé un lien par e-mail pour reprendre."
                : lang === "es"
                  ? "Te hemos enviado por correo un enlace para retomar."
                  : "Wir haben dir einen Link per E-Mail geschickt, um später fortzufahren."}
          </p>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .iv-resume { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: var(--space-8) var(--space-4); background: var(--color-surface); }
        .iv-resume__plate { width: 100%; max-width: 480px; padding: var(--space-8); border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface); text-align: left; }
        .iv-resume__head { display: grid; grid-template-columns: 28px 1fr; align-items: start; gap: var(--space-4); }
        .iv-resume__spine { display: flex; align-items: center; justify-content: center; padding-top: 2px; }
        .iv-resume__title-block { display: flex; flex-direction: column; gap: var(--space-2); }
        .iv-resume__title { letter-spacing: -0.02em; }
        .iv-resume__body { margin-top: var(--space-4); color: var(--color-text-secondary); max-width: 60ch; }
        .iv-resume__spec { margin-top: var(--space-5); max-width: 280px; }
        .iv-resume__actions { margin-top: var(--space-6); }
        .iv-resume__cta { width: 100%; }
        .iv-resume__legal { margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border-subtle); line-height: 1.55; color: var(--color-text-tertiary); }
        @media (max-width: 640px) { .iv-resume__plate { padding: var(--space-6); } }
      `,
        }}
      />
    </div>
  );
}
