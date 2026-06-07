"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { matchFlow, activeStepIndex } from "@/lib/shell/flows";
import { cn } from "@/lib/utils";

/**
 * Create-flow step bar (WHY-104). Mirrors {@link CampaignTabs}: the same
 * sliding-pill aesthetic, but route-derived from the declared setup `Flow`
 * (lib/shell/flows.ts) instead of campaign section links. The active step
 * carries the moving pill; completed/upcoming steps stay quiet.
 *
 * Steps are NOT links — the create flow is linear and the chat/catalog owns
 * forward motion — so each step is a plain <span>. The active pill is a single
 * framer-motion <motion.span layoutId> (snaps under prefers-reduced-motion).
 */
export function SetupSteps() {
  const pathname = usePathname() ?? "";
  const t = useTranslations("flows.setup");
  const reduceMotion = useReducedMotion();

  const flow = matchFlow(pathname);
  if (!flow) return null;
  const active = activeStepIndex(flow, pathname);

  return (
    <div className="mb-6 overflow-x-auto scrollbar-none">
      <nav
        aria-label={t("name")}
        className="inline-flex items-center gap-1 rounded-ui border border-line-subtle bg-surface-2 p-1"
      >
        {flow.steps.map((step, i) => {
          const isActive = i === active;
          return (
            <span
              key={step.id}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "relative flex h-8 items-center whitespace-nowrap rounded-ui px-3.5 text-[length:var(--text-meta)] font-medium transition-colors",
                isActive ? "text-fg" : "text-fg-muted",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={reduceMotion ? undefined : "setup-step-pill"}
                  aria-hidden
                  className="absolute inset-0 rounded-ui bg-surface shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{t(step.labelKey)}</span>
            </span>
          );
        })}
      </nav>
    </div>
  );
}
