"use client";

import { cn } from "@/lib/utils";

export type EddaStatus = "ready" | "writing" | "error";

interface EddaAvatarProps {
  size?: number;
  status?: EddaStatus;
  className?: string;
}

/**
 * edda's identity — a glowing orb in the inplicit brand (accent/orange), drawn
 * purely in CSS (no image asset). A status node sits in the bottom-right corner:
 *   • ready   → a green dot ("edda is here")
 *   • writing → a small pill with three bobbing dots
 *   • error   → a red dot
 */
export function EddaAvatar({ size = 36, status = "ready", className }: EddaAvatarProps) {
  return (
    <span
      role="img"
      aria-label={`Edda — ${status}`}
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden
        className="size-full rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, color-mix(in oklab, var(--color-accent) 8%, #ffffff) 0%, var(--color-accent-strong) 32%, var(--color-accent) 64%, color-mix(in oklab, var(--color-accent) 60%, #000000) 100%)",
          boxShadow:
            "inset 0 0 6px -1px color-mix(in oklab, #ffffff 55%, transparent), 0 1px 12px -2px color-mix(in oklab, var(--color-accent) 60%, transparent)",
        }}
      />
      <StatusNode status={status} />
    </span>
  );
}

function StatusNode({ status }: { status: EddaStatus }) {
  if (status === "writing") {
    return (
      <span className="absolute -bottom-1 -right-1.5 inline-flex items-center gap-[3px] rounded-full bg-surface px-1.5 py-1 shadow-sm ring-2 ring-canvas">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="edda-typing-dot size-1 rounded-full bg-fg-muted"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-canvas",
        status === "error" ? "bg-danger" : "bg-success",
      )}
    />
  );
}
