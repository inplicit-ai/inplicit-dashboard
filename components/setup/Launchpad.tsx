"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { Composer } from "@/components/ui/composer";
import { type Locale } from "@/lib/api";
import { clientApi } from "@/lib/client-api";

/**
 * The fixed research-goal themes surfaced as suggestion cards (WHY-104). Each
 * theme seeds the composer with a starter prompt the user can refine. i18n
 * lives under `setup.launchpad.themes.<id>` (label + prompt).
 */
const SUGGESTION_THEMES = [
  "prozesswissen",
  "operatives",
  "innovationspotenziale",
] as const;

/**
 * Prompt launchpad (doc 03 §1.1) — a calm claude.ai-style entry screen.
 *
 * Centered hero: a big confident greeting + one muted subtitle, then the
 * signature {@link Composer} prompt box. Below it, "Vorschläge" render as clean
 * theme cards (Prozesswissen · operatives Know-how · Innovationspotenziale) —
 * picking one seeds the composer (WHY-104). On send: create a draft, route to
 * the split author. The create-flow step bar (SetupSteps) lives in the layout.
 */
export function Launchpad() {
  const t = useTranslations("setup.launchpad");
  const router = useRouter();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await clientApi.setup.createSession({
        prompt: trimmed,
        locale: (locale === "de" ? "de" : "en") as Locale,
      });
      router.push(`/campaigns/new/${res.draft_id}`);
    } catch {
      setError(t("creating"));
      setCreating(false);
    }
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.65, 0.3, 0.9] }}
      className="mx-auto flex w-full max-w-[720px] flex-col py-12 lg:py-16"
    >
      <h1 className="mb-3 text-[length:var(--text-display)] font-semibold leading-[1.08] tracking-[-0.022em] text-fg sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mb-8 max-w-[60ch] text-[length:var(--text-body-lg)] text-fg-muted">
        {t("subtitle")}
      </p>

      {/* composer-shell: shared prompt-box width (WHY-93). Org-grounded chips
          are replaced by the theme suggestion cards below (WHY-104). */}
      <Composer
        className="composer-shell"
        value={value}
        onValueChange={setValue}
        onSubmit={() => create(value)}
        isLoading={creating}
        disabled={creating}
        placeholder={t("placeholder")}
      />

      {error ? (
        <p className="mt-3 text-[length:var(--text-body)] text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {/* ── Vorschläge — clean theme cards (WHY-104) ─────────────────────── */}
      <p className="mb-3 mt-8 text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
        {t("suggestionsLabel")}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SUGGESTION_THEMES.map((id) => {
          const prompt = t(`themes.${id}.prompt`);
          return (
            <button
              key={id}
              type="button"
              disabled={creating}
              onClick={() => setValue(prompt)}
              className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-4 text-left shadow-card transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <span className="text-[length:var(--text-body)] font-semibold text-fg">
                {t(`themes.${id}.label`)}
              </span>
              <span className="text-[length:var(--text-meta)] leading-snug text-fg-muted">
                {t(`themes.${id}.description`)}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
