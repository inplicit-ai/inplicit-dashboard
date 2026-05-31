"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// Lazy-load the OGL/WebGL orb — heavy, client-only, mounted only in voice mode
// (doc 04 §5.5 / 01 principle 9: no eager WebGL). SSR disabled.
const AgentOrb = dynamic(
  () => import("@/components/AgentOrb").then((m) => m.AgentOrb),
  { ssr: false, loading: () => null },
);

interface Props {
  size: number;
  /** Polled each frame; returns 0..1 audio/VAD level. */
  getLevel: () => number;
  hue?: number;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

function useWebGLSupported(): boolean {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      setOk(!!gl);
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

/**
 * Voice orb wrapper. Renders the WebGL `AgentOrb` when motion is allowed and
 * WebGL is available; otherwise a lightweight CSS ring that scales with the
 * VAD/audio level — same visual language, no GPU, no animation loop beyond a
 * cheap rAF that respects reduced-motion.
 */
export function VoiceOrb({ size, getLevel, hue = 28 }: Props) {
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGLSupported();

  if (!reduced && webgl) {
    return <AgentOrb size={size} hue={hue} getLevel={getLevel} />;
  }
  return <CssOrb size={size} getLevel={getLevel} reduced={reduced} />;
}

/** No-WebGL / reduced-motion fallback: a concentric ring scaled by level. */
function CssOrb({
  size,
  getLevel,
  reduced,
}: {
  size: number;
  getLevel: () => number;
  reduced: boolean;
}) {
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Reduced-motion: read the level but don't animate transform — only set a
    // static state. Otherwise drive a single rAF that scales the ring.
    if (reduced) {
      const el = ringRef.current;
      if (el) el.style.setProperty("--lvl", "0.2");
      return;
    }
    let raf = 0;
    const tick = () => {
      const lvl = Math.max(0, Math.min(1, getLevel()));
      ringRef.current?.style.setProperty("--lvl", lvl.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevel, reduced]);

  return (
    <div
      ref={ringRef}
      className="iv-cssorb"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="iv-cssorb__core" />
      <span className="iv-cssorb__ring" />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Braun fallback: a flat accent disc on a hairline ring — no gradient,
           no glow. The disc is the lone accent (live), scaled by VAD level. */
        .iv-cssorb { --lvl: 0; position: relative; display: grid; place-items: center; }
        .iv-cssorb__core {
          width: 38%; height: 38%; border-radius: 50%;
          background: var(--color-accent);
          opacity: calc(0.6 + var(--lvl) * 0.4);
          transition: transform 0.08s linear, opacity 0.12s linear;
          transform: scale(calc(1 + var(--lvl) * 0.18));
        }
        .iv-cssorb__ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1px solid var(--color-accent-muted);
          transform: scale(calc(0.72 + var(--lvl) * 0.28));
          opacity: calc(0.3 + var(--lvl) * 0.35);
          transition: transform 0.08s linear, opacity 0.12s linear;
        }
        @media (prefers-reduced-motion: reduce) {
          .iv-cssorb__core, .iv-cssorb__ring { transition: none; }
        }
      `,
        }}
      />
    </div>
  );
}
