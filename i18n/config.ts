/**
 * i18n configuration — single source of truth for supported locales.
 *
 * Strategy (per 02-information-architecture §8): cookie-based locale, NO path
 * prefix. Keeps existing routes (`/campaigns/[id]`) stable. The app reads the
 * `NEXT_LOCALE` cookie; `LocaleSwitcher` writes it.
 */

export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie name used by next-intl convention. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve a locale from an `Accept-Language` header, falling back to the
 * default. Pure — testable without a request.
 */
export function resolveFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
