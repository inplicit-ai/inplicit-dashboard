import { TriangleAlert } from "lucide-react";
import { BackendDownError } from "@/lib/api";

/**
 * Error plate — white-modernist soft-danger card. A lucide alert icon in a soft
 * circle leads a calm sans message. The BackendDownError variant adds a labelled
 * API_URL line (the only mono, as it is a literal host/code).
 */
export function ErrorState({ error }: { error: unknown }) {
  if (error instanceof BackendDownError) {
    return (
      <div
        role="alert"
        className="flex gap-3.5 rounded-card border border-danger/22 bg-danger-soft p-5"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
          <TriangleAlert aria-hidden className="h-5 w-5 text-danger" />
        </span>
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-[length:var(--text-body-lg)] font-semibold text-fg">
            Backend nicht erreichbar
          </h2>
          <p className="text-[length:var(--text-body)] leading-relaxed text-fg-muted">
            {error.message}
          </p>
          <div className="pt-1">
            <p className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
              API_URL
            </p>
            <code className="mt-0.5 block break-all font-mono text-[length:var(--text-mono)] text-fg">
              {process.env.NEXT_PUBLIC_API_URL ?? "den Backend-Host"}
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-ui border border-danger/22 bg-danger-soft px-3.5 py-3"
    >
      <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <p className="min-w-0 break-words text-[length:var(--text-meta)] leading-snug text-danger">
        {error instanceof Error ? error.message : String(error)}
      </p>
    </div>
  );
}
