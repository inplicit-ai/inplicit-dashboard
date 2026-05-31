"use client";

import { PauseIcon, PlayIcon, SquareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
 * TopBar — calm live chrome (white-modernist).
 *
 * Left: the single live disc (pulsing while running, idle while paused) beside
 * a sans tabular-nums elapsed/total clock. Center: the EU-AI-Act
 * self-identification as a quiet muted line. Right: pause/resume + end as clean
 * secondary/ghost buttons.
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
    <header className="sticky top-0 z-30 grid h-[var(--header-h)] grid-cols-[1fr_auto] items-center gap-4 border-b border-line bg-surface px-5 pt-[var(--safe-top)] md:grid-cols-[1fr_auto_1fr]">
      <div
        className="inline-flex items-center gap-2 justify-self-start text-[length:var(--text-meta)] tabular-nums text-fg-muted"
        aria-label={`${fmt(remainingS)} ${c.remaining}`}
      >
        <StatusDisc state={paused ? "idle" : "live"} size="sm" pulse={!paused} />
        <span>
          {fmt(elapsedS)} <span className="text-fg-faint">/</span> {fmt(totalS)}
        </span>
      </div>

      <span className="hidden truncate text-center text-[length:var(--text-caption)] text-fg-subtle md:block">
        {c.aiNotice}
      </span>

      <div className="inline-flex items-center gap-2 justify-self-end">
        {paused ? (
          <Button type="button" variant="outline" size="sm" onClick={onResume}>
            <PlayIcon className="h-3.5 w-3.5" /> {c.resume}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onPause}>
            <PauseIcon className="h-3.5 w-3.5" /> {c.pause}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onEnd}>
          <SquareIcon className="h-3 w-3" /> {c.end}
        </Button>
      </div>
    </header>
  );
}
