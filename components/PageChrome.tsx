import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  /** Second clause of a two-tone headline. */
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
    <header className="page-header">
      <div className="page-header__main">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="headline">
          {title}
          {muted && (
            <>
              {" "}
              <span className="headline__muted">{muted}</span>
            </>
          )}
        </h1>
        {meta && <p className="page-header__meta">{meta}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

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

const STATUS_VARIANT: Record<string, string> = {
  ACTIVE: "badge--success",
  COMPLETED: "badge--knowledge",
  COMPLETE: "badge--knowledge",
  IN_PROGRESS: "badge--opportunity",
  PROCESSING: "badge--gap",
  EXTRACTING: "badge--gap",
  CLUSTERING: "badge--gap",
  FALSIFYING: "badge--gap",
  ABANDONED: "badge--warning",
  FAILED: "badge--danger",
  VERIFIED: "badge--success",
  REJECTED: "badge--danger",
  EVOLVING: "badge--warning",
  PENDING: "badge--opportunity",
  SEED: "badge--knowledge",
  DRAFT: "badge--knowledge",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "";
  const label = STATUS_LABEL[status] ?? status;
  return <span className={`badge ${variant}`}>{label}</span>;
}
