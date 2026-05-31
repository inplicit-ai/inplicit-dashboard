"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { StatusDisc, type StatusState } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * EvidenceTree — the universal recursive ledger (wraps the `.evidence-tree` /
 * `.tree-node` / `.tree-row` recipes).
 *
 * THE product backbone: Cluster → Hypothesis → Insight → Utterance render as
 * the SAME row recursing N levels. One shared --tree-indent governs every
 * level; the status disc sits on the fixed connector column; expanding a row
 * reveals its children with the agent-plan spring (height + opacity), drawing
 * the dashed spine down the branch (solid amber when `activeConnector`).
 *
 * One component renders insights/clusters/hypotheses on the dashboard, the
 * synthesis pipeline, the participants roster, and RAG cited answers — so a
 * cluster→insight step looks identical everywhere (the Baseline Oath).
 *
 * Each node may carry:
 *   - `meta`        right-flush mono figures (signal strength, n=, score)
 *   - `extra`       arbitrary right-zone node (DataChips, a <Scorecard>)
 *   - `body`        revealed content shown ABOVE children (e.g. a <Quote>)
 *   - `children`    nested EvidenceNode[] (recurses at depth+1)
 *   - `cited`       amber left-tick + scroll target (set by ConversationSpine)
 *
 * Controlled selection of expanded nodes is opt-in via `expandedIds` /
 * `onToggle`; otherwise each node owns its own open state seeded by
 * `defaultExpandedDepth`. Motion collapses to instant under reduced-motion.
 * ────────────────────────────────────────────────────────────────────────── */

const APPLE_EASE = [0.2, 0.65, 0.3, 0.9] as const;

export type EvidenceKind =
  | "cluster"
  | "hypothesis"
  | "insight"
  | "utterance"
  | "participant"
  | "step";

export interface EvidenceNode {
  /** Stable id — used for keys, controlled expansion, and cite targeting. */
  id: string;
  /** Status disc state for the spine cell. */
  status: StatusState;
  /** Pulse the disc (honored only when status === "live"). */
  pulse?: boolean;
  /** Row title — parent rows render semibold via depth, active rows medium. */
  label: React.ReactNode;
  /** Domain kind — currently advisory (data-attr hook), not visual. */
  kind?: EvidenceKind;
  /** Right-flush mono meta (e.g. "S=7 · 2 depts", "#14"). */
  meta?: React.ReactNode;
  /** Arbitrary right-zone node (chips, a Scorecard) shown after `meta`. */
  extra?: React.ReactNode;
  /** Revealed content shown above any children (e.g. a verbatim Quote). */
  body?: React.ReactNode;
  /** Nested rows, recursed at depth + 1. */
  children?: EvidenceNode[];
  /** Light the branch connector amber (the lone running synthesis stage). */
  activeConnector?: boolean;
  /** Cited target — amber left tick (set by ConversationSpine cite-hover). */
  cited?: boolean;
}

interface EvidenceTreeProps {
  nodes: EvidenceNode[];
  /** Auto-expand nodes whose depth is below this value. Default 1 (top only). */
  defaultExpandedDepth?: number;
  /** Controlled set of expanded ids. When provided, `onToggle` drives changes. */
  expandedIds?: Set<string>;
  /** Fires with a node id when its row is activated. */
  onToggle?: (id: string) => void;
  className?: string;
}

interface NodeProps {
  node: EvidenceNode;
  depth: number;
  defaultExpandedDepth: number;
  expandedIds?: Set<string>;
  onToggle?: (id: string) => void;
  reduceMotion: boolean;
}

function EvidenceTreeNode({
  node,
  depth,
  defaultExpandedDepth,
  expandedIds,
  onToggle,
  reduceMotion,
}: NodeProps) {
  const hasChildren = !!node.children && node.children.length > 0;
  const expandable = hasChildren || node.body != null;

  const isControlled = expandedIds !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    () => depth < defaultExpandedDepth,
  );
  const open = isControlled ? expandedIds.has(node.id) : uncontrolledOpen;

  const handleToggle = React.useCallback(() => {
    if (!expandable) return;
    if (!isControlled) setUncontrolledOpen((v) => !v);
    onToggle?.(node.id);
  }, [expandable, isControlled, onToggle, node.id]);

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

  return (
    <div className="tree-node" data-kind={node.kind}>
      <div
        className={cn(
          "tree-row",
          expandable && "tree-row--button",
          open && "tree-row--open",
          isParent && "tree-row--parent",
          !isParent && "tree-row--active",
          node.cited && "is-cited",
        )}
        role={expandable ? "button" : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? open : undefined}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <div className="tree-row__lead">
          {expandable && (
            <span className="tree-row__chevron" aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
          <StatusDisc state={node.status} pulse={node.pulse} />
          <span className="tree-row__label">{node.label}</span>
        </div>

        {(node.meta != null || node.extra != null) && (
          <div className="tree-row__meta">
            {node.meta}
            {node.extra}
          </div>
        )}
      </div>

      {expandable && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              className={cn(
                "tree-node__children overflow-hidden",
                node.activeConnector && "tree-node__children--active",
              )}
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={reduceMotion ? undefined : { height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.26, ease: APPLE_EASE },
                opacity: { duration: 0.2, ease: APPLE_EASE },
              }}
            >
              {node.body != null && (
                <div className="py-2 pl-6">{node.body}</div>
              )}
              {node.children?.map((child) => (
                <EvidenceTreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  defaultExpandedDepth={defaultExpandedDepth}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                  reduceMotion={reduceMotion}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

export function EvidenceTree({
  nodes,
  defaultExpandedDepth = 1,
  expandedIds,
  onToggle,
  className,
}: EvidenceTreeProps) {
  const reduceMotion = useReducedMotion() ?? false;
  return (
    <div className={cn("evidence-tree", className)}>
      {nodes.map((node) => (
        <EvidenceTreeNode
          key={node.id}
          node={node}
          depth={0}
          defaultExpandedDepth={defaultExpandedDepth}
          expandedIds={expandedIds}
          onToggle={onToggle}
          reduceMotion={reduceMotion}
        />
      ))}
    </div>
  );
}

export type { EvidenceTreeProps };
