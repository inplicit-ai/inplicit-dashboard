import * as React from "react";

import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Stepper — the setup spine, in the agent-plan status vocabulary.
 *
 * Re-skinned onto StatusDisc + the dashed connector (the `.shell-stepper` CSS
 * is now just a centering slot for the disc): complete steps carry the ink
 * `done` disc, the current step is the lone amber `live` pulse, upcoming steps
 * are hollow `idle` rings — the exact same lexicon used on every LedgerRow and
 * the synthesis pipeline. The connector between markers is the shared dashed
 * line. Server-safe (the pulse is pure CSS).
 *
 * Drives state from a `steps` array + `currentId` (or `currentIndex`).
 *
 * See docs/plans/overhaul/design-contract.md §9.
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
    <ol className={cn("shell-stepper", className)} {...props}>
      {steps.map((step, i) => {
        const state = resolveState(i, activeIndex);
        const showLabel = variant === "default" || state === "current";
        const isLast = i === steps.length - 1;
        return (
          <React.Fragment key={step.id}>
            <li
              className="shell-stepper__step"
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="shell-stepper__marker">
                <StatusDisc state={STEP_DISC[state]} />
              </span>
              {showLabel && (
                <span
                  className={cn(
                    "shell-stepper__label",
                    state === "current" && "shell-stepper__label--current",
                  )}
                >
                  {step.label}
                </span>
              )}
            </li>
            {!isLast && <span aria-hidden className="shell-stepper__line" />}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
