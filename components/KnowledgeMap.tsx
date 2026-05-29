"use client";

import { useEffect, useRef } from "react";
import { Network } from "lucide-react";
import * as d3 from "d3";
import type { Cluster } from "@/lib/api";

interface Props {
  clusters: Cluster[];
}

interface MapNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  category: string;
  signal: number;
  departments: string[];
  description?: string;
}

interface MapLink extends d3.SimulationLinkDatum<MapNode> {
  weight: number;
}

const CATEGORY_TOKEN: Record<string, { name: string; fallback: string }> = {
  operational: { name: "--color-accent", fallback: "#c2660c" },
  innovation: { name: "--color-success", fallback: "#15803d" },
  automation: { name: "--color-gap", fallback: "#5b21b6" },
  risk: { name: "--color-pain", fallback: "#c2410c" },
};

/** Intrinsic canvas height — a content dimension, not a viewport layout crutch. */
const CANVAS_HEIGHT = 600;

function radiusFor(d: MapNode): number {
  return Math.min(8 + d.signal * 2, 30);
}

function tokenColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function categoryColor(category: string): string {
  const token = CATEGORY_TOKEN[category] ?? CATEGORY_TOKEN.operational;
  return tokenColor(token.name, token.fallback);
}

export function KnowledgeMap({ clusters }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container || clusters.length === 0) return;

    let simulation: d3.Simulation<MapNode, MapLink> | null = null;

    const render = () => {
      container.innerHTML = "";

      const width = container.clientWidth || 800;
      const height = CANVAS_HEIGHT;

      const linkColor = tokenColor("--color-border", "rgba(0,0,0,.08)");
      const haloColor = tokenColor("--color-surface", "#ffffff");
      const labelColor = tokenColor("--color-text-secondary", "#525252");

      const nodes: MapNode[] = clusters.map((c) => ({
        id: c.id,
        label: c.label,
        category: c.category ?? "operational",
        signal: c.signal_strength ?? 1,
        departments: c.departments ?? [],
        description: c.description,
      }));

      const links: MapLink[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const shared = nodes[i].departments.filter((d) =>
            nodes[j].departments.includes(d),
          );
          if (shared.length > 0) {
            links.push({
              source: nodes[i].id,
              target: nodes[j].id,
              weight: shared.length,
            });
          }
        }
      }

      const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("display", "block");

      simulation = d3
        .forceSimulation<MapNode>(nodes)
        .force(
          "link",
          d3
            .forceLink<MapNode, MapLink>(links)
            .id((d) => d.id)
            .distance(120),
        )
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force(
          "collide",
          d3.forceCollide<MapNode>().radius((d) => radiusFor(d) + 8),
        );

      const link = svg
        .append("g")
        .attr("stroke", linkColor)
        .selectAll<SVGLineElement, MapLink>("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d) => Math.min(d.weight * 1.5, 4));

      const node = svg
        .append("g")
        .selectAll<SVGGElement, MapNode>("g")
        .data(nodes)
        .join("g")
        .style("cursor", "pointer")
        .call(
          d3
            .drag<SVGGElement, MapNode>()
            .on("start", (event, d) => {
              if (!event.active) simulation?.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on("drag", (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on("end", (event, d) => {
              if (!event.active) simulation?.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            }),
        );

      node
        .append("circle")
        .attr("r", radiusFor)
        .attr("fill", (d) => categoryColor(d.category))
        .attr("fill-opacity", 0.9)
        .attr("stroke", haloColor)
        .attr("stroke-width", 2);

      node
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", (d) => radiusFor(d) + 15)
        .attr("font-size", "13px")
        .attr("font-family", "Inter, sans-serif")
        .attr("fill", labelColor)
        .attr("font-weight", 500)
        .text((d) => d.label);

      node
        .append("title")
        .text(
          (d) =>
            `${d.label}\nSignal: ${d.signal}\nAbteilungen: ${d.departments.join(", ")}`,
        );

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => (d.source as MapNode).x ?? 0)
          .attr("y1", (d) => (d.source as MapNode).y ?? 0)
          .attr("x2", (d) => (d.target as MapNode).x ?? 0)
          .attr("y2", (d) => (d.target as MapNode).y ?? 0);

        node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });
    };

    render();

    // Re-render on container resize so the canvas stays full-width-resilient.
    let raf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      simulation?.stop();
    };
  }, [clusters]);

  if (clusters.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-4 border-dashed py-16 text-center">
        <div className="grid size-12 place-items-center rounded-full border border-line bg-surface-2 text-fg-subtle">
          <Network className="h-5 w-5" />
        </div>
        <p className="max-w-[48ch] text-base leading-relaxed text-fg-muted">
          Noch keine Cluster. Die Wissenslandkarte erscheint, sobald Insights
          gruppiert werden.
        </p>
      </div>
    );
  }

  return (
    <div className="card card--flush">
      {/* Header bar — fixed height, hairline divider, never scrolls. */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-subtle px-5 py-3">
        <div className="flex items-center gap-2 text-[13px] text-fg-muted">
          <Network className="h-4 w-4 text-fg-subtle" aria-hidden />
          <span>
            <span className="font-mono tabular-nums text-fg">
              {clusters.length}
            </span>{" "}
            Cluster
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Legend color={categoryColor("operational")} label="Operativ" />
          <Legend color={categoryColor("innovation")} label="Innovation" />
          <Legend color={categoryColor("automation")} label="Automatisierung" />
          <Legend color={categoryColor("risk")} label="Risiko" />
        </div>
      </div>

      {/* Canvas — full bleed inside the flush card, intrinsic height. */}
      <div
        ref={ref}
        className="w-full bg-canvas"
        style={{ minHeight: CANVAS_HEIGHT }}
      />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="status-disc"
        style={{ background: color }}
        aria-hidden
      />
      <span className="text-[13px] text-fg-muted">{label}</span>
    </div>
  );
}
