"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { Composer } from "@/components/ui/composer";
import { StatusDisc } from "@/components/ui/status-disc";
import { type Locale } from "@/lib/api";
import { clientApi } from "@/lib/client-api";

/**
 * Prompt launchpad (doc 03 §1.1) — a calm claude.ai-style entry screen.
 *
 * Centered hero: a big confident greeting + one muted subtitle, then the
 * signature {@link Composer} prompt box (rounded box, send control, org-grounded
 * suggestion chips below). A quiet vertical stage list (context → catalog →
 * review → launch) sits on the left from lg up as gentle progress chrome — the
 * first stage carries the lone live disc. On send: create a draft, route to the
 * split author. Empty org → neutral i18n hint instead of chips.
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

  // The setup journey as calm stages — the first is the lone live pulse.
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
      {/* ── Left rail — quiet setup stages ──────────────────────────────── */}
      <aside className="hidden lg:block lg:pt-2">
        <p className="mb-5 text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
          {t("eyebrow")}
        </p>
        <ol className="flex flex-col gap-4">
          {stages.map((s, i) => (
            <li key={s.label} className="flex items-center gap-3">
              <StatusDisc state={s.live ? "live" : "idle"} />
              <span className={stageClass(s.live)}>
                <span className="tabular-nums text-fg-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>{" "}
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </aside>

      {/* ── Right track — hero + composer ───────────────────────────────── */}
      <div className="flex flex-col">
        <p className="mb-4 text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle lg:hidden">
          {t("eyebrow")}
        </p>
        <h1 className="mb-3 text-[length:var(--text-display)] font-semibold leading-[1.08] tracking-[-0.022em] text-fg sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mb-8 max-w-[60ch] text-[length:var(--text-body-lg)] text-fg-muted">
          {t("subtitle")}
        </p>

        <Composer
          value={value}
          onValueChange={setValue}
          onSubmit={() => create(value)}
          isLoading={creating}
          disabled={creating}
          placeholder={t("placeholder")}
          suggestions={
            suggestions.length > 0
              ? suggestions.map((s) => ({ label: s, value: s }))
              : undefined
          }
          onSuggestionSelect={(s) => create(s.value ?? s.label)}
        />

        {error ? (
          <p className="mt-3 text-[length:var(--text-body)] text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {suggestions.length === 0 ? (
          <p className="mt-4 text-[length:var(--text-body)] text-fg-subtle">
            {t("firstHint")}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}

/** Stage label class — weight + ink for the live stage only. */
function stageClass(live?: boolean): string {
  return live
    ? "text-[13px] font-semibold text-fg"
    : "text-[13px] font-normal text-fg-muted";
}
