"use client";

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
 * Paused / resumable state (doc 04 §7.5). Shows "Welcome back — you were N
 * minutes in" and either a Resume CTA or a note that a resume link was emailed.
 */
export function ResumeView({ lang, elapsedS, onResume, emailed }: Props) {
  const c = roomCopy(lang);
  const mins = Math.round(elapsedS / 60);
  return (
    <div className="iv-center">
      <div className="card iv-card">
        <span className="eyebrow" style={{ color: "var(--color-accent)" }}>
          {c.resumeEyebrow}
        </span>
        <h1 className="headline iv-card__title">{c.resumeTitle}</h1>
        <p className="page-header__meta iv-card__body">{c.resumeBody(mins)}</p>

        {onResume && (
          <div className="iv-card__actions">
            <button
              type="button"
              onClick={onResume}
              className="btn btn--primary btn--lg iv-card__cta"
            >
              {c.resumeCta}
            </button>
          </div>
        )}
        {emailed && !onResume && (
          <p className="caption iv-card__legal">
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
    </div>
  );
}
