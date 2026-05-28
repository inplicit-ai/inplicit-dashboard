"use client";

import type { Lang } from "./copy";
import { LANG_FLAG, LANG_NATIVE, SUPPORTED_LANGS } from "./copy";

interface Props {
  value: Lang;
  onChange: (lang: Lang) => void;
  label: string;
  disabled?: boolean;
}

/**
 * Pre-call language select (doc 04 §6). Native-name list gated to the
 * languages the current STT+TTS pair supports. The participant sets this
 * before Start; it rebuilds STT/TTS/prompt server-side.
 */
export function LanguagePicker({ value, onChange, label, disabled }: Props) {
  return (
    <fieldset className="iv-langpick" disabled={disabled}>
      <legend className="iv-langpick__label">{label}</legend>
      <div className="iv-langpick__grid" role="radiogroup" aria-label={label}>
        {SUPPORTED_LANGS.map((lang) => (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={value === lang}
            onClick={() => onChange(lang)}
            className={`iv-langpick__opt ${value === lang ? "iv-langpick__opt--on" : ""}`}
          >
            <span className="iv-langpick__flag" aria-hidden>
              {LANG_FLAG[lang]}
            </span>
            {LANG_NATIVE[lang]}
          </button>
        ))}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .iv-langpick { border: 0; padding: 0; margin: 0; }
        .iv-langpick__label { font-size: var(--text-caption); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: var(--space-2); }
        .iv-langpick__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2); }
        .iv-langpick__opt { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-card); border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text-primary); font-size: var(--text-body-sm); cursor: pointer; transition: border-color 0.15s var(--ease-smooth); }
        .iv-langpick__opt:hover { border-color: var(--color-text-secondary); }
        .iv-langpick__opt--on { border-color: var(--color-accent); box-shadow: inset 0 0 0 1px var(--color-accent); }
        .iv-langpick__opt:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
        .iv-langpick__flag { font-size: 16px; line-height: 1; }
      `,
        }}
      />
    </fieldset>
  );
}
