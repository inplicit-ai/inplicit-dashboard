"use client";

import { useTranslations } from "next-intl";
import { activeStepIndex, type Flow } from "@/lib/shell/flows";
import { StatusDisc, type StatusState } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/**
 * Route-derived step indicator (02 §4). Renders only for declared flows.
 *
 * Re-skinned onto the agent-plan status spine: each step is a StatusDisc
 * (done · live · idle) threaded by the shared dashed connector — the SAME
 * vocabulary the synthesis pipeline and every ledger row speak. Accent rides
 * the one live (current) disc only. On phone it collapses to a compact
 * "N / total" pill.
 */
const STEP_STATE: Record<"complete" | "current" | "upcoming", StatusState> = {
  complete: "done",
  current: "live",
  upcoming: "idle",
};

export function Stepper({ flow, pathname }: { flow: Flow; pathname: string }) {
  const t = useTranslations(`flows.${flow.id}`);
  const tFlows = useTranslations("flows");
  const active = activeStepIndex(flow, pathname);
  const total = flow.steps.length;

  return (
    <>
      {/* Compact pill — phone only. */}
      <span
        className="shell-stepper-pill md:hidden"
        aria-label={tFlows("stepLabel", { current: active + 1, total })}
      >
        {active + 1} / {total}
      </span>

      {/* Full stepper — md and up. */}
      <ol
        className="shell-stepper hidden md:flex"
        aria-label={t("name")}
        data-tour="topbar-stepper"
      >
        {flow.steps.map((step, i) => {
          const state =
            i < active ? "complete" : i === active ? "current" : "upcoming";
          return (
            <li key={step.id} className="shell-stepper__step" data-state={state}>
              <span className="shell-stepper__marker" aria-hidden="true">
                <StatusDisc state={STEP_STATE[state]} size="sm" />
              </span>
              <span
                className={cn(
                  "shell-stepper__label",
                  state === "current" && "shell-stepper__label--current",
                )}
              >
                {t(step.labelKey)}
              </span>
              {i < total - 1 && (
                <span className="shell-stepper__line" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
