"use client";

import { useTranslations } from "next-intl";
import type { TopicGraph as TopicGraphData } from "@/lib/api";

/** Short pill labels for the qualitative method tags (CLASSIFY templates). */
const METHOD_LABEL: Record<string, string> = {
  cit: "Critical Incident",
  journey: "Journey",
  jtbd: "JTBD",
  laddering: "Laddering",
  paired_cit: "Paired CIT",
};

/**
 * The exploration map (doc 03 §5). Hand-rolled SVG (no D3), themed to design
 * tokens. Each angle is a node showing its title and — when the CLASSIFY
 * template tagged it — a method pill (Critical Incident, Journey, JTBD…). The
 * lead angle carries a critical-incident anchor prompt, surfaced as a small
 * marker with the prompt on hover. Orphan nodes render dashed ("connect me").
 */
export function TopicGraph({ data }: { data: TopicGraphData | undefined }) {
  const t = useTranslations("setup.catalog");
  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];

  if (nodes.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line-strong bg-surface-2 px-4 py-3">
        <p className="text-[length:var(--text-body)] text-fg-subtle">
          {t("topicsEmpty")}
        </p>
      </div>
    );
  }

  const colW = 240;
  const rowH = 96;
  const cols = Math.min(2, nodes.length);
  const rows = Math.ceil(nodes.length / cols);
  const width = cols * colW + 24;
  const height = rows * rowH + 16;

  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    pos.set(n.id, { x: c * colW + 100, y: r * rowH + 38 });
  });

  const connected = new Set<string>();
  edges.forEach((e) => {
    connected.add(e.a);
    connected.add(e.b);
  });

  const hasIncident = nodes.some((n) => n.incidentPrompt);

  return (
    <div className="flex flex-col gap-2">
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Exploration map"
    >
      {edges.map((e, i) => {
        const a = pos.get(e.a);
        const b = pos.get(e.b);
        if (!a || !b) return null;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        );
      })}
      {nodes.map((n) => {
        const p = pos.get(n.id)!;
        const orphan = !connected.has(n.id);
        const muted = n.weight === "muted";
        const primary = n.weight === "primary";
        const methodLabel = n.method ? METHOD_LABEL[n.method] ?? n.method : null;
        const pillW = methodLabel ? methodLabel.length * 5.6 + 16 : 0;
        return (
          <g
            key={n.id}
            transform={`translate(${p.x - 90}, ${p.y - 26})`}
            opacity={muted ? 0.5 : 1}
          >
            {n.incidentPrompt && (
              <title>{`${t("participantPrompt")}: ${n.incidentPrompt}`}</title>
            )}
            <rect
              width={180}
              height={52}
              rx={10}
              fill="var(--color-surface)"
              stroke={
                primary
                  ? "var(--color-accent)"
                  : orphan
                    ? "var(--color-border-strong)"
                    : "var(--color-border)"
              }
              strokeWidth={primary ? 1.75 : 1}
              strokeDasharray={orphan && !primary ? "4 3" : undefined}
            />
            <text
              x={12}
              y={20}
              fontSize={12}
              fontWeight={600}
              fill="var(--color-text-primary)"
            >
              {truncate(n.title, 24)}
            </text>
            {methodLabel && (
              <g transform="translate(12, 30)">
                <rect
                  width={pillW}
                  height={15}
                  rx={7.5}
                  fill="var(--color-surface-2)"
                  stroke="var(--color-border)"
                  strokeWidth={0.75}
                />
                <text
                  x={pillW / 2}
                  y={10.5}
                  fontSize={8.5}
                  fontWeight={600}
                  textAnchor="middle"
                  fill="var(--color-text-secondary)"
                >
                  {methodLabel}
                </text>
              </g>
            )}
            {n.incidentPrompt && (
              <circle cx={168} cy={14} r={3} fill="var(--color-accent)" />
            )}
            {n.bidirectional && (
              <text x={150} y={20} fontSize={12} fill="var(--color-text-tertiary)">
                ↔
              </text>
            )}
          </g>
        );
      })}
    </svg>
      {hasIncident && (
        <p className="flex items-center gap-1.5 text-[length:var(--text-caption)] text-fg-subtle">
          <span className="inline-block size-1.5 rounded-full bg-accent" />
          {t("participantPrompt")}
        </p>
      )}
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
