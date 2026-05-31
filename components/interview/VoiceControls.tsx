"use client";

import { MessageSquareIcon, MicIcon, MicOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";

interface Props {
  lang: Lang;
  muted: boolean;
  onToggleMute: () => void;
  onSwitchToChat: () => void;
}

/**
 * Voice on/off (mute) + mode toggle voice⟷chat (white-modernist). The round mic
 * control is a clean hairline disc on white; muted dims to the soft surface.
 * Amber appears only on the focus ring. Mute keeps the local VAD running for
 * instant un-mute; no audio leaves the device while muted.
 */
export function VoiceControls({ lang, muted, onToggleMute, onSwitchToChat }: Props) {
  const c = roomCopy(lang);
  return (
    <div className="inline-flex items-center gap-4">
      <button
        type="button"
        onClick={onToggleMute}
        aria-pressed={muted}
        aria-label={muted ? c.voiceOff : c.voiceOn}
        title={muted ? c.voiceOff : c.voiceOn}
        className={cn(
          "inline-grid h-14 w-14 place-items-center rounded-full border bg-surface text-fg shadow-sm transition-[background-color,border-color,color,box-shadow] duration-150",
          "hover:border-line-strong hover:bg-surface-2",
          "focus-visible:border-accent focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none",
          muted
            ? "border-line-strong bg-surface-2 text-fg-subtle"
            : "border-line",
        )}
      >
        {muted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
      </button>

      <Button type="button" variant="outline" size="sm" onClick={onSwitchToChat}>
        <MessageSquareIcon className="h-3.5 w-3.5" /> {c.toChat}
      </Button>
    </div>
  );
}
