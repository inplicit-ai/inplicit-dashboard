"use client";

import { MicIcon } from "lucide-react";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";
import { LanguagePicker } from "./LanguagePicker";

interface Props {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  langLocked: boolean;
  ready: boolean;
  errorMsg: string | null;
  onStartVoice: () => void;
  onPreferText: () => void;
}

/**
 * Pre-call card (doc 04 §5 PreflightCard): language confirm, AI
 * self-identification notice (EU AI Act), mic notice, Start. The participant
 * sets the language here; it's locked at start (doc 04 §10 default).
 */
export function PreflightCard({
  lang,
  onLangChange,
  langLocked,
  ready,
  errorMsg,
  onStartVoice,
  onPreferText,
}: Props) {
  const c = roomCopy(lang);
  return (
    <div className="iv-center">
      <div className="card iv-card">
        <span
          className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent"
          aria-hidden
        >
          <MicIcon size={20} strokeWidth={2} />
        </span>
        <span className="eyebrow iv-card__eyebrow">{c.preflightEyebrow}</span>
        <h1 className="headline iv-card__title">{c.preflightTitle}</h1>
        <p className="page-header__meta iv-card__body">{c.preflightBody}</p>

        <div className="iv-card__lang">
          <LanguagePicker
            value={lang}
            onChange={onLangChange}
            label={c.languageLabel}
            disabled={langLocked}
          />
        </div>

        <div className="iv-card__notice" role="note">
          <span className="iv-card__notice-dot" aria-hidden />
          <span>{c.aiNotice}</span>
        </div>

        {errorMsg && <div className="flash flash--err iv-card__flash">{errorMsg}</div>}

        <div className="iv-card__actions">
          <button
            type="button"
            onClick={onStartVoice}
            disabled={!ready}
            className="btn btn--primary btn--lg iv-card__cta"
          >
            {ready ? c.start : c.connecting}
          </button>
          <button
            type="button"
            onClick={onPreferText}
            disabled={!ready}
            className="btn btn--link iv-card__alt"
          >
            {c.preferText}
          </button>
        </div>

        <p className="caption iv-card__legal">{c.micNotice}</p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .iv-card__lang { margin-top: var(--space-6); }
        .iv-card__notice { margin-top: var(--space-5); display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid var(--color-accent-muted); background: var(--color-accent-soft); border-radius: var(--radius-card); font-size: var(--text-body-sm); line-height: 1.55; color: var(--color-text-primary); }
        .iv-card__notice-dot { flex: 0 0 auto; width: 7px; height: 7px; margin-top: 7px; border-radius: 50%; background: var(--color-accent); }
      `,
        }}
      />
    </div>
  );
}
