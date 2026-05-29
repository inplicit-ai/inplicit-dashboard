"use client";

import type { AgentStatus, ConnState, Latency } from "./types";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";

interface Props {
  lang: Lang;
  agentStatus: AgentStatus;
  conn: ConnState;
  latency: Latency;
}

/** Agent-status pill + latency badge + connection dot (doc 04 §5.3). */
export function StatusHud({ lang, agentStatus, conn, latency }: Props) {
  const c = roomCopy(lang);
  const rt = latency.round_trip_ms;
  const latColor =
    rt == null
      ? "var(--color-text-quaternary)"
      : rt < 1000
        ? "var(--color-success)"
        : rt < 1500
          ? "var(--color-warning)"
          : "var(--color-danger)";

  return (
    <div className="iv-hud">
      <span className={`iv-pill iv-pill--${agentStatus}`}>
        {agentStatus === "thinking" ? (
          <span className="iv-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        ) : (
          <span
            className={`status-disc ${
              agentStatus === "listening"
                ? "status-disc--live status-disc--pulse"
                : "status-disc--idle"
            }`}
            aria-hidden
          />
        )}
        {c.status[agentStatus]}
      </span>

      <span className="iv-hud__conn">
        <span className={`iv-conndot iv-conndot--${connClass(conn)}`} aria-hidden />
        {connLabel(conn, c)}
      </span>

      {rt != null && (
        <span className="iv-hud__lat" style={{ color: latColor }}>
          {rt} ms
        </span>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .iv-hud { display: inline-flex; align-items: center; gap: var(--space-3); font-size: var(--text-meta); color: var(--color-text-secondary); }
        .iv-pill { display: inline-flex; align-items: center; gap: var(--space-2); padding: 4px var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--color-border); background: var(--color-surface-2); }
        .iv-pill--listening { color: var(--color-accent); border-color: var(--color-accent-muted); background: var(--color-accent-soft); }
        .iv-pill--speaking { color: var(--color-success); }
        .iv-dots { display: inline-flex; gap: 3px; }
        .iv-dots i { width: 4px; height: 4px; border-radius: 50%; background: var(--color-accent); animation: iv-bounce 1.1s var(--ease-smooth) infinite; }
        .iv-dots i:nth-child(2) { animation-delay: 0.15s; }
        .iv-dots i:nth-child(3) { animation-delay: 0.3s; }
        @keyframes iv-bounce { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }
        .iv-hud__conn { display: inline-flex; align-items: center; gap: var(--space-2); }
        .iv-conndot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .iv-conndot--ok { background: var(--color-success); }
        .iv-conndot--pending { background: var(--color-warning); }
        .iv-conndot--err { background: var(--color-danger); }
        .iv-hud__lat { font-variant-numeric: tabular-nums; font-family: var(--font-mono); }
        @media (prefers-reduced-motion: reduce) { .iv-dots i { animation: none; } }
      `,
        }}
      />
    </div>
  );
}

function connClass(conn: ConnState): "ok" | "pending" | "err" {
  if (conn === "open") return "ok";
  if (conn === "connecting" || conn === "reconnecting" || conn === "paused") return "pending";
  return "err";
}

function connLabel(conn: ConnState, c: ReturnType<typeof roomCopy>): string {
  if (conn === "open") return c.connected;
  if (conn === "reconnecting") return c.reconnecting;
  if (conn === "paused") return c.paused;
  if (conn === "connecting") return c.connecting;
  return c.reconnecting;
}
