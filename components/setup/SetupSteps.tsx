"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { matchFlow, activeStepIndex } from "@/lib/shell/flows";
import { cn } from "@/lib/utils";

/**
 * Extract the draftId from a pathname like /campaigns/new/<draftId>[/review].
 * Returns null when still on the launchpad (/campaigns/new).
 */
function extractDraftId(pathname: string): string | null {
  const m = pathname.match(/^\/campaigns\/new\/([^/]+)/);
  return m ? m[1] : null;
}

/**
 * Resolve the href for a given step index, given the current pathname.
 * All steps (including upcoming ones) are navigable links once a draftId
 * exists, so users can jump ahead to Prüfen/Starten at any time and see the
 * current state of the draft (orange gates for missing fields). The active step
 * itself is a link too so the pill is still rendered but the step is not
 * disabled.
 *
 * Step 3 (Starten) has no dedicated route — it fires from the review screen —
 * so it never returns a link.
 */
function hrefForStep(i: number, _active: number, pathname: string): string | null {
  const draftId = extractDraftId(pathname);
  if (i === 0) return "/campaigns/new"; // Aufbauen — always reachable
  if (i === 1 && draftId) return `/campaigns/new/${draftId}`; // Konfigurieren
  if (i === 2 && draftId) return `/campaigns/new/${draftId}/review`; // Prüfen
  // Step 3 (Starten) fires from the review screen, no route.
  return null;
}

/**
 * Create-flow step bar (WHY-104). Steps that have already been completed are
 * rendered as links so the user can navigate back; the active step shows the
 * sliding pill; upcoming steps are plain text.
 */
export function SetupSteps() {
  const pathname = usePathname() ?? "";
  const t = useTranslations("flows.setup");
  const reduceMotion = useReducedMotion();

  const flow = matchFlow(pathname);
  if (!flow) return null;
  const active = activeStepIndex(flow, pathname);

  return (
    <div className="-mt-1 mb-6 overflow-x-auto scrollbar-none">
      <nav
        aria-label={t("name")}
        className="inline-flex items-center gap-1 rounded-ui border border-line-subtle bg-surface-2 p-1"
      >
        {flow.steps.map((step, i) => {
          const isActive = i === active;
          const href = hrefForStep(i, active, pathname);
          const content = (
            <>
              {isActive && (
                <motion.span
                  layoutId={reduceMotion ? undefined : "setup-step-pill"}
                  aria-hidden
                  className="absolute inset-0 rounded-ui bg-surface shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{t(step.labelKey)}</span>
            </>
          );

          const baseClass = cn(
            "relative flex h-8 items-center whitespace-nowrap rounded-ui px-3.5 text-[length:var(--text-meta)] font-medium transition-colors",
            isActive
              ? "text-fg"
              : href
                ? "text-fg-muted hover:text-fg"
                : "text-fg-faint cursor-default",
          );

          if (href) {
            return (
              <Link key={step.id} href={href} className={baseClass}>
                {content}
              </Link>
            );
          }

          return (
            <span key={step.id} aria-current={isActive ? "step" : undefined} className={baseClass}>
              {content}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
