import type { ReactNode } from "react";
import { StatusBadge as TonePill } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * PageChrome — the shared header vocabulary for every screen.
 *
 * White-modernist rebuild (claude.ai / Linear feel):
 *  • Eyebrow    → a calm 12px label, no leading dash, sentence-friendly tracking.
 *                 Amber stays the live signal only — eyebrows are tertiary ink.
 *  • PageHeader → a big, airy masthead: one confident SANS display title, an
 *                 optional muted subtitle, and a right-aligned action slot. No
 *                 §-glyph, no boxed card, no full-bleed rule. Whitespace carries it.
 *  • StatusBadge→ the localized domain-status pill, delegating tone to the shared
 *                 statusTone() map and rendering as a soft semantic pill.
 *
 * Public exports (Eyebrow / PageHeader / StatusBadge) and their prop contracts
 * are unchanged — only the composition is rebuilt onto the clean library.
 * ────────────────────────────────────────────────────────────────────────── */

// ─── Eyebrow ──────────────────────────────────────────────────────────────────

/**
 * Small calm label that opens a section or sits above a masthead title.
 * Tertiary ink, light tracking, no decorative dash — amber is the live signal
 * only, never a static label flourish.
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
        "inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.04em] leading-none text-fg-subtle",
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
 * The page masthead. A big confident SANS title carries the screen; an optional
 * muted subtitle/meta line sits below it; primary actions align right. Generous
 * air, no ruled box — the modern dashboard header.
 */
export function PageHeader({
  eyebrow,
  title,
  muted,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0 space-y-2">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="text-[length:var(--text-display)] font-semibold leading-[1.15] tracking-[-0.02em] text-fg sm:text-[2rem]">
            {title}
            {muted && (
              <>
                {" "}
                <span className="font-normal text-fg-subtle">{muted}</span>
              </>
            )}
          </h1>
          {meta && (
            <div className="max-w-[60ch] text-[length:var(--text-body-lg)] leading-relaxed text-fg-muted">
              {meta}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

/**
 * Domain status → German display label. Tone resolution is delegated to the
 * shared `statusTone()` primitive so the status→tone mapping lives in exactly
 * one place; this map only owns the localized copy. Renders as a soft pill.
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

export function StatusBadge({
  status,
  className,
  withIcon,
}: {
  status: string;
  className?: string;
  /** Lead with the status-disc glyph (passed through to the shared pill). */
  withIcon?: boolean;
}) {
  const label = STATUS_LABEL[status] ?? status;
  // Tone is resolved internally by the shared pill from the raw status string,
  // keeping the status→tone mapping authoritative in exactly one place.
  return (
    <TonePill
      status={status}
      label={label}
      withIcon={withIcon}
      className={className}
    />
  );
}
