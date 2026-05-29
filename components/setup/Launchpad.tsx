"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/PageChrome";
import { type Locale } from "@/lib/api";
import { clientApi } from "@/lib/client-api";

/**
 * Prompt launchpad (doc 03 §1.1). Centered prompt box + example chips. The
 * examples are org-grounded suggestions (empty on the org's first campaign →
 * neutral i18n hint). On send: create a draft, navigate to the split author.
 */
export function Launchpad({ suggestions }: { suggestions: string[] }) {
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
    <div className="flex flex-col items-center justify-center py-20 text-center sm:py-28">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0.65, 0.3, 0.9] }}
        className="flex w-full max-w-[680px] flex-col items-center"
      >
        <Eyebrow className="mb-4">{t("eyebrow")}</Eyebrow>
        <h1 className="mb-3 text-3xl font-semibold leading-[1.04] tracking-[-0.025em] text-fg sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mb-8 max-w-[52ch] text-[17px] leading-relaxed text-fg-muted">
          {t("subtitle")}
        </p>

        <div className="w-full">
          <PromptInput
            value={value}
            onValueChange={setValue}
            onSubmit={() => create(value)}
            isLoading={creating}
          >
            <PromptInputTextarea
              placeholder={t("placeholder")}
              disabled={creating}
              className="text-base"
            />
            <PromptInputActions className="justify-end pt-1">
              <Button
                type="button"
                size="icon-sm"
                onClick={() => create(value)}
                disabled={creating || !value.trim()}
                className="rounded-full"
                aria-label={t("cta")}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </PromptInputActions>
          </PromptInput>
        </div>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <div className="mt-6 w-full">
          {suggestions.length === 0 ? (
            <p className="text-sm text-fg-subtle">{t("firstHint")}</p>
          ) : (
            <>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                {t("examplesLabel")}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <PromptSuggestion
                    key={s}
                    size="sm"
                    onClick={() => create(s)}
                    disabled={creating}
                  >
                    {s}
                  </PromptSuggestion>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
