"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TOUR_STEPS, TOUR_TOTAL, type TourStep } from "@/lib/shell/tour-steps";

/**
 * First-visit guided overview (O-10, doc 02 §7).
 *
 * A hand-rolled, dependency-free spotlight tour: a dimmed full-window scrim
 * with a rounded cut-out around the active `data-tour` anchor and a hairline
 * info card. Unobtrusive, skippable, and `prefers-reduced-motion` aware.
 *
 * Persistence is owned by the caller: this component renders only when
 * `open` is true and reports completion/skip via `onClose`. The shell gates
 * on `users.onboarding_tour_completed_at` and POSTs /api/me/tour-complete.
 */

const PADDING = 8; // cut-out padding around the anchor rect
const CARD_GAP = 14; // gap between cut-out and card
const ANCHOR_TIMEOUT_MS = 1200; // give up waiting for an anchor → skip step

type Rect = { top: number; left: number; width: number; height: number };

interface TourState {
  index: number;
}

type Action = { type: "NEXT" } | { type: "BACK" } | { type: "GOTO"; index: number };

function reducer(state: TourState, action: Action): TourState {
  switch (action.type) {
    case "NEXT":
      return { index: Math.min(state.index + 1, TOUR_TOTAL - 1) };
    case "BACK":
      return { index: Math.max(state.index - 1, 0) };
    case "GOTO":
      return { index: Math.max(0, Math.min(action.index, TOUR_TOTAL - 1)) };
    default:
      return state;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Poll for the anchor element until it mounts or we time out. */
function waitForAnchor(
  anchor: string,
  signal: { cancelled: boolean },
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      if (signal.cancelled) return resolve(null);
      const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
      if (el && el.offsetParent !== null) return resolve(el);
      if (performance.now() - start > ANCHOR_TIMEOUT_MS) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export function GuidedTour({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (completed: boolean) => void;
}) {
  const t = useTranslations("tour");
  const router = useRouter();
  const pathname = usePathname();
  const [state, dispatch] = useReducer(reducer, { index: 0 });
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const reduced = useRef(false);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    reduced.current = prefersReducedMotion();
  }, []);

  const step: TourStep | undefined = open ? TOUR_STEPS[state.index] : undefined;

  // Resolve the anchor for the active step: route-push if needed, wait for the
  // element, measure it. Centered steps (anchor=null) just clear the rect.
  useEffect(() => {
    if (!open || !step) return;
    const signal = { cancelled: false };
    targetRef.current = null;

    async function resolve(s: TourStep) {
      if (s.route && pathname !== s.route) {
        router.push(s.route);
      }
      if (!s.anchor) {
        setRect(null);
        return;
      }
      const el = await waitForAnchor(s.anchor, signal);
      if (signal.cancelled) return;
      if (!el) {
        // Anchor missing on this breakpoint/route → skip forward unobtrusively.
        setRect(null);
        return;
      }
      targetRef.current = el;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    resolve(step);
    return () => {
      signal.cancelled = true;
    };
  }, [open, step, pathname, router]);

  // Keep the cut-out aligned on scroll/resize.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = targetRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, state.index]);

  const finish = useCallback(() => onClose(true), [onClose]);
  const skip = useCallback(() => onClose(false), [onClose]);

  const isLast = state.index === TOUR_TOTAL - 1;
  const next = useCallback(() => {
    if (isLast) finish();
    else dispatch({ type: "NEXT" });
  }, [isLast, finish]);

  // Keyboard: Esc skips, Enter/→ advances, ← goes back.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") dispatch({ type: "BACK" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, skip]);

  if (!open || !mounted || !step) return null;

  const cutout: Rect | null = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  const cardStyle = computeCardStyle(cutout, step.placement);
  const transition = reduced.current ? "none" : "all 180ms cubic-bezier(0.22,1,0.36,1)";

  return createPortal(
    <div
      className="tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("ariaLabel")}
      data-tour-active="true"
    >
      {/* Dimmed scrim. With a cut-out we use a giant box-shadow ring so the
          anchor stays interactive-looking while the rest is dimmed. */}
      {cutout ? (
        <div
          className="tour-spotlight"
          style={{
            position: "fixed",
            top: cutout.top,
            left: cutout.left,
            width: cutout.width,
            height: cutout.height,
            borderRadius: 12,
            boxShadow: "0 0 0 9999px rgba(10,10,10,0.55)",
            transition,
            pointerEvents: "none",
          }}
        />
      ) : (
        <div
          className="tour-scrim"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,10,10,0.55)",
          }}
          onClick={skip}
        />
      )}

      <div className="tour-card" style={{ ...cardStyle, transition }}>
        <div className="tour-card__eyebrow">
          <span
            className="status-disc status-disc--sm status-disc--live status-disc--pulse"
            aria-hidden="true"
          />
          {t("progress", { current: state.index + 1, total: TOUR_TOTAL })}
        </div>
        <h2 className="tour-card__title">{t(`step.${step.key}.title`)}</h2>
        <p className="tour-card__body">{t(`step.${step.key}.body`)}</p>
        <div className="tour-card__actions">
          <button type="button" className="tour-card__skip" onClick={skip}>
            {t("skip")}
          </button>
          <div className="tour-card__nav">
            {state.index > 0 && (
              <button
                type="button"
                className="tour-card__back"
                onClick={() => dispatch({ type: "BACK" })}
              >
                {t("back")}
              </button>
            )}
            <button type="button" className="tour-card__next" onClick={next}>
              {isLast ? t("finish") : t("next")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Position the info card next to the cut-out, clamped to the viewport. */
function computeCardStyle(
  cutout: Rect | null,
  placement: TourStep["placement"],
): React.CSSProperties {
  const CARD_W = 320;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  if (!cutout || placement === "center" || vw < 640) {
    return {
      position: "fixed",
      left: "50%",
      bottom: vw < 640 ? 16 : "50%",
      transform: vw < 640 ? "translateX(-50%)" : "translate(-50%, 50%)",
      width: `min(${CARD_W}px, calc(100vw - 32px))`,
    };
  }

  let left: number;
  let top: number;
  switch (placement) {
    case "left":
      left = cutout.left - CARD_W - CARD_GAP;
      top = cutout.top;
      break;
    case "top":
      left = cutout.left;
      top = cutout.top - CARD_GAP - 160;
      break;
    case "bottom":
      left = cutout.left;
      top = cutout.top + cutout.height + CARD_GAP;
      break;
    case "right":
    default:
      left = cutout.left + cutout.width + CARD_GAP;
      top = cutout.top;
      break;
  }

  // Clamp into the viewport with a 16px margin.
  left = Math.max(16, Math.min(left, vw - CARD_W - 16));
  top = Math.max(16, Math.min(top, vh - 200));

  return { position: "fixed", left, top, width: CARD_W };
}
