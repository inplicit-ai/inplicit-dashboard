import * as React from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * StatusBadge — single source of truth for status → tone mapping.
 *
 * Centralizes the logic previously duplicated across PageChrome / ParticipantsTable
 * / agent-plan. Maps both the agent-plan vocabulary (completed / in-progress /
 * need-help / failed / pending) AND the domain enums (COMPLETED, IN_PROGRESS,
 * FAILED, VERIFIED, CONTRADICTED, …) onto the design.css `.badge--*` classes.
 *
 * Server-safe: no "use client", no framer-motion. For the animated bounce, wrap
 * <StatusBadge> in a motion element inside a client component (see agent-plan).
 *
 * See docs/plans/overhaul/design-contract.md §3.
 * ────────────────────────────────────────────────────────────────────────── */

export type StatusTone =
  | "success"
  | "opportunity"
  | "warning"
  | "danger"
  | "neutral";

type ToneSpec = { badgeClass: string; iconClass: string; Icon: LucideIcon };

const TONE: Record<StatusTone, ToneSpec> = {
  success: {
    badgeClass: "badge badge--success",
    iconClass: "text-success",
    Icon: CheckCircle2,
  },
  opportunity: {
    badgeClass: "badge badge--opportunity",
    iconClass: "text-accent",
    Icon: CircleDotDashed,
  },
  warning: {
    badgeClass: "badge badge--warning",
    iconClass: "text-warning",
    Icon: CircleAlert,
  },
  danger: {
    badgeClass: "badge badge--danger",
    iconClass: "text-danger",
    Icon: CircleX,
  },
  neutral: {
    badgeClass: "badge badge--knowledge",
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
  /** Show the leading status icon. Default: false (text-only pill). */
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
  const { badgeClass, iconClass, Icon } = TONE[tone];
  return (
    <span className={cn(badgeClass, className)} {...props}>
      {withIcon && <Icon aria-hidden className={cn("size-3", iconClass)} />}
      {label ?? status}
    </span>
  );
}

/** Exposed so animated callers (agent-plan) can reuse the exact mapping. */
export const STATUS_TONE = TONE;
