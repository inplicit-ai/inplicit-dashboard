"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/**
 * Catalog section break — re-cut from a rounded card into a Braun FOLIO.
 *
 * The stack-of-cards is gone. A section is now a full-bleed hairline rule with
 * a tracked-caps folio: `§ NN` mono index + the section label on the left, an
 * optional mono count + the lone "updated by assistant" live disc on the right.
 * Its data lands directly on the page's negative space below — no inner box,
 * no shadow. Depth is the rule + the spine, never a frame.
 *
 * Motion: one Apple-eased reveal on mount (gated by prefers-reduced-motion).
 */
export function SectionCard({
  index,
  title,
  count,
  action,
  touched,
  className,
  children,
}: {
  /** Mono folio index, e.g. "§ 02". Optional for the O-5 sub-sections. */
  index?: string;
  title: string;
  /** Right-flush mono count (goals, questions, slots…). */
  count?: number;
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
      className={cn("flex flex-col gap-4", className)}
    >
      {/* Folio — full-bleed hairline + tracked-caps masthead for the section. */}
      <header className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
        <span className="flex items-baseline gap-2 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
          {index ? (
            <span className="font-mono tabular-nums text-fg-faint">{index}</span>
          ) : null}
          <span className="text-fg-muted">{title}</span>
        </span>
        <div className="flex shrink-0 items-center gap-3">
          {action}
          {typeof count === "number" ? (
            <span className="font-mono text-[length:var(--text-eyebrow)] tabular-nums text-fg-subtle">
              n={count}
            </span>
          ) : null}
          {touched ? (
            <motion.span
              initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex items-center gap-1.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-accent"
            >
              <StatusDisc state="live" size="sm" />
              {t("updatedByAgent")}
            </motion.span>
          ) : null}
        </div>
      </header>
      {children}
    </motion.section>
  );
}
