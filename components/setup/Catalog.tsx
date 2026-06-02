"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, DURATION_OPTIONS } from "@/components/ui/select";
import { EvidenceTree, type EvidenceNode } from "@/components/ui/agent-list";
import { DataChip } from "@/components/ui/data-chip";
import { cn } from "@/lib/utils";
import type { CampaignDraft, Locale, SetupToolCall } from "@/lib/api";
import { SectionCard } from "./SectionCard";
import { TopicGraph } from "./TopicGraph";
import { PeopleSection } from "./PeopleSection";
import { ScheduleSection } from "./ScheduleSection";
import { EmailTemplateSection } from "./EmailTemplateSection";

/**
 * The catalog (right pane) — a stack of clean white section cards (claude.ai).
 *
 * Every group is a {@link SectionCard}: white surface, hairline border, soft
 * shadow, calm sentence-case title + muted count. The interview FORMAT is a
 * roomy labeled control grid; GOALS and SUCCESS QUESTIONS render as a soft
 * EvidenceTree. Empty data shows a quiet hint, never an all-caps slogan dump.
 *
 * Every field is both user-editable and agent-populatable: an edit dispatches a
 * *local* SetupToolCall of the same shape the agent emits — single reducer, two
 * writers. `recentlyTouched` carries the tool names the last agent turn touched,
 * so a section surfaces the lone live disc + "updated by assistant" caption.
 */
export function Catalog({
  draft,
  onPatch,
  recentlyTouched,
  orgName,
}: {
  draft: CampaignDraft;
  onPatch: (call: SetupToolCall) => void;
  recentlyTouched?: Set<string>;
  orgName?: string;
}) {
  const t = useTranslations("setup.catalog");

  const goals = draft.goals ?? [];
  const questions = draft.successCriteria?.questions ?? [];

  // Goals as soft evidence rows — each goal is an inline-editable label.
  const goalNodes: EvidenceNode[] = goals.map((g, i) => ({
    id: g.id,
    kind: "insight",
    status: "done",
    label: (
      <GoalInput
        value={g.text}
        onChange={(text) =>
          onPatch({ tool: "refine_goal", args: { id: g.id, text } })
        }
        ariaLabel={`${t("goals")} ${i + 1}`}
      />
    ),
    meta: (
      <span className="tabular-nums text-fg-subtle">
        {String(i + 1).padStart(2, "0")}
      </span>
    ),
  }));

  const questionNodes: EvidenceNode[] = questions.map((q, i) => ({
    id: `q-${i}`,
    kind: "insight",
    status: "done",
    label: <span className="text-fg">{q}</span>,
    meta: (
      <span className="tabular-nums text-fg-subtle">
        {String(i + 1).padStart(2, "0")}
      </span>
    ),
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* ── Objective — the sharpened research question (editable) ────────── */}
      <ObjectiveSection draft={draft} onPatch={onPatch} touched={recentlyTouched?.has("set_objective")} />

      {/* ── Format — a roomy labeled control grid ───────────────────────── */}
      <SectionCard
        title={t("interviewType")}
        touched={
          recentlyTouched?.has("set_interview_type") ||
          recentlyTouched?.has("set_duration") ||
          recentlyTouched?.has("set_language")
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SpecField label={t("interviewType")}>
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
          </SpecField>

          <SpecField label={t("duration")}>
            <Select
              aria-label={t("duration")}
              value={String(draft.durationMin ?? 25)}
              onValueChange={(v) =>
                onPatch({ tool: "set_duration", args: { minutes: Number(v) } })
              }
              options={DURATION_OPTIONS}
              size="md"
            />
          </SpecField>

          <SpecField label={t("language")}>
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
          </SpecField>
        </div>

        <label className="flex items-center justify-between gap-3 border-t border-line-subtle pt-3">
          <span className="text-[length:var(--text-body)] text-fg-muted">
            {t("allowSwitch")}
          </span>
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
      </SectionCard>

      {/* ── Goals ──────────────────────────────────────────────────────── */}
      <SectionCard
        title={t("goals")}
        count={goals.length}
        touched={recentlyTouched?.has("set_goals")}
      >
        {goals.length === 0 ? (
          <PlatePlaceholder>{t("goalsEmpty")}</PlatePlaceholder>
        ) : (
          <EvidenceTree nodes={goalNodes} defaultExpandedDepth={0} />
        )}
      </SectionCard>

      {/* ── Background ─────────────────────────────────────────────────── */}
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
          className="min-h-[80px]"
        />
      </SectionCard>

      {/* ── Success criteria ───────────────────────────────────────────── */}
      <SectionCard
        title={t("successCriteria")}
        count={questions.length > 0 ? questions.length : undefined}
        touched={recentlyTouched?.has("set_success_criteria")}
      >
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
        {questions.length > 0 ? (
          <EvidenceTree nodes={questionNodes} defaultExpandedDepth={0} />
        ) : null}
      </SectionCard>

      {/* ── Topics ─────────────────────────────────────────────────────── */}
      <SectionCard
        title={t("topics")}
        count={draft.topics?.nodes?.length || undefined}
        touched={
          recentlyTouched?.has("add_topic") ||
          recentlyTouched?.has("link_topics")
        }
      >
        <TopicGraph data={draft.topics} />
      </SectionCard>

      {/* ── People ─────────────────────────────────────────────────────── */}
      <PeopleSection
        draft={draft}
        onPatch={onPatch}
        touched={recentlyTouched?.has("set_people")}
      />

      {/* ── Schedule ───────────────────────────────────────────────────── */}
      <ScheduleSection
        draft={draft}
        onPatch={onPatch}
        touched={recentlyTouched?.has("set_schedule")}
      />

      {/* ── Invite email ───────────────────────────────────────────────── */}
      <EmailTemplateSection
        draft={draft}
        onPatch={onPatch}
        touched={recentlyTouched?.has("set_email_template")}
        orgName={orgName}
      />
    </div>
  );
}

/* ─── Research brief ─────────────────────────────────────────────────────── */

/**
 * The sharpened research objective as a plain editable line at the top of the
 * catalog. EDDA drafts it; the user owns the wording. No stance, no confirm, no
 * gate — editing emits the same `set_objective` patch the agent uses (single
 * reducer, two writers). It IS the research question, in one editable place.
 */
function ObjectiveSection({
  draft,
  onPatch,
  touched,
}: {
  draft: CampaignDraft;
  onPatch: (call: SetupToolCall) => void;
  touched?: boolean;
}) {
  const t = useTranslations("setup.catalog");

  return (
    <SectionCard title={t("objective")} touched={touched}>
      <Textarea
        rows={2}
        value={draft.prompt ?? ""}
        placeholder={t("objectivePlaceholder")}
        onChange={(e) => onPatch({ tool: "set_objective", args: { text: e.target.value } })}
        className="min-h-[56px] text-[length:var(--text-body-lg)] font-medium leading-snug"
        aria-label={t("objective")}
      />
    </SectionCard>
  );
}

/** An inline, auto-growing goal editor — wraps long goals instead of truncating
 *  them (the old single-line input cut the text off). */
function GoalInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (text: string) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none overflow-hidden bg-transparent text-fg leading-snug outline-none placeholder:text-fg-subtle"
      aria-label={ariaLabel}
    />
  );
}

/* ─── Shared catalog helpers ─────────────────────────────────────────────── */

/** A quiet hint for empty data — soft dashed plate, calm sentence-case copy. */
export function PlatePlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-surface-2 px-4 py-3">
      <p className="text-[length:var(--text-body)] text-fg-subtle">{children}</p>
    </div>
  );
}

/** A labelled control cell — calm sentence-case label over the control. */
function SpecField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Token-driven segmented control for small discrete choices (interview type,
 * success mode). Single hairline track, near-black active pill — the in-app
 * primary surface (amber is never a control fill).
 */
export function Segmented<T extends string>({
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
              "flex-1 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors",
              active ? "bg-fg text-canvas" : "text-fg-muted hover:text-fg",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Re-exported so review can use the same chip vocabulary. */
export { DataChip };
