import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
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

type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "opportunity"
  | "knowledge";

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success",
  COMPLETED: "knowledge",
  COMPLETE: "knowledge",
  IN_PROGRESS: "opportunity",
  PROCESSING: "info",
  EXTRACTING: "info",
  CLUSTERING: "info",
  FALSIFYING: "info",
  ABANDONED: "warning",
  FAILED: "danger",
  VERIFIED: "success",
  REJECTED: "danger",
  EVOLVING: "warning",
  PENDING: "opportunity",
  SEED: "knowledge",
  DRAFT: "neutral",
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-line bg-surface-2 text-fg-muted",
  info: "border-transparent bg-gap-soft text-gap",
  success: "border-transparent bg-success-soft text-success",
  warning: "border-transparent bg-warning/15 text-warning",
  danger: "border-transparent bg-danger-soft text-danger",
  opportunity: "border-transparent bg-accent-soft text-accent-strong",
  knowledge: "border-line bg-canvas text-fg",
};

export function StatusBadge({
  status,
  className,
  ...rest
}: { status: string } & Omit<BadgeProps, "variant" | "children">) {
  const tone = STATUS_TONE[status] ?? "neutral";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <Badge
      variant="outline"
      className={cn(TONE_CLASS[tone], "font-medium", className)}
      {...rest}
    >
      {label}
    </Badge>
  );
}
