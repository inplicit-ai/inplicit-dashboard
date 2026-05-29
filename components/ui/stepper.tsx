import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Stepper — thin React wrapper over the canonical `.shell-stepper` CSS in
 * design.css (markers 20px, near-black when complete, accent when current,
 * connector line between steps). Server-safe.
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

function resolveState(
  index: number,
  activeIndex: number,
): StepState {
  if (index < activeIndex) return "complete";
  if (index === activeIndex) return "current";
  return "upcoming";
}

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
                {state === "complete" ? "✓" : i + 1}
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
