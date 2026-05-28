"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/PageChrome";
import { cn } from "@/lib/utils";
import type { CampaignDraft, SetupToolCall } from "@/lib/api";
import { TopicGraph } from "./TopicGraph";

/**
 * The catalog (right pane, doc 03 §4). Boxed section cards, all user-editable
 * and all agent-populatable. A field edit dispatches a *local* SetupToolCall of
 * the same shape the agent emits — single reducer, two writers.
 *
 * `recentlyTouched` carries the set of tool names the last agent turn touched,
 * so a card can show a fading "updated by assistant" accent eyebrow.
 */
export function Catalog({
  draft,
  onPatch,
  recentlyTouched,
}: {
  draft: CampaignDraft;
  onPatch: (call: SetupToolCall) => void;
  recentlyTouched?: Set<string>;
}) {
  const t = useTranslations("setup.catalog");

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <Eyebrow>{t("title")}</Eyebrow>
        <p className="text-sm text-fg-muted">{t("subtitle")}</p>
      </div>

      {/* 1 — Interview type */}
      <Section title={t("interviewType")} touched={recentlyTouched?.has("set_interview_type")}>
        <div className="inline-flex rounded-ui border border-line p-0.5">
          {(["voice", "chat"] as const).map((type) => {
            const active = (draft.interviewType ?? "voice") === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  onPatch({ tool: "set_interview_type", args: { type } })
                }
                className={cn(
                  "rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-fg text-canvas"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {type === "voice" ? t("voice") : t("chatType")}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 2 — Duration */}
      <Section title={t("duration")} touched={recentlyTouched?.has("set_duration")}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={draft.durationMin ?? 25}
            onChange={(e) =>
              onPatch({
                tool: "set_duration",
                args: { minutes: Number(e.target.value) },
              })
            }
            className="flex-1 accent-[var(--color-accent)]"
          />
          <span className="w-16 text-right text-sm tabular-nums text-fg">
            {draft.durationMin ?? 25} {t("minutes")}
          </span>
        </div>
      </Section>

      {/* 3 — Language */}
      <Section title={t("language")} touched={recentlyTouched?.has("set_language")}>
        <div className="flex flex-col gap-3">
          <div className="inline-flex rounded-ui border border-line p-0.5">
            {(["de", "en"] as const).map((lang) => {
              const active = (draft.language?.default ?? "de") === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() =>
                    onPatch({
                      tool: "set_language",
                      args: {
                        default: lang,
                        allowSwitch: draft.language?.allowSwitch ?? true,
                      },
                    })
                  }
                  className={cn(
                    "rounded-[8px] px-3 py-1.5 text-sm font-medium uppercase transition-colors",
                    active ? "bg-fg text-canvas" : "text-fg-muted hover:text-fg",
                  )}
                >
                  {lang}
                </button>
              );
            })}
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-fg-muted">{t("allowSwitch")}</span>
            <Switch
              checked={draft.language?.allowSwitch ?? true}
              onCheckedChange={(checked) =>
                onPatch({
                  tool: "set_language",
                  args: {
                    default: draft.language?.default ?? "de",
                    allowSwitch: checked,
                  },
                })
              }
            />
          </label>
        </div>
      </Section>

      {/* 4 — Goals (query fan-out) */}
      <Section title={t("goals")} touched={recentlyTouched?.has("set_goals")}>
        {draft.prompt && (
          <p className="mb-2 border-l-2 border-accent/40 pl-2 text-sm italic text-fg-muted">
            {draft.prompt}
          </p>
        )}
        {(draft.goals?.length ?? 0) === 0 ? (
          <p className="text-sm text-fg-muted">{t("goalsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {draft.goals!.map((g) => (
              <li key={g.id} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                <input
                  value={g.text}
                  onChange={(e) =>
                    onPatch({
                      tool: "refine_goal",
                      args: { id: g.id, text: e.target.value },
                    })
                  }
                  className="w-full rounded-sm bg-transparent px-1 py-0.5 text-sm text-fg outline-none focus-visible:bg-surface-2"
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 5 — Background */}
      <Section title={t("background")} touched={recentlyTouched?.has("set_background")}>
        <Textarea
          rows={3}
          value={draft.background?.notes ?? ""}
          placeholder={t("backgroundPlaceholder")}
          onChange={(e) =>
            onPatch({ tool: "set_background", args: { notes: e.target.value } })
          }
          className="min-h-[80px] text-sm"
        />
      </Section>

      {/* 6 — Success criteria */}
      <Section
        title={t("successCriteria")}
        touched={recentlyTouched?.has("set_success_criteria")}
      >
        <div className="flex flex-col gap-3">
          <div className="inline-flex rounded-ui border border-line p-0.5">
            {(["inductive", "deductive"] as const).map((mode) => {
              const active =
                (draft.successCriteria?.mode ?? "inductive") === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    onPatch({
                      tool: "set_success_criteria",
                      args: {
                        mode,
                        questions: draft.successCriteria?.questions ?? [],
                        hypotheses: draft.successCriteria?.hypotheses ?? [],
                      },
                    })
                  }
                  className={cn(
                    "rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-fg text-canvas" : "text-fg-muted hover:text-fg",
                  )}
                >
                  {mode === "inductive" ? t("inductive") : t("deductive")}
                </button>
              );
            })}
          </div>
          {(draft.successCriteria?.questions?.length ?? 0) > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-fg-subtle">
                {t("questions")}
              </p>
              <ul className="flex flex-col gap-1">
                {draft.successCriteria!.questions.map((q, i) => (
                  <li key={i} className="text-sm text-fg">
                    • {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* 7 — Topics */}
      <Section
        title={t("topics")}
        touched={
          recentlyTouched?.has("add_topic") ||
          recentlyTouched?.has("link_topics")
        }
      >
        <TopicGraph data={draft.topics} />
      </Section>
    </div>
  );
}

function Section({
  title,
  touched,
  children,
}: {
  title: string;
  touched?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("setup.catalog");
  return (
    <Card className="gap-3 rounded-card border-line bg-elevated p-4 shadow-none">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {touched && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-accent">
            {t("updatedByAgent")}
          </span>
        )}
      </div>
      {children}
    </Card>
  );
}
