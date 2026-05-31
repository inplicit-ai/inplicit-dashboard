"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

import { DashedConnector } from "@/components/ui/dashed-connector";
import { StatusDisc, type StatusState } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * LedgerRow — the one row to rule them all (wraps the `.ledger-row` recipe).
 *
 * An expandable grid row:
 *   [status disc on the spine] [mono index + title] [right-aligned metric] [chevron]
 *
 * Reveals children with the agent-plan spring (height + opacity, 0.05s child
 * stagger) and continues the DashedConnector down the branch. ONE component
 * replaces five bespoke card layouts: clusters, insights, hypotheses, pipeline
 * stages, participants, interviews, twin roles, RAG citations.
 *
 * Hierarchy is WEIGHT + SPINE-DEPTH, never size: parent rows render semibold,
 * `depth > 0` child rows render regular + indented so connectors land on the
 * parent disc center. Hover is a surface shift only — never a lift.
 *
 * Controlled (`open` + `onToggle`) or uncontrolled (`defaultOpen`). All motion
 * collapses to instant opacity under prefers-reduced-motion.
 * ────────────────────────────────────────────────────────────────────────── */

// Apple cubic-bezier — the single discrete-motion easing curve.
const APPLE_EASE = [0.2, 0.65, 0.3, 0.9] as const;

const branchVariants: Variants = {
  collapsed: { height: 0, opacity: 0 },
  open: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.26, ease: APPLE_EASE },
      opacity: { duration: 0.2, ease: APPLE_EASE },
      staggerChildren: 0.05,
    },
  },
};

const childVariants: Variants = {
  collapsed: { opacity: 0, y: -4 },
  open: { opacity: 1, y: 0, transition: { duration: 0.2, ease: APPLE_EASE } },
};

export interface LedgerRowProps {
  /** Mono index / ID prefix (e.g. "C-04", "ANON-7F2A1B"). */
  index?: React.ReactNode;
  /** Row title — one body weight; parent vs child decided by `depth`. */
  title: React.ReactNode;
  /** Status disc state for the spine cell. */
  status: StatusState;
  /** Pulse the disc (only honored when status === "live"). */
  pulse?: boolean;
  /** Right-aligned mono figure (signal strength, confidence %, n=, score). */
  metric?: React.ReactNode;
  /** Tree depth — 0 = parent (semibold), >0 = indented child (regular). */
  depth?: number;
  /** Expandable affordance — shows the chevron and reveals `children`. */
  expandable?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  /** Controlled open state. When provided, `onToggle` drives changes. */
  open?: boolean;
  /** Fires on header activation (click / Enter / Space). */
  onToggle?: () => void;
  /** Light the branch connector amber (the lone running synthesis stage). */
  activeConnector?: boolean;
  className?: string;
  /** Revealed branch content — typically nested LedgerRows at depth+1. */
  children?: React.ReactNode;
}

export function LedgerRow({
  index,
  title,
  status,
  pulse,
  metric,
  depth = 0,
  expandable = false,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  activeConnector = false,
  className,
  children,
}: LedgerRowProps) {
  const reduceMotion = useReducedMotion();
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleToggle = React.useCallback(() => {
    if (!expandable) return;
    if (!isControlled) setUncontrolledOpen((v) => !v);
    onToggle?.();
  }, [expandable, isControlled, onToggle]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!expandable) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
    },
    [expandable, handleToggle],
  );

  const isParent = depth === 0;
  const hasBranch = expandable && children != null;

  return (
    <div
      className={cn(
        "ledger-row",
        isParent ? "ledger-row--parent" : "ledger-row--child",
        className,
      )}
      data-open={hasBranch ? open : undefined}
      style={
        depth > 1
          ? ({
              paddingLeft: `calc(var(--spine-w, 28px) + var(--tree-indent, 24px) * ${depth})`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* Header — clickable when expandable, else a static row. The grid cells
          are wrapped in a button-like contents container for a11y. */}
      <div
        className="contents"
        role={expandable ? "button" : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={hasBranch ? open : undefined}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <span className="ledger-row__spine">
          <StatusDisc state={status} pulse={pulse} />
        </span>

        <div className="ledger-row__body">
          {index != null && (
            <span className="ledger-row__index">{index}</span>
          )}
          <span className="ledger-row__title">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          {metric != null && (
            <span className="ledger-row__metric">{metric}</span>
          )}
          {expandable && (
            <span className="ledger-row__chevron" aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      </div>

      {/* Branch — children set off ONLY by indent + connector + surface wash,
          never re-wrapped in a nested bordered card. */}
      {hasBranch && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              className="relative col-span-3 overflow-hidden"
              variants={reduceMotion ? undefined : branchVariants}
              initial={reduceMotion ? false : "collapsed"}
              animate={reduceMotion ? undefined : "open"}
              exit={reduceMotion ? undefined : "collapsed"}
            >
              {/* Thread the connector down from the parent disc center. */}
              <DashedConnector
                orientation="vertical"
                tone={activeConnector ? "active" : "strong"}
                weight={1}
                className="left-[calc(var(--spine-w,28px)/2)]"
              />
              <div className="ledger-branch">
                {reduceMotion
                  ? children
                  : React.Children.map(children, (child) => (
                      <motion.div variants={childVariants}>{child}</motion.div>
                    ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
