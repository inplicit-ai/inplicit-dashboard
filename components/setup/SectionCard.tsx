"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";

/**
 * Shared boxed catalog-section card (doc 03 §4). One file so every section —
 * including the O-5 audience/schedule/email sections — renders identically:
 * hairline border, no light-mode shadow (Braun rules, 01 §design-system), and a
 * fading "updated by assistant" accent eyebrow when an agent tool just touched
 * it.
 */
export function SectionCard({
  title,
  touched,
  children,
}: {
  title: string;
  touched?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("setup.catalog");
  return (
    <Card className="gap-3 rounded-card border-line bg-elevated p-4 shadow-none">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {touched && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-accent">
            {t("updatedByAgent")}
          </span>
        )}
      </div>
      {children}
    </Card>
  );
}
