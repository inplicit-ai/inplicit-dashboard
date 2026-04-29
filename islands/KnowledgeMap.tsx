import { useEffect, useRef } from "preact/hooks";
import { Cluster } from "../lib/api.ts";

interface Props {
  clusters: Cluster[];
  apiUrl: string;
}

declare global {
  interface Window {
    d3: any;
  }
}

const CATEGORY_COLOR: Record<string, string> = {
  operational: "#6366f1", // indigo
  innovation: "#10b981",  // emerald
  automation: "#f59e0b",  // amber
  risk: "#ef4444",        // red
};

export default function KnowledgeMap({ clusters }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || clusters.length === 0) return;

    const script = document.createElement("script");
    script.src = "https://d3js.org/d3.v7.min.js";
    script.onload = () => render();
    document.head.appendChild(script);

    function render() {
      const d3 = window.d3;
      const container = ref.current!;
      container.innerHTML = "";

      const width = container.clientWidth;
      const height = 600;

      const nodes = clusters.map((c) => ({
        id: c.id,
        label: c.label,
        category: c.category ?? "operational",
        signal: c.signal_strength ?? 1,
        departments: c.departments ?? [],
        description: c.description,
      }));

      // Build edges from shared departments (simple proxy for relatedness)
      const links: Array<{ source: string; target: string; weight: number }> = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const shared = nodes[i].departments.filter((d: string) =>
            nodes[j].departments.includes(d)
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
        .attr("viewBox", [0, 0, width, height]);

      const simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3.forceLink(links).id((d: any) => d.id).distance(120),
        )
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius((d: any) => radiusFor(d) + 8));

      const link = svg
        .append("g")
        .attr("stroke", "#e5e7eb")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d: any) => Math.min(d.weight * 1.5, 4));

      const node = svg
        .append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .style("cursor", "pointer")
        .call(
          d3
            .drag()
            .on("start", (event: any, d: any) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on("drag", (event: any, d: any) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on("end", (event: any, d: any) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            }),
        );

      node
        .append("circle")
        .attr("r", radiusFor)
        .attr("fill", (d: any) => CATEGORY_COLOR[d.category] ?? "#6366f1")
        .attr("fill-opacity", 0.85)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      node
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", (d: any) => radiusFor(d) + 14)
        .attr("font-size", "11px")
        .attr("font-family", "Inter, sans-serif")
        .attr("fill", "#374151")
        .attr("font-weight", 500)
        .text((d: any) => d.label);

      node.append("title").text((d: any) =>
        `${d.label}\nSignal: ${d.signal}\nAbteilungen: ${d.departments.join(", ")}`
      );

      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      });
    }

    function radiusFor(d: any): number {
      return Math.min(8 + d.signal * 2, 30);
    }

    return () => {
      // cleanup script tag if needed
    };
  }, [clusters]);

  if (clusters.length === 0) {
    return (
      <div class="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p class="text-gray-500 text-sm">
          Noch keine Cluster. Die Wissenslandkarte erscheint, sobald Insights gruppiert werden.
        </p>
      </div>
    );
  }

  return (
    <div class="bg-white border border-gray-200 rounded-xl p-4">
      <div ref={ref} class="w-full" style="min-height: 600px;" />
      <div class="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100 text-xs">
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
    <div class="flex items-center gap-1.5">
      <span
        class="inline-block w-2.5 h-2.5 rounded-full"
        style={`background: ${color}`}
      />
      <span class="text-gray-600">{label}</span>
    </div>
  );
}
