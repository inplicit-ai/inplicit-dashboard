"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as React from "react";

/* ────────────────────────────────────────────────────────────────────────────
 * PromptSuggestion — reply-suggestion / command affordance.
 *
 * Braun discipline: these are SQUARE data-chips, never pills. The default
 * variant is a hairline-bordered `rounded-sm` chip (matching the DataChip
 * vocabulary used everywhere else); the `highlight` variant is a full-width,
 * borderless command row for a results/command list. Numeric/ID-leaning content
 * stays in the surface neutral tone. No amber here — accent is reserved for the
 * focused composer + the live indicator.
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

  // Command-list row vs. square reply chip.
  const variantClasses = isCommandRow
    ? "w-full justify-start rounded-ui border-none text-fg-muted hover:bg-surface-2 hover:text-fg"
    : // Square data-chip: hairline edge, gentle radius, never a pill.
      "rounded-sm border-line text-fg-muted hover:border-line-strong hover:bg-surface-2 hover:text-fg";

  const sizeClasses =
    size === "sm"
      ? "h-7 px-3 text-[13px]"
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
