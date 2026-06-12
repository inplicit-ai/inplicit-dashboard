"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type IntegrationStatus = "connected" | "disconnected" | "connecting" | "syncing";

export function VaultIntegrationsTab() {
  const [granolaStatus, setGranolaStatus] = useState<IntegrationStatus>("disconnected");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [notionConnected, setNotionConnected] = useState(false);
  const [notionLastSynced, setNotionLastSynced] = useState<string | null>(null);

  // Check which integrations are already connected on mount.
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/dapi/orgs/me/integrations");
        if (!res.ok) return;
        const data = (await res.json()) as Array<{
          key: string;
          installed: boolean;
          status: string | null;
          config: { last_synced_at?: string } | null;
        }>;
        const granola = data.find((i) => i.key === "granola");
        if (granola?.installed && granola.status === "CONNECTED") {
          setGranolaStatus("connected");
          setLastSynced(granola.config?.last_synced_at ?? null);
        }
        const notion = data.find((i) => i.key === "notion");
        if (notion?.installed && notion.status === "CONNECTED") {
          setNotionConnected(true);
          setNotionLastSynced(notion.config?.last_synced_at ?? null);
        }
      } catch {
        // ignore — status stays disconnected
      }
    }
    void checkStatus();
  }, []);

  // One-click login: ask the backend for the Granola authorization URL (which it
  // builds after registering an OAuth client + PKCE), then send the browser there.
  async function handleConnect() {
    setGranolaStatus("connecting");
    setError(null);
    try {
      // The backend resolves the org's single vault itself — no vault_id param.
      const res = await fetch(
        `/dapi/orgs/me/integrations/granola/connect`,
        { headers: { accept: "application/json" } },
      );
      // The response may not be JSON (e.g. an HTML 502/504 from the proxy if the
      // backend is slow/unreachable) — read text and parse defensively so the
      // user sees a real status instead of a cryptic "Unexpected token '<'".
      const body = await res.text();
      let data: { authorize_url?: string; error?: string } = {};
      try {
        data = JSON.parse(body) as { authorize_url?: string; error?: string };
      } catch {
        throw new Error(
          res.status === 401
            ? "Sitzung abgelaufen — bitte Seite neu laden und erneut anmelden."
            : `Verbindung zu Granola fehlgeschlagen (HTTP ${res.status}). Bitte erneut versuchen.`,
        );
      }
      if (!res.ok || !data.authorize_url) {
        throw new Error(data.error ?? `Verbindung fehlgeschlagen (HTTP ${res.status}).`);
      }
      window.location.href = data.authorize_url;
    } catch (e) {
      setError((e as Error).message);
      setGranolaStatus("disconnected");
    }
  }

  async function handleSync() {
    setGranolaStatus("syncing");
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/dapi/orgs/me/integrations/granola/sync", {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; synced?: number; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSyncResult({ synced: data.synced ?? 0 });
      setLastSynced(new Date().toISOString());
      setGranolaStatus("connected");
    } catch (e) {
      setError((e as Error).message);
      setGranolaStatus("connected");
    }
  }

  const connected = granolaStatus === "connected";
  const syncing = granolaStatus === "syncing";
  const connecting = granolaStatus === "connecting";

  return (
    <div className="space-y-3">
      {/* Granola card */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          {/* Granola logo */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-[18px] font-bold text-fg">
            G
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-fg">Granola</p>
              {connected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[length:var(--text-caption)] font-medium text-success">
                  <Check className="h-3 w-3" />
                  Verbunden
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[length:var(--text-body-sm)] text-fg-muted">
              Mit einem Klick verbinden — danach landen neue Call-Transkripte
              automatisch in diesem Kontext-Ordner.
            </p>

            {lastSynced && (
              <p className="mt-1 text-[length:var(--text-caption)] text-fg-subtle">
                Zuletzt synchronisiert:{" "}
                {new Date(lastSynced).toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {syncResult !== null && (
              <p className="mt-1 text-[length:var(--text-caption)] text-success">
                ✓{" "}
                {syncResult.synced === 0
                  ? "Keine neuen Calls seit dem letzten Sync."
                  : `${syncResult.synced} neue Call${syncResult.synced !== 1 ? "s" : ""} importiert.`}
              </p>
            )}

            {error && (
              <p className="mt-1 text-[length:var(--text-caption)] text-danger">{error}</p>
            )}
          </div>

          {/* Action button */}
          <div className="shrink-0">
            {connected ? (
              <div className="flex flex-col items-end gap-1.5">
                <Button size="sm" variant="outline" onClick={() => void handleSync()}>
                  Jetzt synchronisieren
                </Button>
                <button
                  type="button"
                  onClick={() => void handleConnect()}
                  className="text-[length:var(--text-caption)] text-fg-subtle underline-offset-2 hover:text-fg hover:underline"
                >
                  Anderes Konto verbinden
                </button>
              </div>
            ) : syncing ? (
              <Button size="sm" variant="outline" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sync läuft…
              </Button>
            ) : connecting ? (
              <Button size="sm" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verbinde…
              </Button>
            ) : (
              <Button size="sm" onClick={() => void handleConnect()}>
                Verbinden
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Notion card */}
      <NotionCard
        connected={notionConnected}
        lastSynced={notionLastSynced}
        onConnected={(syncedAt) => {
          setNotionConnected(true);
          setNotionLastSynced(syncedAt);
        }}
      />

      {/* More integrations coming soon */}
      <p className="text-[length:var(--text-caption)] text-fg-subtle">
        Weitere Integrationen (Google Drive, Jira, …) folgen in Kürze.
      </p>
    </div>
  );
}

/**
 * Notion — org-installed connector. The admin pastes an internal-integration
 * token (ntn_…); the backend validates + stores it (redacted on read) and the
 * hourly sync pulls every page shared with the integration into this vault.
 */
function NotionCard({
  connected,
  lastSynced,
  onConnected,
}: {
  connected: boolean;
  lastSynced: string | null;
  onConnected: (syncedAt: string) => void;
}) {
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<"connecting" | "syncing" | null>(null);
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (!token.trim()) return;
    setBusy("connecting");
    setError(null);
    try {
      // The backend attaches the org's single vault — no vault_id in config.
      const res = await fetch("/dapi/orgs/me/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "notion",
          config: { api_key: token.trim() },
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? `Verbindung fehlgeschlagen (HTTP ${res.status}).`);
      }
      setToken("");
      setShowTokenInput(false);
      onConnected(new Date().toISOString());
      // First import right away so the user sees content without waiting an hour.
      await runSync();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runSync() {
    setBusy("syncing");
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/dapi/orgs/me/integrations/notion/sync", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; synced?: number; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSyncResult({ synced: data.synced ?? 0 });
      onConnected(new Date().toISOString());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-[18px] font-bold text-fg">
          N
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-fg">Notion</p>
            {connected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[length:var(--text-caption)] font-medium text-success">
                <Check className="h-3 w-3" />
                Verbunden
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[length:var(--text-body-sm)] text-fg-muted">
            Interne Integration verbinden — alle mit ihr geteilten Seiten landen
            automatisch in diesem Kontext-Ordner.
          </p>

          {lastSynced && (
            <p className="mt-1 text-[length:var(--text-caption)] text-fg-subtle">
              Zuletzt synchronisiert:{" "}
              {new Date(lastSynced).toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          {syncResult !== null && (
            <p className="mt-1 text-[length:var(--text-caption)] text-success">
              ✓{" "}
              {syncResult.synced === 0
                ? "Keine neuen Seiten seit dem letzten Sync."
                : `${syncResult.synced} Seite${syncResult.synced !== 1 ? "n" : ""} importiert.`}
            </p>
          )}

          {error && (
            <p className="mt-1 text-[length:var(--text-caption)] text-danger" role="alert">
              {error}
            </p>
          )}

          {showTokenInput && !connected && (
            <div className="mt-3 flex flex-col gap-2">
              <input
                type="password"
                placeholder="ntn_…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleConnect()}
                autoFocus
                className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
              />
              <p className="text-[length:var(--text-caption)] text-fg-subtle">
                Token unter{" "}
                <a
                  href="https://www.notion.so/my-integrations"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-fg"
                >
                  notion.so/my-integrations
                </a>{" "}
                erstellen (Lesezugriff genügt) und die gewünschten Seiten mit der
                Integration teilen.
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0">
          {connected ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runSync()}
              disabled={busy !== null}
            >
              {busy === "syncing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sync läuft…
                </>
              ) : (
                "Jetzt synchronisieren"
              )}
            </Button>
          ) : showTokenInput ? (
            <Button
              size="sm"
              onClick={() => void handleConnect()}
              disabled={!token.trim() || busy !== null}
            >
              {busy === "connecting" || busy === "syncing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verbinde…
                </>
              ) : (
                "Token speichern"
              )}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowTokenInput(true)}>
              Verbinden
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
