import * as React from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
  type LucideIcon,
} from "lucide-react";

import { StatusDisc, toStatusState } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * StatusBadge — single source of truth for status → tone mapping.
 *
 * White-modernist: a status string resolves to a canonical tone, which selects a
 * soft semantic pill (green = positive/verified, red = negative/contradicted,
 * amber = forming/live, muted = neutral). When `withIcon`, it leads with a
 * StatusDisc glyph so the pill speaks the same status language as every row.
 *
 * The status→tone map lives here once; PageChrome / tables / agent-plan reuse it.
 * Server-safe (StatusDisc icon mode + pure CSS pill). The lone amber pulse never
 * appears here — chips are static labels, so even a "live" status renders unpulsed.
 * ────────────────────────────────────────────────────────────────────────── */

export type StatusTone =
  | "success"
  | "opportunity"
  | "warning"
  | "danger"
  | "neutral";

/** Soft-pill class for a tone — full radius, tint-only, calm. */
type ToneSpec = { pillClass: string; iconClass: string; Icon: LucideIcon };

const PILL_BASE =
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[length:var(--text-caption)] font-medium leading-[1.4] tabular-nums whitespace-nowrap";

const TONE: Record<StatusTone, ToneSpec> = {
  success: {
    pillClass: "border-success/25 bg-success-soft text-success",
    iconClass: "text-success",
    Icon: CheckCircle2,
  },
  opportunity: {
    pillClass: "border-accent-muted bg-accent-soft text-accent",
    iconClass: "text-accent",
    Icon: CircleDotDashed,
  },
  warning: {
    pillClass: "border-warning/25 bg-warning-soft text-warning",
    iconClass: "text-warning",
    Icon: CircleAlert,
  },
  danger: {
    pillClass: "border-danger/30 bg-danger-soft text-danger",
    iconClass: "text-danger",
    Icon: CircleX,
  },
  neutral: {
    pillClass: "border-line-subtle bg-surface-2 text-fg-muted",
    iconClass: "text-fg-subtle",
    Icon: Circle,
  },
};

/** Map any status string (case/format-insensitive) to a canonical tone. */
export function statusTone(status: string): StatusTone {
  const s = status.toLowerCase().replace(/[\s_-]+/g, "");
  switch (s) {
    case "completed":
    case "complete":
    case "done":
    case "verified":
    case "success":
    case "active":
      return "success";
    case "inprogress":
    case "running":
    case "processing":
    case "live":
      return "opportunity";
    case "needhelp":
    case "pendingreview":
    case "review":
    case "warning":
    case "paused":
      return "warning";
    case "failed":
    case "fail":
    case "error":
    case "contradicted":
    case "expired":
    case "abandoned":
      return "danger";
    default:
      // pending / queued / draft / unknown
      return "neutral";
  }
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  /** Show the leading status disc glyph. Default: false (text-only pill). */
  withIcon?: boolean;
  /** Override the displayed text; defaults to the raw status string. */
  label?: string;
}

export function StatusBadge({
  status,
  withIcon = false,
  label,
  className,
  ...props
}: StatusBadgeProps) {
  const tone = statusTone(status);
  const { pillClass } = TONE[tone];
  return (
    <span className={cn(PILL_BASE, pillClass, className)} {...props}>
      {withIcon && (
        <StatusDisc
          state={toStatusState(status)}
          as="icon"
          size="sm"
          pulse={false}
        />
      )}
      {label ?? status}
    </span>
  );
}

/** Exposed so animated callers (agent-plan) can reuse the exact mapping. */
export const STATUS_TONE = TONE;
