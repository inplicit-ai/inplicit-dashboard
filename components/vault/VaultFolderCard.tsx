import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { DataChip } from "@/components/ui/data-chip";

/* ────────────────────────────────────────────────────────────────────────────
 * VaultFolderCard — a single folder tile on the Kontext-Vault hub (WHY-115).
 *
 * White-modernist: hairline border, soft shadow, gentle hover lift. The folder
 * icon sits in a calm rounded chip; the lone amber accent is reserved for the
 * count chip so the hub reads quiet. A `comingSoon` folder renders greyed and
 * non-interactive.
 *
 * Server-safe: no "use client" (the hover lift is the Card's CSS transform).
 * ────────────────────────────────────────────────────────────────────────── */

type FolderIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export interface VaultFolderCardProps {
  href: string;
  icon: FolderIcon;
  title: string;
  description: string;
  /** Optional tabular-nums count rendered as the lone accent chip. */
  count?: number;
  /** When true: greyed, non-interactive, shows the `comingSoonLabel` badge. */
  comingSoon?: boolean;
  comingSoonLabel?: string;
}

export function VaultFolderCard({
  href,
  icon: Icon,
  title,
  description,
  count,
  comingSoon = false,
  comingSoonLabel,
}: VaultFolderCardProps) {
  const body = (
    <Card
      interactive={!comingSoon}
      className={cn(
        "h-full gap-4 p-5",
        comingSoon && "pointer-events-none opacity-55",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui border border-line bg-surface-2 text-fg-muted">
          <Icon size={18} aria-hidden />
        </span>
        {comingSoon ? (
          <DataChip tone="neutral">{comingSoonLabel}</DataChip>
        ) : count !== undefined ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-accent/25 bg-accent-soft px-2 py-0.5 text-[length:var(--text-caption)] font-medium tabular-nums text-accent">
            {count}
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold tracking-[-0.01em] text-fg">{title}</h3>
        <p className="mt-1 text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted">
          {description}
        </p>
      </div>
    </Card>
  );

  if (comingSoon) {
    return (
      <div aria-disabled className="block">
        {body}
      </div>
    );
  }
  return (
    <Link href={href} className="group block">
      {body}
    </Link>
  );
}
