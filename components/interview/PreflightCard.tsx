"use client";

import { Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusDisc } from "@/components/ui/status-disc";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";
import { LanguagePicker } from "./LanguagePicker";

interface Props {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  langLocked: boolean;
  ready: boolean;
  errorMsg: string | null;
  onStartVoice: () => void;
  onPreferText: () => void;
}

/**
 * PreflightCard — the pre-call card (white-modernist).
 *
 * A calm centered white Card on the off-white page: a soft icon medallion, a
 * confident title + muted body, the language picker, the EU-AI-Act
 * self-identification as a soft note carrying the single live disc, then a
 * near-black primary CTA and a quiet text-alt link. Generous whitespace.
 */
export function PreflightCard({
  lang,
  onLangChange,
  langLocked,
  ready,
  errorMsg,
  onStartVoice,
  onPreferText,
}: Props) {
  const c = roomCopy(lang);
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2">
            <Mic aria-hidden className="h-6 w-6 text-fg-subtle" />
          </div>

          <h1 className="mt-5 text-[length:var(--text-display)] font-semibold tracking-[-0.02em] text-fg">
            {c.preflightTitle}
          </h1>
          <p className="mt-3 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed text-fg-muted">
            {c.preflightBody}
          </p>

          <div className="mt-6">
            <LanguagePicker
              value={lang}
              onChange={onLangChange}
              label={c.languageLabel}
              disabled={langLocked}
            />
          </div>

          <div
            role="note"
            className="mt-5 flex items-start gap-3 rounded-md border border-line bg-surface-2 px-4 py-3 text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted"
          >
            <span className="flex shrink-0 items-center pt-1" aria-hidden>
              <StatusDisc state="live" size="sm" />
            </span>
            <span>{c.aiNotice}</span>
          </div>

          {errorMsg && (
            <div className="mt-5 flash flash--err">{errorMsg}</div>
          )}

          <div className="mt-6 flex flex-col items-stretch gap-3">
            <Button
              type="button"
              size="lg"
              onClick={onStartVoice}
              disabled={!ready}
              className="w-full"
            >
              {ready ? c.start : c.connecting}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={onPreferText}
              disabled={!ready}
              className="self-center"
            >
              {c.preferText}
            </Button>
          </div>

          <p className="mt-6 border-t border-line-subtle pt-4 text-[length:var(--text-caption)] leading-relaxed text-fg-subtle">
            {c.micNotice}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
