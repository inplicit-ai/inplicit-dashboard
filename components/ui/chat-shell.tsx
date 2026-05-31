"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * ChatShell / ChatScroll / ChatScrollAnchored / ChatComposerBar — structural
 * helpers implementing the canonical chat-container flex height contract WITHOUT
 * any hardcoded vh height.
 *
 * The shell is `flex flex-col` and fills its parent (use `h-full` when the parent
 * sets height, `h-[var(--chat-height)]` at a route top level, or `flex-1 min-h-0`
 * when nested in a flex column). Exactly ONE scroll region, composer pinned at the
 * bottom (ChatComposerBar).
 *
 * ChatScrollAnchored adds the 21st.dev AI-conversation discipline: stick-to-bottom
 * while the user is at the foot of the thread, and a floating "scroll to bottom"
 * pill the instant they read back up. The pill is the only chrome that floats —
 * everything else is the spine + hairlines.
 *
 * See docs/plans/overhaul/design-contract.md §6.
 * ────────────────────────────────────────────────────────────────────────── */

const APPLE_EASE = [0.2, 0.65, 0.3, 0.9] as const;

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
        "scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ChatScrollAnchoredProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Dependencies that, when changed, re-pin to bottom if already anchored. */
  dep?: ReadonlyArray<unknown>;
  /** When true (a turn streaming in) keep nudging to the foot. */
  live?: boolean;
  /** Accessible label for the floating scroll-to-bottom pill. */
  scrollLabel?: string;
}

/**
 * The single scroll region WITH stick-to-bottom + a floating scroll-to-bottom
 * pill. Anchors to the foot while the reader is at the bottom; the moment they
 * scroll up the pill fades in and the auto-anchor stands down so reading back is
 * never yanked. This is the one piece of floating chrome the chat allows.
 */
export function ChatScrollAnchored({
  dep = [],
  live = false,
  scrollLabel = "Scroll to bottom",
  className,
  children,
  ...props
}: ChatScrollAnchoredProps) {
  const reduceMotion = useReducedMotion();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = React.useState(true);

  const scrollToEnd = React.useCallback(
    (behavior: ScrollBehavior) => {
      endRef.current?.scrollIntoView({ behavior, block: "end" });
    },
    [],
  );

  // Track whether the reader is parked at the foot of the thread.
  const onScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const slack = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(slack < 48);
  }, []);

  // Re-pin on new content / streaming, but only when already anchored.
  React.useEffect(() => {
    if (!atBottom) return;
    scrollToEnd(reduceMotion ? "auto" : "smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dep, live]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={cn(
          "scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto",
          className,
        )}
        {...props}
      >
        {children}
        <div ref={endRef} aria-hidden className="h-px w-full shrink-0" />
      </div>

      {/* Floating "scroll to bottom" pill — appears only when read back up. */}
      <AnimatePresence>
        {!atBottom && (
          <motion.button
            type="button"
            onClick={() => {
              scrollToEnd(reduceMotion ? "auto" : "smooth");
              setAtBottom(true);
            }}
            aria-label={scrollLabel}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: APPLE_EASE }}
            className="absolute bottom-4 left-1/2 z-10 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-line bg-canvas text-fg-muted shadow-sm transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowDown className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>
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
