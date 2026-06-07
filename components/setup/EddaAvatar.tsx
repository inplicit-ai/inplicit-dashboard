"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface EddaAvatarProps {
  size?: number;
  className?: string;
}

/**
 * EDDA's identity glyph in the setup chat. Renders the avatar image from the
 * conventional public path `/edda-avatar.png`, falling back gracefully to the
 * "E" letter badge (the original hardcoded design) when the asset is missing or
 * fails to load. No dependency added: a plain <img> + onError mirrors
 * `OrgAvatar`'s pattern so it works the moment the asset is dropped in.
 */
export function EddaAvatar({ size = 36, className }: EddaAvatarProps) {
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size };

  if (failed) {
    return (
      <span
        aria-label="EDDA"
        role="img"
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-fg text-[length:var(--text-body)] font-semibold text-canvas ring-1 ring-line",
          className,
        )}
        style={dim}
      >
        E
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-3xl ring-1 ring-line",
        className,
      )}
      style={dim}
    >
      {/* Plain <img> on purpose: a static public asset, so next/image's loader
          buys us nothing here and onError gives us the clean "E" fallback. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/edda-avatar.png"
        alt="EDDA"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
