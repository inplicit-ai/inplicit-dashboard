"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { IconGlobe } from "@/components/icons";

/**
 * Writes the `NEXT_LOCALE` cookie and refreshes so the server re-renders with
 * the new catalog (02 §8 — cookie strategy, no path prefix).
 */
export function LocaleSwitcher() {
  const current = useLocale() as Locale;
  const t = useTranslations("locale");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === current) return;
    // 1 year, site-wide. Lax is fine — no cross-site need.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <label className="shell-locale" aria-label={t("label")}>
      <IconGlobe size={15} className="shell-locale__icon" aria-hidden="true" />
      <select
        className="shell-locale__select"
        value={current}
        disabled={pending}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {t(loc)}
          </option>
        ))}
      </select>
    </label>
  );
}
