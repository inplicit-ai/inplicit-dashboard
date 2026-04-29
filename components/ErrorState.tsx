import { BackendDownError } from "../lib/api.ts";

export function ErrorState({ error }: { error: unknown }) {
  if (error instanceof BackendDownError) {
    return (
      <div class="card card--compact" style="border-color: var(--color-pain-muted); background: var(--color-pain-soft);">
        <span class="eyebrow" style="color: var(--color-pain)">Verbindung</span>
        <h2 class="subtitle" style="margin-top: var(--space-2)">
          Backend nicht erreichbar
        </h2>
        <p class="body-sm" style="margin-top: var(--space-2)">{error.message}</p>
        <div
          class="mono"
          style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-ui); padding: var(--space-3); margin-top: var(--space-4); color: var(--color-text-secondary);"
        >
          cd inplicit-backend && cargo run
        </div>
        <p class="caption" style="margin-top: var(--space-3)">
          Erwartet Backend auf Port 8080. API_URL ggf. anpassen via env.
        </p>
      </div>
    );
  }

  return (
    <div class="flash flash--err">
      {error instanceof Error ? error.message : String(error)}
    </div>
  );
}
