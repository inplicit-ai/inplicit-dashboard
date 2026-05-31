import { BackendDownError } from "@/lib/api";
import { StatusDisc } from "@/components/ui/status-disc";

/**
 * Error plate — reframed onto the status spine. The error disc sits on the same
 * x-axis as every other status disc; the message lands on negative space behind
 * a single hairline edge, no nested boxes, no shadow. BackendDownError opts up
 * to a labelled plate with the resolved API_URL as a mono spec line.
 */
export function ErrorState({ error }: { error: unknown }) {
  if (error instanceof BackendDownError) {
    return (
      <div
        role="alert"
        className="grid grid-cols-[var(--spine-w,28px)_1fr] gap-x-3 rounded-card border border-danger/22 bg-danger-soft px-4 py-4"
        style={{ ["--spine-w" as string]: "28px" }}
      >
        <span className="flex justify-center pt-0.5">
          <StatusDisc state="error" />
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-danger">
            Verbindung
          </p>
          <h2 className="body-sm font-semibold text-fg">
            Backend nicht erreichbar
          </h2>
          <p className="body-sm leading-relaxed text-fg-muted">
            {error.message}
          </p>
          <p className="pt-1 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
            API_URL
          </p>
          <code className="block break-all font-mono font-mono tabular-nums tabular-nums text-fg">
            {process.env.NEXT_PUBLIC_API_URL ?? "den Backend-Host"}
          </code>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="grid grid-cols-[var(--spine-w,28px)_1fr] items-start gap-x-3 rounded-ui border border-danger/22 bg-danger-soft px-3.5 py-3"
      style={{ ["--spine-w" as string]: "28px" }}
    >
      <span className="flex justify-center pt-0.5">
        <StatusDisc state="error" size="sm" />
      </span>
      <p className="min-w-0 break-words text-meta leading-snug text-danger">
        {error instanceof Error ? error.message : String(error)}
      </p>
    </div>
  );
}
