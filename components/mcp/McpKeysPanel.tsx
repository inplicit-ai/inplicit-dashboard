"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ApiKeyRow {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

/**
 * MCP hub panel: connection info + API key management. Keys are org-scoped
 * bearer credentials for the backend's MCP server (POST /api/mcp); the raw
 * key is shown exactly once after creation — the backend stores only a hash.
 */
export function McpKeysPanel({ endpoint }: { endpoint: string }) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/dapi/orgs/me/api-keys");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setKeys((await res.json()) as ApiKeyRow[]);
    } catch {
      setError("Schlüssel konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createKey() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    setFreshKey(null);
    try {
      const res = await fetch("/dapi/orgs/me/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = (await res.json().catch(() => ({}))) as { key?: string; error?: string };
      if (!res.ok || !body.key) throw new Error(body.error ?? `HTTP ${res.status}`);
      setFreshKey(body.key);
      setName("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    setError(null);
    try {
      const res = await fetch(`/dapi/orgs/me/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable — user can select manually
    }
  }

  const claudeCmd = `claude mcp add --transport http inplicit ${endpoint} --header "Authorization: Bearer <API-Key>"`;
  const active = keys.filter((k) => !k.revoked_at);

  return (
    <div className="space-y-4">
      {/* Connection info */}
      <Card className="space-y-3 p-5">
        <h2 className="font-semibold text-fg">Verbindung</h2>
        <p className="text-[length:var(--text-body-sm)] text-fg-muted">
          Inplicit stellt einen MCP-Server bereit (Streamable HTTP, nur lesend).
          Endpoint und Beispiel für Claude Code:
        </p>
        {[
          { label: "Endpoint", value: endpoint },
          { label: "Claude Code", value: claudeCmd },
        ].map((row) => (
          <div key={row.label} className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
              {row.label}
            </p>
            <div className="flex items-center gap-2 rounded-ui border border-line bg-surface-2 px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg">
                {row.value}
              </code>
              <button
                type="button"
                onClick={() => void copy(row.value, row.label)}
                className="shrink-0 text-fg-subtle hover:text-fg"
                title="Kopieren"
              >
                <Copy size={13} />
              </button>
              {copied === row.label && (
                <span className="text-[11px] text-success">Kopiert</span>
              )}
            </div>
          </div>
        ))}
        <p className="text-[length:var(--text-caption)] text-fg-subtle">
          Verfügbare Tools: Kampagnen, Insights, Hypothesen, Interview-Transkripte
          (pseudonym) und semantische Kontext-Suche.
        </p>
      </Card>

      {/* Key management */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-fg-muted" aria-hidden />
          <h2 className="font-semibold text-fg">API-Schlüssel</h2>
        </div>

        {freshKey && (
          <div className="space-y-1 rounded-ui border border-success/40 bg-success-soft p-3">
            <p className="text-[length:var(--text-caption)] font-medium text-success">
              Schlüssel erstellt — er wird nur dieses eine Mal angezeigt:
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg">
                {freshKey}
              </code>
              <button
                type="button"
                onClick={() => void copy(freshKey, "key")}
                className="shrink-0 text-fg-subtle hover:text-fg"
                title="Kopieren"
              >
                <Copy size={13} />
              </button>
              {copied === "key" && <span className="text-[11px] text-success">Kopiert</span>}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="z. B. Claude Desktop"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void createKey()}
            className="min-w-0 flex-1 rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
          />
          <Button size="sm" onClick={() => void createKey()} disabled={creating || !name.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Erstellen
          </Button>
        </div>

        {error && (
          <p className="text-[length:var(--text-caption)] text-danger" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-[length:var(--text-caption)] text-fg-subtle">Lade…</p>
        ) : active.length === 0 ? (
          <p className="text-[length:var(--text-caption)] text-fg-subtle">
            Noch keine Schlüssel. Erstelle einen, um Claude zu verbinden.
          </p>
        ) : (
          <ul className="divide-y divide-line-subtle">
            {active.map((k) => (
              <li key={k.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg">{k.name}</p>
                  <p className="text-[length:var(--text-caption)] text-fg-subtle">
                    Erstellt {new Date(k.created_at).toLocaleDateString("de-DE")}
                    {k.last_used_at
                      ? ` · zuletzt genutzt ${new Date(k.last_used_at).toLocaleDateString("de-DE")}`
                      : " · noch nie genutzt"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revokeKey(k.id)}
                  className="shrink-0 text-fg-subtle transition-colors hover:text-danger"
                  title="Widerrufen"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
