import * as React from "react";

import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Stepper — the setup progress spine, white-modernist.
 *
 * A calm horizontal row of StatusDisc markers joined by a solid hairline rule
 * (no dashed "spine"): complete steps carry the ink `done` disc, the current
 * step is the lone amber `live` pulse, upcoming steps are hollow `idle` rings —
 * the shared status lexicon. Labels are quiet sans; the current label is
 * emphasised. Server-safe (the pulse is pure CSS).
 *
 * Drives state from a `steps` array + `currentId` (or `currentIndex`). The
 * public prop contract is unchanged.
 * ────────────────────────────────────────────────────────────────────────── */

export type StepperStep = {
  id: string;
  label: string;
};

type StepState = "complete" | "current" | "upcoming";

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: StepperStep[];
  /** Active step id. Takes precedence over currentIndex when provided. */
  currentId?: string;
  /** Active step index (fallback when currentId is omitted). */
  currentIndex?: number;
  /** compact hides labels for non-current steps (topbar-friendly). */
  variant?: "default" | "compact";
}

function resolveState(index: number, activeIndex: number): StepState {
  if (index < activeIndex) return "complete";
  if (index === activeIndex) return "current";
  return "upcoming";
}

/** step state → the shared StatusDisc lexicon. */
const STEP_DISC = {
  complete: "done",
  current: "live",
  upcoming: "idle",
} as const;

export function Stepper({
  steps,
  currentId,
  currentIndex,
  variant = "default",
  className,
  ...props
}: StepperProps) {
  const activeIndex =
    currentId != null
      ? Math.max(
          0,
          steps.findIndex((s) => s.id === currentId),
        )
      : (currentIndex ?? 0);

  return (
    <ol
      className={cn("flex w-full items-center gap-2", className)}
      {...props}
    >
      {steps.map((step, i) => {
        const state = resolveState(i, activeIndex);
        const showLabel = variant === "default" || state === "current";
        const isLast = i === steps.length - 1;
        return (
          <React.Fragment key={step.id}>
            <li
              className="flex shrink-0 items-center gap-2"
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="grid size-4 place-items-center">
                <StatusDisc state={STEP_DISC[state]} />
              </span>
              {showLabel && (
                <span
                  className={cn(
                    "text-[length:var(--text-meta)] leading-none whitespace-nowrap transition-colors",
                    state === "current"
                      ? "font-medium text-fg"
                      : state === "complete"
                        ? "text-fg-muted"
                        : "text-fg-subtle",
                  )}
                >
                  {step.label}
                </span>
              )}
            </li>
            {!isLast && (
              <span
                aria-hidden
                className="h-px min-w-4 flex-1 bg-line-subtle"
              />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
