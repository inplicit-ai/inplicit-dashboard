"use client";

import { MessageSquareIcon, MicIcon, MicOffIcon } from "lucide-react";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";

interface Props {
  lang: Lang;
  muted: boolean;
  onToggleMute: () => void;
  onSwitchToChat: () => void;
}

/**
 * Voice on/off (mute) + mode toggle voice⟷chat (doc 04 §5.4). Mute keeps the
 * local VAD running for instant un-mute; no audio leaves the device while muted
 * (enforced in `useMicVad.setMuted`).
 */
export function VoiceControls({ lang, muted, onToggleMute, onSwitchToChat }: Props) {
  const c = roomCopy(lang);
  return (
    <div className="iv-controls">
      <button
        type="button"
        onClick={onToggleMute}
        className={`iv-ctrl ${muted ? "iv-ctrl--off" : ""}`}
        aria-pressed={muted}
        aria-label={muted ? c.voiceOff : c.voiceOn}
        title={muted ? c.voiceOff : c.voiceOn}
      >
        {muted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
      </button>
      <button
        type="button"
        onClick={onSwitchToChat}
        className="btn btn--ghost btn--sm iv-controls__chat"
      >
        <MessageSquareIcon size={15} /> {c.toChat}
      </button>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .iv-controls { display: inline-flex; align-items: center; gap: var(--space-3); }
        .iv-ctrl { display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: var(--radius-full); border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-text-primary); cursor: pointer; transition: border-color 0.15s var(--ease-smooth), background 0.15s var(--ease-smooth); }
        .iv-ctrl:hover { border-color: var(--color-text-primary); }
        .iv-ctrl:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
        .iv-ctrl--off { color: var(--color-text-tertiary); background: var(--color-surface-2); }
        @media (max-width: 640px) { .iv-ctrl { width: 56px; height: 56px; } }
      `,
        }}
      />
    </div>
  );
}
