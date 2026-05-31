"use client";

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
 * The catalog (right pane) — re-cut as a Braun SPEC SHEET on the status spine.
 *
 * The stack of rounded cards is gone. Every group is a FOLIO section break
 * (full-bleed hairline + tracked-caps folio), and its data lands directly on
 * the page's negative space. The interview FORMAT becomes one ruled spec band
 * (the .spec-strip instrument); GOALS and SUCCESS QUESTIONS become an
 * EvidenceTree whose status discs sit on the one shared spine x-axis.
 * Provenance becomes spatial, never boxed.
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
}: {
  draft: CampaignDraft;
  onPatch: (call: SetupToolCall) => void;
  recentlyTouched?: Set<string>;
}) {
  const t = useTranslations("setup.catalog");

  const goals = draft.goals ?? [];
  const questions = draft.successCriteria?.questions ?? [];

  // Goals as a status-spine ledger — each goal is an inline-editable row.
  const goalNodes: EvidenceNode[] = goals.map((g, i) => ({
    id: g.id,
    kind: "insight",
    status: "done",
    label: (
      <input
        value={g.text}
        onChange={(e) =>
          onPatch({ tool: "refine_goal", args: { id: g.id, text: e.target.value } })
        }
        className="w-full bg-transparent text-fg outline-none placeholder:text-fg-subtle"
        aria-label={`${t("goals")} ${i + 1}`}
      />
    ),
    meta: (
      <span className="font-mono tabular-nums text-fg-faint">
        G-{String(i + 1).padStart(2, "0")}
      </span>
    ),
  }));

  const questionNodes: EvidenceNode[] = questions.map((q, i) => ({
    id: `q-${i}`,
    kind: "insight",
    status: "done",
    label: <span className="text-fg">{q}</span>,
    meta: (
      <span className="font-mono tabular-nums text-fg-faint">
        Q-{String(i + 1).padStart(2, "0")}
      </span>
    ),
  }));

  return (
    <div className="flex flex-col gap-9">
      {/* ── Format — one ruled instrument band of three peers ───────────── */}
      <SectionCard
        index="§ 01"
        title={t("interviewType")}
        touched={
          recentlyTouched?.has("set_interview_type") ||
          recentlyTouched?.has("set_duration") ||
          recentlyTouched?.has("set_language")
        }
      >
        <div className="spec-strip rounded-card border border-line">
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

        <label className="flex items-center justify-between gap-3 py-1">
          <span className="text-fg-muted">{t("allowSwitch")}</span>
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

      {/* ── Goals (query fan-out) ──────────────────────────────────────── */}
      <SectionCard
        index="§ 02"
        title={t("goals")}
        count={goals.length}
        touched={recentlyTouched?.has("set_goals")}
      >
        {draft.prompt ? (
          <p className="border-l-2 border-line-strong pl-3 italic leading-relaxed text-fg-muted">
            {draft.prompt}
          </p>
        ) : null}
        {goals.length === 0 ? (
          <PlatePlaceholder>{t("goalsEmpty")}</PlatePlaceholder>
        ) : (
          <EvidenceTree nodes={goalNodes} defaultExpandedDepth={0} />
        )}
      </SectionCard>

      {/* ── Background ─────────────────────────────────────────────────── */}
      <SectionCard
        index="§ 03"
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
        index="§ 04"
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
        index="§ 05"
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
      />
    </div>
  );
}

/* ─── Shared spec-sheet helpers ──────────────────────────────────────────── */

/** A printed-plate placeholder for empty data — hairline rule + mono caption. */
export function PlatePlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-surface-2 px-4 py-3">
      <p className="font-mono text-[length:var(--text-eyebrow)] uppercase tracking-[0.06em] text-fg-subtle">
        {children}
      </p>
    </div>
  );
}

/** A labelled cell inside the ruled spec band — eyebrow over the control. */
function SpecField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="spec-cell !gap-2">
      <span className="spec-cell__label">{label}</span>
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
