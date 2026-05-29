"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Controls the first-visit guided overview (O-10, doc 02 §7).
 *
 * - Auto-opens once when `completedAt` is null (first visit).
 * - Persists completion/skip via POST /api/me/tour-complete (through the /dapi
 *   same-origin proxy). A failed persist is logged but never blocks the UI;
 *   the local `seen` guard still prevents an immediate re-open this session.
 * - Listens for a global `inplicit:replay-tour` event so the "Replay tour"
 *   entry in the user menu can re-launch it without prop drilling.
 */

export const REPLAY_TOUR_EVENT = "inplicit:replay-tour";

/** Fire from anywhere (e.g. user menu) to re-open the tour. */
export function replayTour(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REPLAY_TOUR_EVENT));
  }
}

async function persistTourComplete(): Promise<void> {
  try {
    const res = await fetch("/dapi/me/tour-complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) {
      console.error(`[tour] persist failed: HTTP ${res.status}`);
    }
  } catch (e) {
    console.error(`[tour] persist failed: ${(e as Error).message}`);
  }
}

export function useGuidedTour({
  enabled,
  completedAt,
}: {
  enabled: boolean;
  completedAt: string | null;
}): { open: boolean; close: (completed: boolean) => void } {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);

  // First visit → auto-open after mount (gives the shell DOM time to settle so
  // anchors are queryable). Skipped entirely if already completed or disabled.
  useEffect(() => {
    if (!enabled || completedAt || seen) return;
    const id = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(id);
  }, [enabled, completedAt, seen]);

  // Replay from the user menu, regardless of completion state.
  useEffect(() => {
    if (!enabled) return;
    const onReplay = () => setOpen(true);
    window.addEventListener(REPLAY_TOUR_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_TOUR_EVENT, onReplay);
  }, [enabled]);

  const close = useCallback((completed: boolean) => {
    setOpen(false);
    setSeen(true);
    // Both "finished" and "skip" mark the tour as seen so it won't auto-open
    // again (doc 02 §7: "Skip tour" sets it immediately).
    void persistTourComplete();
    void completed;
  }, []);

  return { open, close };
}
