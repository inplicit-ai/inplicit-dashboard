"use client";

import { PauseIcon, PlayIcon, SquareIcon } from "lucide-react";
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

/** Top bar: length ring (elapsed/total), pause/resume, end (doc 04 §5.1/5.2). */
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
  const pct = totalS > 0 ? Math.min(100, (elapsedS / totalS) * 100) : 0;

  return (
    <header className="iv-topbar">
      <div className="iv-topbar__time" aria-label={`${fmt(remainingS)} ${c.remaining}`}>
        <span
          className="iv-ring"
          style={{ ["--pct" as string]: `${pct}` }}
          aria-hidden
        />
        <span className="iv-topbar__clock">
          {fmt(elapsedS)} <span className="iv-topbar__sep">/</span> {fmt(totalS)}
        </span>
      </div>

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
        .iv-topbar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); height: var(--header-h); padding: 0 var(--space-5); padding-top: var(--safe-top); background: var(--color-surface); border-bottom: 1px solid var(--color-border-subtle); }
        .iv-topbar__time { display: inline-flex; align-items: center; gap: var(--space-2); font-variant-numeric: tabular-nums; font-size: var(--text-body-sm); color: var(--color-text-secondary); }
        .iv-topbar__clock { letter-spacing: 0.01em; }
        .iv-topbar__sep { color: var(--color-text-quaternary); }
        .iv-ring { width: 16px; height: 16px; border-radius: 50%; background: conic-gradient(var(--color-accent) calc(var(--pct) * 1%), var(--color-border) 0); -webkit-mask: radial-gradient(circle, transparent 5px, #000 6px); mask: radial-gradient(circle, transparent 5px, #000 6px); }
        .iv-topbar__actions { display: inline-flex; align-items: center; gap: var(--space-2); }
        .iv-topbar__end { color: var(--color-text-secondary); }
        @media (max-width: 640px) { .iv-topbar { padding: 0 var(--space-3); padding-top: var(--safe-top); } }
      `,
        }}
      />
    </header>
  );
}
