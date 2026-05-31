"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as React from "react";

/* ────────────────────────────────────────────────────────────────────────────
 * PromptSuggestion — reply-suggestion / command affordance.
 *
 * White-modernist (claude.ai): the default variant is a SOFT PILL — a
 * hairline-bordered `rounded-full` chip on a white surface that lifts on hover.
 * The `highlight` variant is a full-width, borderless command row for a
 * results/command list. No amber here — accent is reserved for primary actions
 * and the live indicator.
 * ────────────────────────────────────────────────────────────────────────── */

export type PromptSuggestionProps = {
  children: React.ReactNode;
  variant?: "default" | "highlight";
  size?: "sm" | "md" | "lg";
  className?: string;
  highlight?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function PromptSuggestion({
  children,
  variant,
  size = "md",
  className,
  highlight,
  ...props
}: PromptSuggestionProps) {
  const isHighlightMode = highlight !== undefined && highlight.trim() !== "";
  const isCommandRow = variant === "highlight" || isHighlightMode;

  const content =
    typeof children === "string" && isHighlightMode
      ? highlightText(children, highlight!)
      : children;

  // Command-list row vs. soft reply pill.
  const variantClasses = isCommandRow
    ? "w-full justify-start rounded-ui border-none text-fg-muted hover:bg-surface-2 hover:text-fg"
    : // Soft pill: white surface, hairline edge, full radius.
      "rounded-full border-line bg-surface text-fg-muted hover:border-line-strong hover:bg-surface-2 hover:text-fg";

  const sizeClasses =
    size === "sm"
      ? "h-7 px-3.5 text-[13px]"
      : size === "lg"
        ? "h-9 px-5 text-sm"
        : "h-8 px-4 text-[13px]";

  return (
    <Button
      variant={isCommandRow ? "ghost" : "outline"}
      className={cn(variantClasses, sizeClasses, className)}
      {...props}
    >
      {content}
    </Button>
  );
}

function highlightText(text: string, highlight: string) {
  if (!highlight.trim()) return text;
  const regex = new RegExp(`(${escapeRegExp(highlight)})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="text-fg font-semibold">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { PromptSuggestion };
