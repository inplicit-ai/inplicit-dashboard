"use client";

import { StatusDisc, type StatusState } from "@/components/ui/status-disc";
import { DataChip } from "@/components/ui/data-chip";
import type { AgentStatus, ConnState, Latency, Phase } from "./types";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";

interface Props {
  lang: Lang;
  agentStatus: AgentStatus;
  conn: ConnState;
  latency: Latency;
  phase?: Phase;
}

const PHASE_LABEL: Record<Phase, Record<Lang, string>> = {
  open: { de: "PHASE 1 · OFFEN", en: "PHASE 1 · OPEN", fr: "PHASE 1 · OUVERT", es: "PHASE 1 · ABIERTO" },
  validation: {
    de: "PHASE 2 · VALIDIERUNG",
    en: "PHASE 2 · VALIDATION",
    fr: "PHASE 2 · VALIDATION",
    es: "PHASE 2 · VALIDACIÓN",
  },
};

/**
 * StatusHud — the live state on a tiny spine (manifesto: interview-experience).
 *
 * One canonical amber pulse: a StatusDisc(live) while listening + the status
 * word, a phase DataChip, then a monochrome connection/latency readout. Amber
 * never appears except on the single live disc.
 */
export function StatusHud({ lang, agentStatus, conn, latency, phase }: Props) {
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

  // Live (amber pulse) only while the agent is actively listening for the
  // participant. Thinking / speaking are monochrome — amber means the floor is
  // the participant's.
  const discState: StatusState = agentStatus === "listening" ? "live" : "idle";

  return (
    <div className="iv-hud">
      <span className="iv-hud__state">
        <StatusDisc state={discState} size="sm" />
        <span className="iv-hud__state-label">{c.status[agentStatus]}</span>
      </span>

      {phase && (
        <DataChip tone="neutral">{PHASE_LABEL[phase][lang]}</DataChip>
      )}

      <span className="iv-hud__rule" aria-hidden />

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
        .iv-hud { display: inline-flex; align-items: center; gap: var(--space-3); font-size: var(--text-meta); color: var(--color-text-tertiary); }
        .iv-hud__state { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--color-text-secondary); }
        .iv-hud__state-label { font-size: var(--text-eyebrow); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }
        .iv-hud__rule { width: 1px; height: 14px; background: var(--color-border); }
        .iv-hud__conn { display: inline-flex; align-items: center; gap: var(--space-2); }
        .iv-conndot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .iv-conndot--ok { background: var(--color-success); }
        .iv-conndot--pending { background: var(--color-warning); }
        .iv-conndot--err { background: var(--color-danger); }
        .iv-hud__lat { font-variant-numeric: tabular-nums; font-family: var(--font-mono); }
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
