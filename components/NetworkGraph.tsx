import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MedFlowRow, PainterStyle } from '../types';

interface NetworkGraphProps {
  data: MedFlowRow[];
  style: PainterStyle;
  maxNodes: number;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ data, style, maxNodes }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const width = 800;
    const height = 600;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // Aggregate Data
    const nodesMap = new Map<string, { id: string, group: number, val: number }>();
    const links: { source: string, target: string, value: number }[] = [];

    data.forEach(r => {
        const sup = `S:${r.SupplierID}`;
        const cat = `C:${r.Category}`;
        const cust = `U:${r.CustomerID}`;

        if (!nodesMap.has(sup)) nodesMap.set(sup, { id: sup, group: 1, val: 0 });
        if (!nodesMap.has(cat)) nodesMap.set(cat, { id: cat, group: 2, val: 0 });
        if (!nodesMap.has(cust)) nodesMap.set(cust, { id: cust, group: 3, val: 0 });

        nodesMap.get(sup)!.val += r.Number;
        nodesMap.get(cat)!.val += r.Number;
        nodesMap.get(cust)!.val += r.Number;

        links.push({ source: sup, target: cat, value: r.Number });
        links.push({ source: cat, target: cust, value: r.Number });
    });

    // Limit Nodes
    const allNodes = Array.from(nodesMap.values()).sort((a, b) => b.val - a.val).slice(0, maxNodes);
    const nodeIds = new Set(allNodes.map(n => n.id));
    const validLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

    const simulation = d3.forceSimulation(allNodes as any)
      .force("link", d3.forceLink(validLinks).id((d: any) => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => Math.sqrt(d.val) + 5));

    const link = svg.append("g")
      .attr("stroke", style.border_rgba_light)
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(validLinks)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value) * 0.5);

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(allNodes)
      .join("circle")
      .attr("r", d => Math.min(20, Math.max(3, Math.sqrt(d.val))))
      .attr("fill", d => {
          if (d.group === 1) return style.palette[0];
          if (d.group === 2) return style.palette[1];
          return style.palette[2];
      })
      .call(drag(simulation) as any);

    node.append("title")
      .text(d => `${d.id}\nUnits: ${d.val}`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
    });

    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => {
        simulation.stop();
    };

  }, [data, style, maxNodes]);

  return (
    <div className="w-full h-[600px] overflow-hidden rounded-xl border border-[var(--mf-border)] bg-[var(--mf-card)]">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};

export default NetworkGraph;
