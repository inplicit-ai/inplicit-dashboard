"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, makeDurationOptions } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  CampaignDraft,
  ScheduleConfig,
  ScheduleSlot,
  SetupToolCall,
} from "@/lib/api";
import { SectionCard } from "./SectionCard";

/** Slot-length options on the 5-minute grid (5..60). */
const SLOT_LENGTH_OPTIONS = makeDurationOptions(5, 60, 5);

/**
 * Schedule section (doc 03 §4 #11): the interview timeframe with BOOKING SLOTS
 * (not open-anytime). The user picks a window + slot length; we generate the
 * concrete slot list client-side for preview. On launch the backend persists
 * them via `POST /api/campaigns/:id/slots` and issues per-booking tokens.
 *
 * The "instant link (legacy)" mode keeps the pre-O-5 per-upload flow working
 * behind the per-campaign `booking_enabled` flag.
 */
export function ScheduleSection({
  draft,
  onPatch,
  touched,
}: {
  draft: CampaignDraft;
  onPatch: (call: SetupToolCall) => void;
  touched?: boolean;
}) {
  const t = useTranslations("setup.catalog");
  const schedule: ScheduleConfig = draft.schedule ?? {
    mode: "slots",
    slotLengthMin: 30,
    timezone: "Europe/Berlin",
    slots: [],
  };

  const patch = (next: Partial<ScheduleConfig>) =>
    onPatch({ tool: "set_schedule", args: { ...schedule, ...next } });

  const generate = () => {
    const slots = buildSlots(
      schedule.windowStart,
      schedule.windowEnd,
      schedule.slotLengthMin ?? 30,
    );
    patch({ slots });
  };

  const slots = schedule.slots ?? [];

  return (
    <SectionCard title={t("schedule")} touched={touched}>
      <div className="flex flex-col gap-4">
        {/* Booking mode */}
        <div
          role="radiogroup"
          className="inline-flex w-full rounded-ui border border-line bg-surface p-0.5 sm:w-auto sm:self-start"
        >
          {(["slots", "instant"] as const).map((mode) => {
            const active = schedule.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => patch({ mode })}
                className={cn(
                  "flex-1 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors sm:flex-none",
                  active ? "bg-fg text-canvas" : "text-fg-muted hover:text-fg",
                )}
              >
                {mode === "slots" ? t("bookingSlots") : t("instantLink")}
              </button>
            );
          })}
        </div>

        {schedule.mode === "slots" ? (
          <>
            <p className="text-xs leading-snug text-fg-subtle">
              {t("scheduleHint")}
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  {t("windowStart")}
                </span>
                <Input
                  type="datetime-local"
                  value={schedule.windowStart ?? ""}
                  onChange={(e) => patch({ windowStart: e.target.value })}
                  className="h-9 font-mono text-sm tabular-nums"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  {t("windowEnd")}
                </span>
                <Input
                  type="datetime-local"
                  value={schedule.windowEnd ?? ""}
                  onChange={(e) => patch({ windowEnd: e.target.value })}
                  className="h-9 font-mono text-sm tabular-nums"
                />
              </label>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="flex flex-col gap-1.5 sm:w-40">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  {t("slotLength")}
                </span>
                <Select
                  aria-label={t("slotLength")}
                  value={String(schedule.slotLengthMin ?? 30)}
                  onValueChange={(v) =>
                    patch({ slotLengthMin: Number(v) || 30 })
                  }
                  options={SLOT_LENGTH_OPTIONS}
                  size="md"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={generate}
                disabled={!schedule.windowStart || !schedule.windowEnd}
              >
                {t("generateSlots")}
              </Button>
            </div>

            {slots.length === 0 ? (
              <p className="text-sm text-fg-muted">{t("noSlots")}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-xs tabular-nums text-fg-subtle">
                  {t("slotsCount", { count: slots.length })}
                </span>
                <ul className="scrollbar-none flex max-h-44 flex-col gap-0.5 overflow-y-auto rounded-ui border border-line bg-surface-2 p-2">
                  {slots.map((s, i) => (
                    <li
                      key={i}
                      className="rounded-sm px-1.5 py-1 font-mono text-xs tabular-nums text-fg-muted"
                    >
                      {fmtSlot(s)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}

/**
 * Generate non-overlapping slots inside [start, end) of `lengthMin` each.
 * Capped at 200 to keep the preview list sane; the backend re-validates.
 */
export function buildSlots(
  windowStart: string | undefined,
  windowEnd: string | undefined,
  lengthMin: number,
): ScheduleSlot[] {
  if (!windowStart || !windowEnd) return [];
  const start = new Date(windowStart).getTime();
  const end = new Date(windowEnd).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return [];
  const stepMs = Math.max(5, lengthMin) * 60_000;

  const out: ScheduleSlot[] = [];
  for (let cur = start; cur + stepMs <= end && out.length < 200; cur += stepMs) {
    out.push({
      startsAt: new Date(cur).toISOString(),
      endsAt: new Date(cur + stepMs).toISOString(),
    });
  }
  return out;
}

function fmtSlot(s: ScheduleSlot): string {
  try {
    const d = new Date(s.startsAt);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s.startsAt;
  }
}
