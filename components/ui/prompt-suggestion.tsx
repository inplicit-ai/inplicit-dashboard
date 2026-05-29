"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as React from "react";

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

  const content =
    typeof children === "string" && isHighlightMode
      ? highlightText(children, highlight!)
      : children;

  const variantClasses =
    variant === "highlight" || isHighlightMode
      ? "w-full justify-start border-none text-fg-muted hover:bg-surface-2 hover:text-fg"
      : "rounded-ui border-line text-fg-muted hover:border-line-strong hover:text-fg";

  const sizeClasses =
    size === "sm"
      ? "h-7 px-3 text-[13px]"
      : size === "lg"
        ? "h-9 px-5 text-sm"
        : "h-8 px-4 text-[13px]";

  return (
    <Button
      variant={variant === "highlight" || isHighlightMode ? "ghost" : "outline"}
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
