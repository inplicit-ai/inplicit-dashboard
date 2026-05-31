import * as React from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDashed,
  CircleDotDashed,
  CircleX,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * StatusDisc — single source of truth for the status vocabulary.
 *
 * Wraps the `.status-disc` CSS recipe (the 8px dot on the spine) AND the
 * agent-plan lucide icon set behind one `state` enum, so every research object
 * — cluster, hypothesis, insight, participant, pipeline stage, interview, twin
 * role, RAG citation, sidebar live indicator — speaks ONE status language and
 * sits on the exact same spine x-axis.
 *
 * Two render modes:
 *   as="disc"  (default) → the 8px dot used in the first spine cell of every
 *                          LedgerRow / table row / pipeline node.
 *   as="icon"           → the agent-plan lucide glyph (for chips, legends,
 *                          inline status words where a dot reads too quietly).
 *
 * AMBER MEANS LIVE — NOTHING ELSE. Only `state="live"` carries the accent fill,
 * and the lone continuous `--pulse` animation rides on it (CSS-gated behind
 * prefers-reduced-motion). Every other state is monochrome / semantic-tinted.
 *
 * Server-safe: no "use client", no framer-motion. The pulse is pure CSS, so a
 * live disc animates inside a server component without any client boundary.
 * ────────────────────────────────────────────────────────────────────────── */

export type StatusState =
  | "idle"
  | "live"
  | "done"
  | "error"
  | "pending"
  | "verified"
  | "contradicted"
  | "needs-evidence";

type DiscSpec = { discClass: string; Icon: LucideIcon; iconClass: string; label: string };

/** state → (.status-disc--* modifier, agent-plan icon, semantic tint, a11y label). */
const STATE: Record<StatusState, DiscSpec> = {
  idle: {
    discClass: "status-disc--idle",
    Icon: Circle,
    iconClass: "text-fg-subtle",
    label: "Idle",
  },
  live: {
    discClass: "status-disc--live",
    Icon: CircleDotDashed,
    iconClass: "text-accent",
    label: "Live",
  },
  done: {
    discClass: "status-disc--done",
    Icon: CheckCircle2,
    iconClass: "text-fg",
    label: "Done",
  },
  error: {
    discClass: "status-disc--error",
    Icon: CircleX,
    iconClass: "text-danger",
    label: "Error",
  },
  pending: {
    discClass: "status-disc--pending",
    Icon: CircleDotDashed,
    iconClass: "text-accent",
    label: "Pending",
  },
  verified: {
    discClass: "status-disc--verified",
    Icon: CheckCircle2,
    iconClass: "text-success",
    label: "Verified",
  },
  contradicted: {
    discClass: "status-disc--contradicted",
    Icon: CircleX,
    iconClass: "text-danger",
    label: "Contradicted",
  },
  "needs-evidence": {
    discClass: "status-disc--needs-evidence",
    Icon: CircleDashed,
    iconClass: "text-fg-subtle",
    label: "Needs evidence",
  },
};

const ICON_SIZE: Record<NonNullable<StatusDiscProps["size"]>, string> = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
};

const DISC_SIZE: Record<NonNullable<StatusDiscProps["size"]>, string> = {
  sm: "status-disc--sm",
  md: "",
  lg: "status-disc--lg",
};

/** Map any free-form domain status string onto the canonical StatusState. */
export function toStatusState(status: string): StatusState {
  const s = status.toLowerCase().replace(/[\s_-]+/g, "");
  switch (s) {
    case "live":
    case "inprogress":
    case "running":
    case "processing":
    case "active":
      return "live";
    case "completed":
    case "complete":
    case "done":
    case "success":
      return "done";
    case "verified":
      return "verified";
    case "contradicted":
      return "contradicted";
    case "needsevidence":
    case "needhelp":
    case "review":
    case "pendingreview":
      return "needs-evidence";
    case "failed":
    case "fail":
    case "error":
    case "expired":
    case "abandoned":
      return "error";
    case "pending":
    case "queued":
    case "draft":
      return "pending";
    default:
      return "idle";
  }
}

export interface StatusDiscProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  state: StatusState;
  size?: "sm" | "md" | "lg";
  /**
   * Force the pulse on/off. Defaults to ON when `state === "live"` (the single
   * continuous animation in the system) and OFF otherwise. Setting `pulse` on a
   * non-live state is intentionally ignored to protect the one-accent rule.
   */
  pulse?: boolean;
  /** `disc` (default) = the spine dot; `icon` = the agent-plan lucide glyph. */
  as?: "disc" | "icon";
}

export function StatusDisc({
  state,
  size = "md",
  pulse,
  as = "disc",
  className,
  ...props
}: StatusDiscProps) {
  const spec = STATE[state];
  const isLive = state === "live";
  // Amber pulse is reserved for the live state only.
  const showPulse = isLive && (pulse ?? true);

  if (as === "icon") {
    const Icon = spec.Icon;
    return (
      <span
        role="img"
        aria-label={spec.label}
        className={cn("inline-flex shrink-0", className)}
        {...props}
      >
        <Icon aria-hidden className={cn(ICON_SIZE[size], spec.iconClass)} />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={spec.label}
      className={cn(
        "status-disc",
        spec.discClass,
        DISC_SIZE[size],
        showPulse && "status-disc--pulse",
        className,
      )}
      {...props}
    />
  );
}
