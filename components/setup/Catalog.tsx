"use client";

import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, DURATION_OPTIONS } from "@/components/ui/select";
import { Eyebrow } from "@/components/PageChrome";
import { cn } from "@/lib/utils";
import type { CampaignDraft, Locale, SetupToolCall } from "@/lib/api";
import { SectionCard } from "./SectionCard";
import { TopicGraph } from "./TopicGraph";
import { PeopleSection } from "./PeopleSection";
import { ScheduleSection } from "./ScheduleSection";
import { EmailTemplateSection } from "./EmailTemplateSection";

/**
 * The catalog (right pane, doc 03 §4). Grouped section cards in the agent-plan
 * aesthetic — clean hairline cards, generous radii, no light-mode shadow. Every
 * field is both user-editable and agent-populatable: a field edit dispatches a
 * *local* SetupToolCall of the same shape the agent emits — single reducer, two
 * writers.
 *
 * `recentlyTouched` carries the set of tool names the last agent turn touched,
 * so a card shows a fading "updated by assistant" pill.
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
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <Eyebrow>{t("title")}</Eyebrow>
        <p className="text-sm text-fg-muted">{t("subtitle")}</p>
      </div>

      {/* Format — interview type · duration · language grouped into one card */}
      <SectionCard
        title={t("interviewType")}
        touched={
          recentlyTouched?.has("set_interview_type") ||
          recentlyTouched?.has("set_duration") ||
          recentlyTouched?.has("set_language")
        }
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Interview type */}
          <Field label={t("interviewType")}>
            <Segmented
              value={draft.interviewType ?? "voice"}
              options={[
                { value: "voice", label: t("voice") },
                { value: "chat", label: t("chatType") },
              ]}
              onChange={(type) =>
                onPatch({ tool: "set_interview_type", args: { type } })
              }
            />
          </Field>

          {/* Duration — dropdown on the 5-min grid (no range slider) */}
          <Field label={t("duration")}>
            <Select
              aria-label={t("duration")}
              value={String(draft.durationMin ?? 25)}
              onValueChange={(v) =>
                onPatch({ tool: "set_duration", args: { minutes: Number(v) } })
              }
              options={DURATION_OPTIONS}
              size="md"
            />
          </Field>

          {/* Language */}
          <Field label={t("language")}>
            <Select
              aria-label={t("language")}
              value={draft.language?.default ?? "de"}
              onValueChange={(v) =>
                onPatch({
                  tool: "set_language",
                  args: {
                    default: v as Locale,
                    allowSwitch: draft.language?.allowSwitch ?? true,
                  },
                })
              }
              options={[
                { value: "de", label: "Deutsch" },
                { value: "en", label: "English" },
              ]}
              size="md"
            />
          </Field>

          {/* Allow language switch */}
          <Field label={t("allowSwitch")}>
            <label className="flex h-10 items-center justify-between gap-3 rounded-ui border border-line bg-surface px-4">
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
          </Field>
        </div>
      </SectionCard>

      {/* Goals (query fan-out) */}
      <SectionCard title={t("goals")} touched={recentlyTouched?.has("set_goals")}>
        {draft.prompt ? (
          <p className="rounded-ui border-l-2 border-accent-muted bg-accent-soft px-3 py-2 text-sm italic text-fg-muted">
            {draft.prompt}
          </p>
        ) : null}
        {(draft.goals?.length ?? 0) === 0 ? (
          <p className="text-sm text-fg-muted">{t("goalsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {draft.goals!.map((g) => (
              <li key={g.id} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <input
                  value={g.text}
                  onChange={(e) =>
                    onPatch({
                      tool: "refine_goal",
                      args: { id: g.id, text: e.target.value },
                    })
                  }
                  className="w-full rounded-ui bg-transparent px-2 py-1 text-sm text-fg outline-none transition-colors focus-visible:bg-surface-2"
                />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Background */}
      <SectionCard
        title={t("background")}
        touched={recentlyTouched?.has("set_background")}
      >
        <Textarea
          rows={3}
          value={draft.background?.notes ?? ""}
          placeholder={t("backgroundPlaceholder")}
          onChange={(e) =>
            onPatch({ tool: "set_background", args: { notes: e.target.value } })
          }
          className="min-h-[80px] text-sm"
        />
      </SectionCard>

      {/* Success criteria */}
      <SectionCard
        title={t("successCriteria")}
        touched={recentlyTouched?.has("set_success_criteria")}
      >
        <div className="flex flex-col gap-3">
          <Segmented
            value={draft.successCriteria?.mode ?? "inductive"}
            options={[
              { value: "inductive", label: t("inductive") },
              { value: "deductive", label: t("deductive") },
            ]}
            onChange={(mode) =>
              onPatch({
                tool: "set_success_criteria",
                args: {
                  mode,
                  questions: draft.successCriteria?.questions ?? [],
                  hypotheses: draft.successCriteria?.hypotheses ?? [],
                },
              })
            }
          />
          {(draft.successCriteria?.questions?.length ?? 0) > 0 ? (
            <div className="border-t border-line-subtle pt-3">
              <p className="mb-1.5 text-xs font-medium text-fg-subtle">
                {t("questions")}
              </p>
              <ul className="flex flex-col gap-1.5">
                {draft.successCriteria!.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-fg">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {/* Topics */}
      <SectionCard
        title={t("topics")}
        touched={
          recentlyTouched?.has("add_topic") ||
          recentlyTouched?.has("link_topics")
        }
      >
        <TopicGraph data={draft.topics} />
      </SectionCard>

      {/* People (name+email rows + CSV upload) */}
      <PeopleSection
        draft={draft}
        onPatch={onPatch}
        touched={recentlyTouched?.has("set_people")}
      />

      {/* Schedule (booking slots, not open-anytime) */}
      <ScheduleSection
        draft={draft}
        onPatch={onPatch}
        touched={recentlyTouched?.has("set_schedule")}
      />

      {/* Invite email template (live preview) */}
      <EmailTemplateSection
        draft={draft}
        onPatch={onPatch}
        touched={recentlyTouched?.has("set_email_template")}
      />
    </div>
  );
}

/* ─── Local field + segmented-control helpers ────────────────────────────── */

/** Labeled form field, design-contract §5 scaffolding. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-subtle">{label}</span>
      {children}
    </label>
  );
}

/**
 * Token-driven segmented control for small discrete choices (interview type,
 * success mode). Single hairline track, near-black active pill — agent-plan
 * aesthetic. Generic over the literal-union value type so callers stay typed.
 */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex w-full rounded-ui border border-line bg-surface p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-fg text-canvas"
                : "text-fg-muted hover:text-fg",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
