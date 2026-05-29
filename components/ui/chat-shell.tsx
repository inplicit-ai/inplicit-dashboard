import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * ChatShell / ChatScroll / ChatComposerBar — structural helpers implementing the
 * canonical chat-container flex height contract WITHOUT any hardcoded vh height.
 *
 * The shell is `flex flex-col` and fills its parent (use `h-full` when the parent
 * sets height, `h-[var(--chat-height)]` at a route top level, or `flex-1 min-h-0`
 * when nested in a flex column). Exactly one scroll region (ChatScroll), composer
 * pinned at the bottom (ChatComposerBar). Server-safe (no motion / state).
 *
 * Use these OR hand-roll the same classes — they are equivalent.
 *
 * See docs/plans/overhaul/design-contract.md §6.
 * ────────────────────────────────────────────────────────────────────────── */

export interface ChatShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Height strategy. `fill` = h-full (parent owns height — default),
   *  `chat-height` = the campaign chat token, `bare` = topbar-only token. */
  height?: "fill" | "chat-height" | "bare";
}

const HEIGHT_CLASS: Record<NonNullable<ChatShellProps["height"]>, string> = {
  fill: "h-full",
  "chat-height": "h-[var(--chat-height)]",
  bare: "h-[var(--chat-height-bare)]",
};

export function ChatShell({
  height = "fill",
  className,
  children,
  ...props
}: ChatShellProps) {
  return (
    <div
      className={cn("flex min-h-0 flex-col", HEIGHT_CLASS[height], className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** The single scrolling message list. `min-h-0 flex-1 overflow-y-auto`. */
export function ChatScroll({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Pinned composer bar — never scrolls away. */
export function ChatComposerBar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shrink-0 border-t border-line bg-canvas", className)}
      {...props}
    >
      {children}
    </div>
  );
}
