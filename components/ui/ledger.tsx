import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Ledger — the page-level register container (wraps the `.ledger` recipe).
 *
 * THE one structure for every research object. A borderless column of
 * LedgerRows separated only by hairlines, establishing the spine width
 * (--spine-w) and tree indent (--tree-indent) custom props so every status
 * disc — across every screen — lands on the same x-axis. Replaces the
 * stack-of-cards (.list-stack) on data screens.
 *
 * `framed` opts into a single outer hairline card (`.card .card--ledger`); the
 * default is borderless (pure rules). Server-safe: no interactivity here — the
 * rows own their expand state.
 *
 * Usage: insights, hypotheses, participants, interviews, the synthesis
 * pipeline, the twin role list, RAG citations.
 * ────────────────────────────────────────────────────────────────────────── */

export interface LedgerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Wrap the rows in a single outer hairline card. Default: borderless. */
  framed?: boolean;
  /** Override the spine column width (px). Defaults to the recipe's 28px. */
  spineWidth?: number;
  /** Override the child tree indent (px). Defaults to the recipe's 24px. */
  treeIndent?: number;
  children: React.ReactNode;
}

export function Ledger({
  framed = false,
  spineWidth,
  treeIndent,
  className,
  style,
  children,
  ...props
}: LedgerProps) {
  const cssVars: React.CSSProperties = {
    ...(spineWidth != null
      ? ({ ["--spine-w"]: `${spineWidth}px` } as React.CSSProperties)
      : {}),
    ...(treeIndent != null
      ? ({ ["--tree-indent"]: `${treeIndent}px` } as React.CSSProperties)
      : {}),
    ...style,
  };

  return (
    <div
      className={cn("ledger", framed && "card card--ledger", className)}
      style={cssVars}
      {...props}
    >
      {children}
    </div>
  );
}
