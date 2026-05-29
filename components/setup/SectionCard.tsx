"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Shared catalog-section card (doc 03 §4, design-contract §2). One file so every
 * section — including the O-5 audience/schedule/email sections — renders
 * identically: design.css `.card` recipe (surface + single hairline + radius +
 * dark-only elevation), a section eyebrow, and a fading "updated by assistant"
 * accent pill when an agent tool just touched it.
 *
 * Motion: a tasteful Apple-eased reveal on mount (gated behind
 * prefers-reduced-motion), matching the agent-plan aesthetic.
 */
export function SectionCard({
  title,
  description,
  action,
  touched,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  touched?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("setup.catalog");
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0.65, 0.3, 0.9] }}
      className={cn("card card--compact gap-4", className)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-[13px] font-semibold leading-tight tracking-[-0.01em] text-fg">
            {title}
          </h3>
          {description ? (
            <p className="text-xs leading-snug text-fg-subtle">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {touched ? (
            <motion.span
              initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              className="badge badge--live whitespace-nowrap uppercase"
            >
              <span className="status-disc status-disc--sm status-disc--live status-disc--pulse" />
              {t("updatedByAgent")}
            </motion.span>
          ) : null}
        </div>
      </header>
      {children}
    </motion.section>
  );
}
