"use client";

import { Avatar } from "@/components/ui/heroui-avatar";
import { cn } from "@/lib/utils";

interface EddaAvatarProps {
  size?: number;
  className?: string;
}

/**
 * EDDA's identity glyph in the setup chat, built on the heroui Radix avatar
 * (`components/ui/heroui-avatar`). It renders the image from the conventional
 * public path `/edda-avatar.png`; Radix automatically shows the "E" fallback
 * badge while the asset is missing or if it fails to load. The fallback uses the
 * "Resolved Instrument" tokens (`bg-fg` / `text-canvas`) so it stays on-brand.
 */
export function EddaAvatar({ size = 36, className }: EddaAvatarProps) {
  return (
    <Avatar
      className={cn("bg-fg ring-1 ring-line", className)}
      style={{ width: size, height: size }}
    >
      <Avatar.Image src="/edda-avatar.png" alt="EDDA" />
      <Avatar.Fallback className="bg-fg font-semibold text-canvas">
        E
      </Avatar.Fallback>
    </Avatar>
  );
}
