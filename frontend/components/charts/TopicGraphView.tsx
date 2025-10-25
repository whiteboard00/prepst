"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoryHeatmap } from "@/lib/types";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mastery: number;
  category: string;
  isCenter?: boolean;
}

interface Link {
  source: string;
  target: string;
}

interface TopicGraphViewProps {
  heatmap: Record<string, CategoryHeatmap>;
}

export function TopicGraphView({ heatmap }: TopicGraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!heatmap || Object.keys(heatmap).length === 0) return;

    // Create center node
    const centerNode: Node = {
      id: "center",
      label: "SAT Topics",
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      mastery: 1,
      category: "center",
      isCenter: true,
    };

    // Create nodes from heatmap data
    const topicNodes: Node[] = [];
    const topicLinks: Link[] = [];

    Object.entries(heatmap).forEach(([categoryName, category]) => {
      category.skills.forEach((skill) => {
        const node: Node = {
          id: skill.skill_id,
          label: skill.skill_name,
          x: 400 + (Math.random() - 0.5) * 600,
          y: 300 + (Math.random() - 0.5) * 400,
          vx: 0,
          vy: 0,
          mastery: skill.mastery,
          category: categoryName,
        };
        topicNodes.push(node);
        topicLinks.push({ source: "center", target: skill.skill_id });
      });
    });

    setNodes([centerNode, ...topicNodes]);
    setLinks(topicLinks);
  }, [heatmap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Force simulation
    const simulate = () => {
      // Apply forces
      nodes.forEach((node) => {
        if (node.isCenter) {
          // Keep center node in the middle
          node.x = width / 2;
          node.y = height / 2;
          return;
        }

        // Gravity towards center
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const force = distance * 0.001;
        node.vx += (dx / distance) * force;
        node.vy += (dy / distance) * force;

        // Repulsion from other nodes
        nodes.forEach((other) => {
          if (node.id === other.id) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 100 && distance > 0) {
            const force = (100 - distance) * 0.01;
            node.vx += (dx / distance) * force;
            node.vy += (dy / distance) * force;
          }
        });

        // Apply velocity with damping
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;

        // Boundary constraints
        const margin = 50;
        if (node.x < margin) node.x = margin;
        if (node.x > width - margin) node.x = width - margin;
        if (node.y < margin) node.y = margin;
        if (node.y > height - margin) node.y = height - margin;
      });

      // Clear canvas
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Draw links
      ctx.strokeStyle = "rgba(139, 92, 246, 0.3)";
      ctx.lineWidth = 1;
      links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach((node) => {
        const radius = node.isCenter ? 20 : 8;
        const masteryColor = node.isCenter
          ? "rgb(139, 92, 246)"
          : `rgba(139, 92, 246, ${0.3 + node.mastery * 0.7})`;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = masteryColor;
        ctx.fill();

        // Highlight hovered node
        if (hoveredNode?.id === node.id) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Draw label for center and hovered nodes
        if (node.isCenter || hoveredNode?.id === node.id) {
          ctx.fillStyle = "#ffffff";
          ctx.font = node.isCenter ? "14px sans-serif" : "12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(node.label, node.x, node.y - radius - 10);

          // Show mastery percentage for hovered nodes
          if (!node.isCenter && hoveredNode?.id === node.id) {
            ctx.font = "10px sans-serif";
            ctx.fillStyle = "#a78bfa";
            ctx.fillText(
              `${Math.round(node.mastery * 100)}% mastery`,
              node.x,
              node.y + radius + 15
            );
          }
        }
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, links, hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hovered = nodes.find((node) => {
      const dx = node.x - x;
      const dy = node.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < (node.isCenter ? 20 : 8);
    });

    setHoveredNode(hovered || null);
  };

  return (
    <div className="relative w-full h-[600px] bg-black rounded-2xl overflow-hidden">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
      />
      <div className="absolute top-4 left-4 text-white text-sm">
        <p className="font-semibold mb-1">Topic Mastery Graph</p>
        <p className="text-xs text-gray-400">
          Hover over nodes to see details
        </p>
      </div>
    </div>
  );
}
