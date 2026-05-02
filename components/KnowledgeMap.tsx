"use client";

import { useEffect, useRef } from "react";
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

const CATEGORY_COLOR: Record<string, string> = {
  operational: "#6366f1",
  innovation: "#10b981",
  automation: "#f59e0b",
  risk: "#ef4444",
};

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

export function KnowledgeMap({ clusters }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || clusters.length === 0) return;
    const container = ref.current;
    container.innerHTML = "";

    const width = container.clientWidth;
    const height = 600;

    const linkColor = tokenColor("--color-border", "#e5e7eb");
    const haloColor = tokenColor("--color-bg", "#ffffff");
    const labelColor = tokenColor("--color-text-secondary", "#374151");

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
      .attr("viewBox", `0 0 ${width} ${height}`);

    const simulation = d3
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
      .force("collide", d3.forceCollide<MapNode>().radius((d) => radiusFor(d) + 8));

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
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    node
      .append("circle")
      .attr("r", radiusFor)
      .attr("fill", (d) => CATEGORY_COLOR[d.category] ?? "#6366f1")
      .attr("fill-opacity", 0.9)
      .attr("stroke", haloColor)
      .attr("stroke-width", 2);

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => radiusFor(d) + 14)
      .attr("font-size", "12px")
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

    return () => {
      simulation.stop();
    };
  }, [clusters]);

  if (clusters.length === 0) {
    return (
      <div className="rounded-card border border-line bg-canvas p-12 text-center shadow-card">
        <p className="text-sm text-fg-muted">
          Noch keine Cluster. Die Wissenslandkarte erscheint, sobald Insights
          gruppiert werden.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-line bg-canvas p-5 shadow-card">
      <div ref={ref} className="w-full" style={{ minHeight: 600 }} />
      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line-subtle pt-4 text-xs">
        <Legend color="#6366f1" label="Operativ" />
        <Legend color="#10b981" label="Innovation" />
        <Legend color="#f59e0b" label="Automatisierung" />
        <Legend color="#ef4444" label="Risiko" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-fg-muted">{label}</span>
    </div>
  );
}
