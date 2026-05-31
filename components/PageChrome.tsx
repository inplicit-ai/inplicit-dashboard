import type { ReactNode } from "react";
import { DataChip } from "@/components/ui/data-chip";
import { statusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * PageChrome — the shared masthead vocabulary for every instrument screen.
 *
 * Reframed onto the Research Ledger discipline:
 *  • Eyebrow    → the universal tracked-uppercase TERTIARY folio voice (amber is
 *                 reserved for the single live object, never a static label).
 *  • PageHeader → a folio masthead: one display title, a tracked eyebrow index,
 *                 a mono spec meta line, and an action slot — set off by a single
 *                 full-bleed hairline rule, not a boxed card.
 *  • StatusBadge→ the localized domain-status chip, delegating tone to the shared
 *                 statusTone() map and rendering through the canonical DataChip.
 *
 * Public exports (Eyebrow / PageHeader / StatusBadge) and their prop contracts
 * are unchanged — only the composition is rebuilt.
 * ────────────────────────────────────────────────────────────────────────── */

// ─── Eyebrow ──────────────────────────────────────────────────────────────────

/**
 * Small uppercase tracked label — the folio voice that opens a section or sits
 * above a masthead title. Monochrome tertiary ink (Braun discipline): amber is
 * the live signal only, never decoration on a static label.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] leading-none text-fg-subtle",
        "before:block before:h-px before:w-3 before:bg-current before:opacity-50",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  /** Second clause of a two-tone headline — rendered with muted color. */
  muted?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

/**
 * The masthead folio. Title carries the lone display weight on the screen; the
 * eyebrow is the tracked-caps index; the meta line is the supporting spec. The
 * whole header is closed by a single hairline rule so the page reads as one
 * ruled instrument — never a floating titled card.
 */
export function PageHeader({
  eyebrow,
  title,
  muted,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-8 border-b border-line pb-5">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0 space-y-3">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.022em] text-fg sm:text-4xl">
            {title}
            {muted && (
              <>
                {" "}
                <span className="font-normal text-fg-subtle">{muted}</span>
              </>
            )}
          </h1>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {meta && (
        <div className="mt-4 max-w-[68ch] text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted">
          {meta}
        </div>
      )}
    </header>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

/**
 * Domain status → German display label. Tone resolution is delegated to the
 * shared `statusTone()` primitive (design-contract §3) so the status→tone
 * mapping lives in exactly one place; this map only owns the localized copy.
 */
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  COMPLETED: "Abgeschlossen",
  IN_PROGRESS: "Läuft",
  ABANDONED: "Abgebrochen",
  FAILED: "Fehler",
  PROCESSING: "Wird ausgewertet",
  PENDING: "In Validierung",
  SEED: "Frisch extrahiert",
  EVOLVING: "Im Wandel",
  VERIFIED: "Verifiziert",
  REJECTED: "Verworfen",
  COMPLETE: "Abgeschlossen",
  EXTRACTING: "Extraktion",
  CLUSTERING: "Clustering",
  FALSIFYING: "Validierung",
};

/** tone → DataChip tint (the canonical square data-chip, tint-only). */
const TONE_CHIP: Record<
  ReturnType<typeof statusTone>,
  React.ComponentProps<typeof DataChip>["tone"]
> = {
  success: "success",
  opportunity: "opportunity",
  warning: "warning",
  danger: "danger",
  neutral: "neutral",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const label = STATUS_LABEL[status] ?? status;
  return (
    <DataChip tone={TONE_CHIP[statusTone(status)]} className={className}>
      {label}
    </DataChip>
  );
}
