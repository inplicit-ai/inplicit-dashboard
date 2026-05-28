import { getRequestConfig } from "next-intl/server";
import { getLocale } from "./locale";

/**
 * next-intl request config. Loads the namespaced message catalog for the
 * active locale (resolved from the cookie / Accept-Language). Catalogs live in
 * `messages/{locale}.json`, namespaced by surface (nav, shell, breadcrumb, …).
 */
export default getRequestConfig(async () => {
  const locale = await getLocale();
  const messages = (await import(`../messages/${locale}.json`)).default;

  return { locale, messages };
});
