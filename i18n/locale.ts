import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  resolveFromAcceptLanguage,
  type Locale,
} from "./config";

/**
 * Resolve the active locale on the server.
 *
 * Order: explicit `NEXT_LOCALE` cookie → `Accept-Language` → default `en`.
 * Used by both the next-intl request config and any RSC that needs the locale
 * (e.g. the root <html lang>).
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  try {
    const headerStore = await headers();
    return resolveFromAcceptLanguage(headerStore.get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
}
