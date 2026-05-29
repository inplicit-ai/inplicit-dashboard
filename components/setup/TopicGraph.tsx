"use client";

import { useTranslations } from "next-intl";
import type { TopicGraph as TopicGraphData } from "@/lib/api";

/**
 * Lightweight topic graph (doc 03 §5). Hand-rolled SVG (no D3), themed entirely
 * to design tokens via CSS vars. Topics sit in a gentle two-column cluster;
 * edges are hairline dashed connectors (design-contract §4). Orphan nodes (no
 * edges) render with a dashed border to signal "connect me".
 *
 * Constraint surfacing only — overlap/merge proposals come from the agent as
 * tool-call cards (doc 03 §5); this view is read-focused for the MVP slice.
 */
export function TopicGraph({ data }: { data: TopicGraphData | undefined }) {
  const t = useTranslations("setup.catalog");
  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];

  if (nodes.length === 0) {
    return <p className="text-sm text-fg-muted">{t("topicsEmpty")}</p>;
  }

  const colW = 220;
  const rowH = 72;
  const cols = Math.min(2, nodes.length);
  const rows = Math.ceil(nodes.length / cols);
  const width = cols * colW + 24;
  const height = rows * rowH + 16;

  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    pos.set(n.id, { x: c * colW + 100, y: r * rowH + 28 });
  });

  const connected = new Set<string>();
  edges.forEach((e) => {
    connected.add(e.a);
    connected.add(e.b);
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Topic graph"
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
            stroke="var(--color-border-strong)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        );
      })}
      {nodes.map((n) => {
        const p = pos.get(n.id)!;
        const orphan = !connected.has(n.id);
        return (
          <g key={n.id} transform={`translate(${p.x - 90}, ${p.y - 18})`}>
            <rect
              width={180}
              height={36}
              rx={10}
              fill="var(--color-surface)"
              stroke={
                orphan
                  ? "var(--color-border-strong)"
                  : "var(--color-border)"
              }
              strokeWidth={1}
              strokeDasharray={orphan ? "4 3" : undefined}
            />
            <text
              x={12}
              y={22}
              fontSize={12}
              fontWeight={600}
              fill="var(--color-text-primary)"
            >
              {truncate(n.title, 22)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
