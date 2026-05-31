"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { StatusDisc } from "@/components/ui/status-disc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Catalog section — a clean white card (claude.ai / Linear).
 *
 * White surface, hairline border, soft shadow, generous padding. The header is
 * a calm sentence-case section title with an optional muted sans count and the
 * lone "Updated by assistant" live disc. No §-folio, no tracked-caps eyebrow,
 * no full-bleed rule — depth is the card, not a hairline spine.
 *
 * Motion: one spring-eased reveal on mount (gated by prefers-reduced-motion).
 */
export function SectionCard({
  title,
  count,
  action,
  touched,
  className,
  children,
}: {
  /** @deprecated retained for call-site compatibility; no longer rendered. */
  index?: string;
  title: string;
  /** Muted sans count (goals, questions, slots…). */
  count?: number;
  action?: React.ReactNode;
  touched?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("setup.catalog");
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0.65, 0.3, 0.9] }}
    >
      <Card className={cn("gap-4", className)}>
        <CardHeader className="grid-cols-[1fr_auto] items-baseline">
          <CardTitle className="flex items-baseline gap-2 text-[length:var(--text-title)] tracking-[-0.015em]">
            <span>{title}</span>
            {typeof count === "number" ? (
              <span className="text-[length:var(--text-meta)] font-normal tabular-nums text-fg-subtle">
                {count}
              </span>
            ) : null}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-3 self-baseline justify-self-end">
            {action}
            {touched ? (
              <motion.span
                initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="flex items-center gap-1.5 text-[length:var(--text-caption)] font-medium text-accent"
              >
                <StatusDisc state="live" size="sm" />
                {t("updatedByAgent")}
              </motion.span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">{children}</CardContent>
      </Card>
    </motion.div>
  );
}
