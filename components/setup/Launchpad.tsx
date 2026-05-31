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
import { StatusDisc } from "@/components/ui/status-disc";
import { Eyebrow } from "@/components/PageChrome";
import { type Locale } from "@/lib/api";
import { clientApi } from "@/lib/client-api";

/**
 * Prompt launchpad (doc 03 §1.1) — re-cut as a Braun two-track entry plate.
 *
 * Left rail: the four setup stages as a vertical StatusDisc list on the spine
 * (context → catalog → review → launch), the first stage the lone amber pulse,
 * threaded by the dashed connector — the agent-plan list standing in for any
 * progress chrome. Right track: the display hero (sanctioned here) + the single
 * elevated prompt composer with the lone amber focus ring + org-grounded
 * example chips as square data-chips. On send: create a draft, route to the
 * split author. Empty org → neutral i18n hint.
 */
export function Launchpad({ suggestions }: { suggestions: string[] }) {
  const t = useTranslations("setup.launchpad");
  const tc = useTranslations("setup.catalog");
  const tr = useTranslations("setup.review");
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

  // The setup journey as spine stages — the first is the lone live pulse.
  const stages: { label: string; live?: boolean }[] = [
    { label: t("eyebrow"), live: true },
    { label: tc("title") },
    { label: tr("eyebrow") },
    { label: tr("launch") },
  ];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.65, 0.3, 0.9] }}
      className="mx-auto grid w-full max-w-[920px] grid-cols-1 gap-10 py-16 lg:grid-cols-[200px_1fr] lg:gap-14 lg:py-24"
    >
      {/* ── Left rail — the setup spine ──────────────────────────────────── */}
      <aside className="hidden lg:block lg:pt-2">
        <p className="mb-5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
          {t("eyebrow")}
        </p>
        <ol className="relative flex flex-col gap-5">
          {/* The dashed spine threading the discs (connector-left column). */}
          <span
            aria-hidden
            className="absolute bottom-2 top-2 border-l border-dashed border-line-strong"
            style={{ left: "calc(var(--baseline) - 0.5px)" }}
          />
          {stages.map((s, i) => (
            <li key={s.label} className="relative flex items-center gap-3">
              <StatusDisc
                state={s.live ? "live" : "idle"}
                className="relative z-10 bg-canvas"
              />
              <span
                className={cnStage(s.live)}
              >
                <span className="font-mono tabular-nums text-fg-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>{" "}
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </aside>

      {/* ── Right track — hero + composer ────────────────────────────────── */}
      <div className="flex flex-col">
        <Eyebrow className="mb-4 lg:hidden">{t("eyebrow")}</Eyebrow>
        <h1 className="mb-3 text-[length:var(--text-display)] font-semibold leading-[1.08] tracking-[-0.022em] text-fg sm:text-4xl">
          {t("title")}
        </h1>
        <p className="body-lg mb-8 max-w-[60ch] text-fg-muted">{t("subtitle")}</p>

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

        {error ? (
          <p className="mt-3 text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-7 border-t border-line pt-5">
          {suggestions.length === 0 ? (
            <p className="text-fg-subtle">{t("firstHint")}</p>
          ) : (
            <>
              <p className="mb-3 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                {t("examplesLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
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
    </motion.div>
  );
}

/** Stage label class — weight + accent for the live stage only. */
function cnStage(live?: boolean): string {
  return live
    ? "text-[13px] font-semibold text-fg"
    : "text-[13px] font-normal text-fg-muted";
}
