import type { ReactNode } from "react";
import { statusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

// ─── Eyebrow ──────────────────────────────────────────────────────────────────

/**
 * Small uppercase label that sits above a headline. Brand styling: accent
 * color + a short leading rule (the `before:` pseudo-element below).
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
        "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] leading-none text-accent",
        "before:block before:h-px before:w-3.5 before:bg-current before:opacity-60",
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

export function PageHeader({
  eyebrow,
  title,
  muted,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row">
      <div className="min-w-0 space-y-3">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-3xl font-medium leading-[1.08] tracking-[-0.025em] text-fg sm:text-4xl">
          {title}
          {muted && (
            <>
              {" "}
              <span className="font-normal text-fg-subtle">{muted}</span>
            </>
          )}
        </h1>
        {meta && (
          <div className="max-w-[60ch] text-sm leading-relaxed text-fg-muted">
            {meta}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
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

/** tone → design.css `.badge--*` class (one border per edge, token-tuned). */
const TONE_BADGE: Record<ReturnType<typeof statusTone>, string> = {
  success: "badge badge--success",
  opportunity: "badge badge--opportunity",
  warning: "badge badge--warning",
  danger: "badge badge--danger",
  neutral: "badge badge--knowledge",
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
    <span className={cn(TONE_BADGE[statusTone(status)], className)}>
      {label}
    </span>
  );
}
