import * as React from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
  type LucideIcon,
} from "lucide-react";

import { DataChip, type DataChipTone } from "@/components/ui/data-chip";
import { StatusDisc, toStatusState } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * StatusBadge — single source of truth for status → tone mapping.
 *
 * Now DELEGATES to the spine vocabulary: a status string resolves to a canonical
 * tone (for the DataChip tint) and, when `withIcon`, leads with a StatusDisc icon
 * glyph so the chip speaks the exact same language as every LedgerRow disc. The
 * status→tone map lives here once; PageChrome / tables / agent-plan reuse it.
 *
 * Server-safe: StatusDisc(as="icon") and DataChip are both server components.
 * The lone amber pulse never appears here — chips are static labels, not the
 * single live object — so even a "live"/"in-progress" status renders its disc
 * unpulsed (the opportunity tint carries the "forming" signal instead).
 *
 * See docs/plans/overhaul/design-contract.md §3.
 * ────────────────────────────────────────────────────────────────────────── */

export type StatusTone =
  | "success"
  | "opportunity"
  | "warning"
  | "danger"
  | "neutral";

type ToneSpec = { chipTone: DataChipTone; iconClass: string; Icon: LucideIcon };

/** tone → (DataChip tint, agent-plan icon, semantic ink). */
const TONE: Record<StatusTone, ToneSpec> = {
  success: {
    chipTone: "success",
    iconClass: "text-success",
    Icon: CheckCircle2,
  },
  opportunity: {
    chipTone: "opportunity",
    iconClass: "text-accent",
    Icon: CircleDotDashed,
  },
  warning: {
    chipTone: "warning",
    iconClass: "text-warning",
    Icon: CircleAlert,
  },
  danger: {
    chipTone: "danger",
    iconClass: "text-danger",
    Icon: CircleX,
  },
  neutral: {
    chipTone: "neutral",
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
  /** Show the leading status disc glyph. Default: false (text-only chip). */
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
  const { chipTone } = TONE[tone];
  return (
    <DataChip tone={chipTone} className={cn("gap-1.5", className)} {...props}>
      {withIcon && (
        <StatusDisc
          state={toStatusState(status)}
          as="icon"
          size="sm"
          pulse={false}
        />
      )}
      {label ?? status}
    </DataChip>
  );
}

/** Exposed so animated callers (agent-plan) can reuse the exact mapping. */
export const STATUS_TONE = TONE;
