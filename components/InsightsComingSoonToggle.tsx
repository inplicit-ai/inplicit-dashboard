"use client";

import { useTranslations } from "next-intl";

import { Switch } from "@/components/ui/switch";

/**
 * WHY-95: a greyed-out "coming soon" toggle on the Insights page. The control
 * is intentionally disabled — it advertises an upcoming capability (advanced
 * clustering view) without yet being wired to anything.
 *
 * TODO(WHY-95): wire this toggle to the real clustering/grouping view once the
 * backend exposes it.
 */
export function InsightsComingSoonToggle() {
  const t = useTranslations("insights");

  return (
    <label className="flex cursor-not-allowed items-center gap-2 opacity-60">
      <Switch
        size="sm"
        disabled
        aria-label={t("comingSoonToggle")}
      />
      <span className="text-[length:var(--text-meta)] font-medium text-fg-muted">
        {t("comingSoonToggle")}
      </span>
      <span className="badge">{t("comingSoonBadge")}</span>
    </label>
  );
}
