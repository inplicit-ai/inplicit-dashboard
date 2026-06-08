"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type IntegrationStatus = "connected" | "disconnected" | "syncing";

export function VaultIntegrationsTab({ vaultId }: { vaultId: string | null }) {
  const [granolaStatus, setGranolaStatus] = useState<IntegrationStatus>("disconnected");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if Granola is already connected on mount
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
      } catch {
        // ignore — status stays disconnected
      }
    }
    void checkStatus();
  }, []);

  function handleConnect() {
    if (!vaultId) return;
    window.location.href = `/dapi/orgs/me/integrations/granola/connect?vault_id=${vaultId}`;
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
              {granolaStatus === "connected" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[length:var(--text-caption)] font-medium text-success">
                  <Check className="h-3 w-3" />
                  Verbunden
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[length:var(--text-body-sm)] text-fg-muted">
              Überträgt Call-Transkripte automatisch in diesen Kontext-Ordner.
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
            {granolaStatus === "disconnected" ? (
              <Button size="sm" onClick={handleConnect} disabled={!vaultId}>
                Verbinden
              </Button>
            ) : granolaStatus === "syncing" ? (
              <Button size="sm" variant="outline" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sync läuft…
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => void handleSync()}>
                Jetzt synchronisieren
              </Button>
            )}
          </div>
        </div>
      </Card>

      <p className="text-[length:var(--text-caption)] text-fg-subtle">
        Weitere Integrationen (Slack, Notion, …) folgen in Kürze.
      </p>
    </div>
  );
}
