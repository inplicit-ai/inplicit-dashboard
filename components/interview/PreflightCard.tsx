"use client";

import { StatusDisc } from "@/components/ui/status-disc";
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
 * PreflightCard — the pre-call instrument plate (doc 04 §5).
 *
 * A calm 68ch reading card: folio eyebrow + title, language confirm, the
 * EU-AI-Act self-identification as a hairline note carrying the one live disc
 * (this is the AI signal), then a near-black primary CTA. No tinted icon
 * avatar, no glow — depth is the hairline + surface step.
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
    <div className="iv-pf">
      <div className="iv-pf__plate">
        <span className="eyebrow">{c.preflightEyebrow}</span>
        <h1 className="title iv-pf__title">{c.preflightTitle}</h1>
        <p className="body-lg iv-pf__body">{c.preflightBody}</p>

        <div className="iv-pf__lang">
          <LanguagePicker
            value={lang}
            onChange={onLangChange}
            label={c.languageLabel}
            disabled={langLocked}
          />
        </div>

        <div className="iv-pf__notice" role="note">
          <span className="iv-pf__notice-disc" aria-hidden>
            <StatusDisc state="live" size="sm" />
          </span>
          <span>{c.aiNotice}</span>
        </div>

        {errorMsg && <div className="flash flash--err iv-pf__flash">{errorMsg}</div>}

        <div className="iv-pf__actions">
          <button
            type="button"
            onClick={onStartVoice}
            disabled={!ready}
            className="btn btn--primary btn--lg iv-pf__cta"
          >
            {ready ? c.start : c.connecting}
          </button>
          <button
            type="button"
            onClick={onPreferText}
            disabled={!ready}
            className="btn btn--link iv-pf__alt"
          >
            {c.preferText}
          </button>
        </div>

        <p className="caption iv-pf__legal">{c.micNotice}</p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .iv-pf { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: var(--space-8) var(--space-4); background: var(--color-surface); }
        .iv-pf__plate { width: 100%; max-width: 480px; padding: var(--space-8); border: 1px solid var(--color-border); border-radius: var(--radius-card); background: var(--color-surface); text-align: left; }
        .iv-pf__title { margin-top: var(--space-3); letter-spacing: -0.02em; }
        .iv-pf__body { margin-top: var(--space-3); color: var(--color-text-secondary); max-width: 60ch; }
        .iv-pf__lang { margin-top: var(--space-6); }
        .iv-pf__notice { margin-top: var(--space-5); display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-ui); font-size: var(--text-body-sm); line-height: 1.55; color: var(--color-text-secondary); }
        .iv-pf__notice-disc { display: inline-flex; align-items: center; padding-top: 5px; }
        .iv-pf__flash { margin-top: var(--space-5); }
        .iv-pf__actions { margin-top: var(--space-6); display: flex; flex-direction: column; gap: var(--space-3); }
        .iv-pf__cta { width: 100%; }
        .iv-pf__alt { align-self: center; font-size: var(--text-meta); }
        .iv-pf__legal { margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border-subtle); line-height: 1.55; color: var(--color-text-tertiary); }
        @media (max-width: 640px) { .iv-pf__plate { padding: var(--space-6); } }
      `,
        }}
      />
    </div>
  );
}
