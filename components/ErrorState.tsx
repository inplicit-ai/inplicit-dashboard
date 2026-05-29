import { AlertCircle, ServerOff } from "lucide-react";
import { BackendDownError } from "@/lib/api";

export function ErrorState({ error }: { error: unknown }) {
  if (error instanceof BackendDownError) {
    return (
      <div
        role="alert"
        className="card card--pain flex items-start gap-4"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-ui border border-pain-muted bg-canvas text-pain">
          <ServerOff className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="label-eyebrow text-pain">Verbindung</p>
          <h2 className="title text-fg">
            Backend nicht erreichbar
          </h2>
          <p className="body-sm leading-relaxed text-fg-muted">
            {error.message}
          </p>
          <p className="pt-1 text-caption text-fg-subtle">
            API_URL ist auf{" "}
            <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-mono text-fg tabular-nums">
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
      className="flex items-start gap-3 rounded-ui border border-pain-muted bg-pain-soft px-4 py-3 text-meta text-pain"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-snug">
        {error instanceof Error ? error.message : String(error)}
      </p>
    </div>
  );
}
