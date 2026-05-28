"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUp } from "lucide-react";
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/PageChrome";
import { api, type Locale } from "@/lib/api";

/**
 * Prompt launchpad (doc 03 §1.1). Centered prompt box + example chips. The
 * examples are org-grounded suggestions (empty on the org's first campaign →
 * neutral i18n hint). On send: create a draft, navigate to the split author.
 */
export function Launchpad({ suggestions }: { suggestions: string[] }) {
  const t = useTranslations("setup.launchpad");
  const router = useRouter();
  const locale = useLocale();
  const [value, setValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.setup.createSession({
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
    <div className="mx-auto flex min-h-[60vh] max-w-[680px] flex-col items-center justify-center text-center">
      <Eyebrow className="mb-4">{t("eyebrow")}</Eyebrow>
      <h1 className="mb-3 text-3xl font-medium leading-tight tracking-[-0.025em] text-fg sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mb-8 max-w-[52ch] text-sm leading-relaxed text-fg-muted">
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

      {error && <p className="mt-3 text-sm text-pain">{error}</p>}

      <div className="mt-6 w-full">
        {suggestions.length === 0 ? (
          <p className="text-sm text-fg-subtle">{t("firstHint")}</p>
        ) : (
          <>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
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
    </div>
  );
}
