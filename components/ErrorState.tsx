import { BackendDownError } from "@/lib/api";

export function ErrorState({ error }: { error: unknown }) {
  if (error instanceof BackendDownError) {
    return (
      <div
        className="card card--compact"
        style={{
          borderColor: "var(--color-pain-muted)",
          background: "var(--color-pain-soft)",
        }}
      >
        <span className="eyebrow" style={{ color: "var(--color-pain)" }}>
          Verbindung
        </span>
        <h2 className="subtitle" style={{ marginTop: "var(--space-2)" }}>
          Backend nicht erreichbar
        </h2>
        <p className="body-sm" style={{ marginTop: "var(--space-2)" }}>
          {error.message}
        </p>
        <p className="caption" style={{ marginTop: "var(--space-3)" }}>
          API_URL ist auf <code>{process.env.NEXT_PUBLIC_API_URL ?? "den Backend-Host"}</code> gesetzt.
        </p>
      </div>
    );
  }

  return (
    <div className="flash flash--err">
      {error instanceof Error ? error.message : String(error)}
    </div>
  );
}
