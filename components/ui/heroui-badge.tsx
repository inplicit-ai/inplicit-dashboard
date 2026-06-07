"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Overlay badge (HeroUI-style) — a small count/dot pinned to an anchor (e.g. an
 * avatar). Themed to the design tokens; `accent` is the amber live color and is
 * used ONLY for live status (the one-accent rule).
 */

type BadgeColor = "default" | "accent" | "success" | "danger";
type BadgePlacement = "top-right" | "top-left" | "bottom-right" | "bottom-left";
type BadgeSize = "sm" | "md" | "lg";

const colorClasses: Record<BadgeColor, string> = {
  default: "bg-fg text-canvas",
  accent: "bg-accent text-cta-fg", // amber — live only
  success: "bg-success text-white",
  danger: "bg-danger text-white",
};

const placementClasses: Record<BadgePlacement, string> = {
  "top-right": "absolute right-0 top-0 translate-x-1/4 -translate-y-1/4",
  "top-left": "absolute left-0 top-0 -translate-x-1/4 -translate-y-1/4",
  "bottom-right": "absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4",
  "bottom-left": "absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "min-h-4 min-w-4 rounded-xl text-[10px] leading-[1.34]",
  md: "min-h-6 min-w-6 rounded-2xl text-xs leading-[1.34]",
  lg: "min-h-7 min-w-7 rounded-2xl text-sm leading-[1.43]",
};

interface BadgeAnchorProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

function BadgeAnchor({ children, className, ...props }: BadgeAnchorProps) {
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      data-slot="badge-anchor"
      {...props}
    >
      {children}
    </span>
  );
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  placement?: BadgePlacement;
  size?: BadgeSize;
  children?: React.ReactNode;
}

function Badge({
  children,
  className,
  color = "default",
  placement = "top-right",
  size = "sm",
  ...props
}: BadgeProps) {
  const hasLabel = typeof children === "string" || typeof children === "number";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-0.5 border border-canvas px-1 font-medium shadow-sm transition-colors",
        placementClasses[placement],
        sizeClasses[size],
        colorClasses[color],
        !children && "size-2.5 min-h-2.5 min-w-2.5 rounded-full p-0",
        className,
      )}
      data-slot="badge"
      {...props}
    >
      {hasLabel ? <span className="px-0.5">{children}</span> : children}
    </span>
  );
}

Badge.Anchor = BadgeAnchor;

export { Badge, BadgeAnchor };
export type { BadgeProps, BadgeAnchorProps };
