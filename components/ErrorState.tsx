import { AlertCircle, ServerOff } from "lucide-react";
import { BackendDownError } from "@/lib/api";

export function ErrorState({ error }: { error: unknown }) {
  if (error instanceof BackendDownError) {
    return (
      <div
        role="alert"
        className="flex items-start gap-4 rounded-card border border-pain-muted bg-pain-soft p-5"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pain/15 text-pain">
          <ServerOff className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pain">
            Verbindung
          </p>
          <h2 className="text-base font-semibold text-fg">
            Backend nicht erreichbar
          </h2>
          <p className="text-sm text-fg-muted">{error.message}</p>
          <p className="pt-1 text-xs text-fg-subtle">
            API_URL ist auf{" "}
            <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg">
              {process.env.NEXT_PUBLIC_API_URL ?? "den Backend-Host"}
            </code>{" "}
            gesetzt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-ui border border-pain/30 bg-pain-soft px-3.5 py-2.5 text-sm text-pain"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-snug">
        {error instanceof Error ? error.message : String(error)}
      </p>
    </div>
  );
}
