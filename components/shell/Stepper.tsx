"use client";

import { useTranslations } from "next-intl";
import { activeStepIndex, type Flow } from "@/lib/shell/flows";
import { IconCheck } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Route-derived step indicator (02 §4). Renders only for declared flows.
 *
 * Design (01): accent on the ACTIVE marker only; completed steps filled
 * near-black; future steps hairline. On phone it collapses to a compact
 * "N / total" pill.
 */
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
                {state === "complete" ? <IconCheck size={11} /> : i + 1}
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
