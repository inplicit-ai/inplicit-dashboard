"use client";

import { PauseIcon, PlayIcon, SquareIcon } from "lucide-react";
import { StatusDisc } from "@/components/ui/status-disc";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";

interface Props {
  lang: Lang;
  elapsedS: number;
  remainingS: number;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}

function fmt(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * TopBar — disciplined live chrome (manifesto: interview-experience).
 *
 * A tiny status spine: one StatusDisc (live + pulse while running, idle while
 * paused) sits on the spine x-axis beside a mono tabular elapsed/total clock.
 * The EU-AI-Act self-identification rides as a fixed centred eyebrow line. No
 * conic ring ornament — depth is the hairline + the mono figure.
 */
export function TopBar({
  lang,
  elapsedS,
  remainingS,
  paused,
  onPause,
  onResume,
  onEnd,
}: Props) {
  const c = roomCopy(lang);
  const totalS = elapsedS + remainingS;

  return (
    <header className="iv-topbar">
      <div className="iv-topbar__time" aria-label={`${fmt(remainingS)} ${c.remaining}`}>
        <span className="iv-topbar__spine" aria-hidden>
          <StatusDisc state={paused ? "idle" : "live"} size="sm" pulse={!paused} />
        </span>
        <span className="iv-topbar__clock">
          {fmt(elapsedS)} <span className="iv-topbar__sep">/</span> {fmt(totalS)}
        </span>
      </div>

      <span className="eyebrow iv-topbar__ai">{c.aiNotice}</span>

      <div className="iv-topbar__actions">
        {paused ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onResume}>
            <PlayIcon size={15} /> {c.resume}
          </button>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onPause}>
            <PauseIcon size={15} /> {c.pause}
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm iv-topbar__end" onClick={onEnd}>
          <SquareIcon size={14} /> {c.end}
        </button>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .iv-topbar { position: sticky; top: 0; z-index: 30; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--space-4); height: var(--header-h); padding: 0 var(--space-5); padding-top: var(--safe-top); background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
        .iv-topbar__time { display: inline-flex; align-items: center; gap: var(--space-2); justify-self: start; font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: var(--text-mono); color: var(--color-text-secondary); }
        .iv-topbar__spine { display: inline-flex; align-items: center; justify-content: center; width: 16px; }
        .iv-topbar__clock { letter-spacing: 0; }
        .iv-topbar__sep { color: var(--color-text-quaternary); }
        .iv-topbar__ai { justify-self: center; text-align: center; color: var(--color-text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .iv-topbar__ai::before { content: none; }
        .iv-topbar__actions { display: inline-flex; align-items: center; gap: var(--space-2); justify-self: end; }
        .iv-topbar__end { color: var(--color-text-secondary); }
        @media (max-width: 767px) {
          .iv-topbar { grid-template-columns: 1fr auto; }
          .iv-topbar__ai { display: none; }
        }
        @media (max-width: 640px) { .iv-topbar { padding: 0 var(--space-3); padding-top: var(--safe-top); } }
      `,
        }}
      />
    </header>
  );
}
