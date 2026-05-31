"use client";

import { StatusDisc, type StatusState } from "@/components/ui/status-disc";
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
  open: { de: "Phase 1 · Offen", en: "Phase 1 · Open", fr: "Phase 1 · Ouvert", es: "Phase 1 · Abierto" },
  validation: {
    de: "Phase 2 · Validierung",
    en: "Phase 2 · Validation",
    fr: "Phase 2 · Validation",
    es: "Phase 2 · Validación",
  },
};

/**
 * StatusHud — the live state readout (white-modernist).
 *
 * One canonical amber pulse: a StatusDisc(live) while listening + the status
 * word, a soft phase pill, then a calm connection dot + sans tabular-nums
 * latency readout. Amber appears only on the single live disc.
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
  // participant. Thinking / speaking are monochrome.
  const discState: StatusState = agentStatus === "listening" ? "live" : "idle";

  const dotColor =
    conn === "open"
      ? "var(--color-success)"
      : conn === "connecting" || conn === "reconnecting" || conn === "paused"
        ? "var(--color-warning)"
        : "var(--color-danger)";

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[length:var(--text-meta)] text-fg-subtle">
      <span className="inline-flex items-center gap-2 font-medium text-fg-muted">
        <StatusDisc state={discState} size="sm" />
        {c.status[agentStatus]}
      </span>

      {phase && (
        <span className="rounded-full border border-line-subtle bg-surface-2 px-2.5 py-0.5 text-[length:var(--text-caption)] font-medium text-fg-muted">
          {PHASE_LABEL[phase][lang]}
        </span>
      )}

      <span aria-hidden className="h-3.5 w-px bg-line" />

      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: dotColor }}
        />
        {connLabel(conn, c)}
      </span>

      {rt != null && (
        <span className="tabular-nums" style={{ color: latColor }}>
          {rt} ms
        </span>
      )}
    </div>
  );
}

function connLabel(conn: ConnState, c: ReturnType<typeof roomCopy>): string {
  if (conn === "open") return c.connected;
  if (conn === "reconnecting") return c.reconnecting;
  if (conn === "paused") return c.paused;
  if (conn === "connecting") return c.connecting;
  return c.reconnecting;
}
