"use client";

import { Avatar } from "@/components/ui/heroui-avatar";
import { cn } from "@/lib/utils";

interface EddaAvatarProps {
  size?: number;
  className?: string;
}

/**
 * EDDA's identity glyph — a self-contained vector mark (no image asset). A node
 * with two concentric arcs opening to the right reads as a "voice / listening"
 * mark, fitting for the interviewer AI. Drawn in `currentColor` so it inherits
 * the avatar's `text-canvas` on the `bg-fg` field and adapts to light/dark.
 */
function EddaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="10.5" cy="12" r="1.9" fill="currentColor" stroke="none" />
      <path d="M13.4 8.6 A 4.5 4.5 0 0 1 13.4 15.4" />
      <path d="M15.3 6.3 A 7.5 7.5 0 0 1 15.3 17.7" />
    </svg>
  );
}

/**
 * EDDA's avatar in the setup chat: the vector mark on the brand field, using the
 * heroui Radix avatar container for the rounded shape + ring.
 */
export function EddaAvatar({ size = 36, className }: EddaAvatarProps) {
  return (
    <Avatar
      className={cn("bg-fg text-canvas ring-1 ring-line", className)}
      style={{ width: size, height: size }}
    >
      <EddaMark className="h-[55%] w-[55%]" />
    </Avatar>
  );
}
