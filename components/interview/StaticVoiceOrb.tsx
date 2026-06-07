import { cn } from "@/lib/utils";

interface Props {
  size: number;
  className?: string;
}

/**
 * StaticVoiceOrb — the interview-room voice-orb visual vocabulary, frozen.
 *
 * Shares the exact Braun fallback language of `VoiceOrb`'s CssOrb (a flat amber
 * disc resting on a hairline ring, the lone accent = live) but with NO rAF, NO
 * WebGL, NO animation loop. It is purely presentational: a calm, still emblem
 * of the voice affordance for surfaces where voice is not (yet) wired — e.g. the
 * coming-soon voice control in the setup room. Server-safe (no "use client").
 */
export function StaticVoiceOrb({ size, className }: Props) {
  return (
    <span
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Hairline ring — the calm boundary, scaled in like the live orb at rest. */}
      <span
        className="absolute rounded-full border"
        style={{
          inset: 0,
          transform: "scale(0.72)",
          borderColor: "var(--color-accent-muted)",
          opacity: 0.4,
        }}
      />
      {/* Flat accent core — the lone amber, dimmed to read as "asleep". */}
      <span
        className="rounded-full"
        style={{
          width: "38%",
          height: "38%",
          background: "var(--color-accent)",
          opacity: 0.55,
        }}
      />
    </span>
  );
}
