"use client";

/**
 * TwinGraph — vertical org-hierarchy graph for the digital twin (O-9, doc 07 §7).
 *
 * Ported from ct-sim's hand-rolled `RoleGraph.tsx` SVG and RE-THEMED to our
 * white-first tokens, then ROTATED into a CLEAR VERTICAL hierarchy: top-level
 * roles at the top, `manages` edges flowing downward. (ct-sim fanned a top row
 * into a central hub with subordinates dangling — here it is a proper top-down
 * org chart, the user's "clearer vertical hierarchy" requirement.)
 *
 * Design (01): hairline edges, NO shadows. The single warm accent (#c2660c via
 * var(--color-accent)) is used only on the active/selected node. Solid nodes =
 * roles with VALIDATED twin data; dashed = predicted-only (ct-sim's dashed-
 * subordinate convention, repurposed). A check marks roles whose twin has
 * validated data from real interviews.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { TwinGraph as TwinGraphData } from "@/lib/api";

interface Positioned {
  id: string;
  name: string;
  kind: "validated" | "predicted";
  confidence: number;
  depth: number;
  x: number;
  y: number;
}

const NODE_W = 168;
const NODE_H = 52;
const COL_GAP = 28;
const ROW_GAP = 96;
const PAD = 24;

/**
 * Assign a depth to every node via the `reports_to` / `manages` edges, then lay
 * out each depth as a horizontal row. Roots (no manager) sit at depth 0.
 * Pure layout — deterministic, no DOM measurement.
 */
function layout(data: TwinGraphData): {
  nodes: Positioned[];
  width: number;
  height: number;
} {
  // managerOf[child] = parent. manages: from→to (from manages to → to is child).
  // reports_to: from→to (from reports_to to → from is child of to).
  const parentOf = new Map<string, string>();
  for (const e of data.edges) {
    if (e.relation === "manages") parentOf.set(e.to, e.from);
    else parentOf.set(e.from, e.to);
  }

  const depthCache = new Map<string, number>();
  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const parent = parentOf.get(id);
    if (!parent || seen.has(id)) {
      depthCache.set(id, 0);
      return 0;
    }
    seen.add(id);
    const d = depthOf(parent, seen) + 1;
    depthCache.set(id, d);
    return d;
  };

  const byDepth = new Map<number, TwinGraphData["nodes"]>();
  for (const n of data.nodes) {
    const d = depthOf(n.id);
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(n);
  }

  const maxRowCount = Math.max(1, ...[...byDepth.values()].map((r) => r.length));
  const width = PAD * 2 + maxRowCount * NODE_W + (maxRowCount - 1) * COL_GAP;
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  const height = PAD * 2 + depths.length * NODE_H + (depths.length - 1) * ROW_GAP;

  const nodes: Positioned[] = [];
  depths.forEach((d, rowIdx) => {
    const row = byDepth.get(d)!;
    const rowWidth = row.length * NODE_W + (row.length - 1) * COL_GAP;
    const startX = (width - rowWidth) / 2;
    row.forEach((n, colIdx) => {
      nodes.push({
        ...n,
        depth: d,
        x: startX + colIdx * (NODE_W + COL_GAP),
        y: PAD + rowIdx * (NODE_H + ROW_GAP),
      });
    });
  });

  return { nodes, width, height };
}

export function TwinGraph({
  data,
  activeId,
  emptyLabel,
}: {
  data: TwinGraphData;
  activeId?: string;
  emptyLabel: string;
}) {
  const router = useRouter();
  const { nodes, width, height } = useMemo(() => layout(data), [data]);
  const posById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  if (nodes.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line bg-surface/40 p-12 text-center">
        <p className="text-sm text-fg-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-card border border-line bg-surface p-2">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        className="mx-auto block"
      >
        {/* Edges: hairline, downward. */}
        {data.edges.map((e, i) => {
          // Draw parent → child top-down regardless of edge direction.
          const childId = e.relation === "manages" ? e.to : e.from;
          const parentId = e.relation === "manages" ? e.from : e.to;
          const child = posById.get(childId);
          const parent = posById.get(parentId);
          if (!child || !parent) return null;
          const x1 = parent.x + NODE_W / 2;
          const y1 = parent.y + NODE_H;
          const x2 = child.x + NODE_W / 2;
          const y2 = child.y;
          const midY = (y1 + y2) / 2;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={1}
            />
          );
        })}

        {/* Nodes. */}
        {nodes.map((n) => {
          const isActive = n.id === activeId;
          const validated = n.kind === "validated";
          return (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              className="cursor-pointer"
              onClick={() => router.push(`/twin/${n.id}`)}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill="var(--color-surface)"
                stroke={
                  isActive ? "var(--color-accent)" : "var(--color-line)"
                }
                strokeWidth={isActive ? 1.5 : 1}
                strokeDasharray={validated ? undefined : "4 3"}
              />
              {/* Check = role twin has VALIDATED data. */}
              {validated && (
                <g transform={`translate(${NODE_W - 22}, 10)`}>
                  <circle cx={6} cy={6} r={8} fill="var(--color-success-soft)" />
                  <path
                    d="M 2 6 L 5 9 L 10 3"
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}
              <text
                x={14}
                y={NODE_H / 2 + 4}
                fontSize={13}
                fill="var(--color-fg)"
                className="select-none"
              >
                {n.name.length > 20 ? `${n.name.slice(0, 19)}…` : n.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
