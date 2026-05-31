"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, useTabs } from "@/components/ui/tabs"

/* ────────────────────────────────────────────────────────────────────────────
 * BadgeTabs — pill tabs with a sliding active background + count badges
 * (the user's BadgeTabs, retuned to our tokens; amber is NOT used here —
 * the active pill is a neutral white surface lift).
 *
 * Built on the dep-free Tabs primitive. The active background is a single
 * framer-motion <motion.span layoutId> that slides between triggers; under
 * prefers-reduced-motion the layout animation is dropped (the pill simply
 * snaps to the active trigger).
 * ────────────────────────────────────────────────────────────────────────── */

export interface BadgeTabItem {
  value: string
  label: string
  count?: number
}

export interface BadgeTabsProps {
  items: BadgeTabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Unique per BadgeTabs instance so multiple groups don't share a layoutId. */
  layoutId?: string
  className?: string
}

export function BadgeTabs({
  items,
  value,
  defaultValue,
  onValueChange,
  layoutId = "badge-tab-pill",
  className,
}: BadgeTabsProps) {
  const fallback = defaultValue ?? items[0]?.value ?? ""
  return (
    <Tabs
      value={value}
      defaultValue={value === undefined ? fallback : undefined}
      onValueChange={onValueChange}
    >
      <TabsList
        className={cn(
          "gap-1 rounded-full border border-line-subtle bg-surface-2 p-1",
          className
        )}
      >
        {items.map((item) => (
          <BadgeTabTrigger key={item.value} item={item} layoutId={layoutId} />
        ))}
      </TabsList>
    </Tabs>
  )
}

function BadgeTabTrigger({
  item,
  layoutId,
}: {
  item: BadgeTabItem
  layoutId: string
}) {
  const reduceMotion = useReducedMotion()
  const { value } = useTabs()
  const isActive = value === item.value

  return (
    <TabsTrigger
      value={item.value}
      className={cn(
        "relative flex h-8 items-center rounded-full px-3.5 text-[length:var(--text-meta)] font-medium transition-colors",
        isActive ? "text-fg" : "text-fg-muted hover:text-fg"
      )}
    >
      {isActive && (
        <motion.span
          layoutId={reduceMotion ? undefined : layoutId}
          aria-hidden
          className="absolute inset-0 rounded-full bg-surface shadow-sm"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative z-10">{item.label}</span>
      {item.count !== undefined && (
        <span className="relative z-10 ml-1.5 inline-flex items-center rounded-full bg-surface-2 px-1.5 text-[length:var(--text-caption)] tabular-nums text-fg-subtle">
          {item.count}
        </span>
      )}
    </TabsTrigger>
  )
}
