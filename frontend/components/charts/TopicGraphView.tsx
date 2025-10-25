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
      label: "SAT",
      x: 400,
      y: 175,
      vx: 0,
      vy: 0,
      mastery: 1,
      category: "center",
      isCenter: true,
    };

    // Create category nodes and skill nodes
    const topicNodes: Node[] = [];
    const topicLinks: Link[] = [];
    const categoryNodes: { [key: string]: string } = {};

    Object.entries(heatmap).forEach(([categoryName, category]) => {
      // Create category node
      const categoryId = `cat-${categoryName}`;
      categoryNodes[categoryName] = categoryId;
      
      const categoryNode: Node = {
        id: categoryId,
        label: categoryName,
        x: 400 + (Math.random() - 0.5) * 400,
        y: 175 + (Math.random() - 0.5) * 175,
        vx: 0,
        vy: 0,
        mastery: category.skills.reduce((sum, s) => sum + s.mastery, 0) / category.skills.length,
        category: categoryName,
      };
      topicNodes.push(categoryNode);
      topicLinks.push({ source: "center", target: categoryId });

      // Create skill nodes connected to their category
      category.skills.forEach((skill) => {
        const node: Node = {
          id: skill.skill_id,
          label: skill.skill_name,
          x: 400 + (Math.random() - 0.5) * 600,
          y: 175 + (Math.random() - 0.5) * 250,
          vx: 0,
          vy: 0,
          mastery: skill.mastery,
          category: categoryName,
        };
        topicNodes.push(node);
        topicLinks.push({ source: categoryId, target: skill.skill_id });
        
        // Add some cross-connections between related skills (same category)
        const relatedSkills = category.skills.filter(s => s.skill_id !== skill.skill_id);
        if (relatedSkills.length > 0 && Math.random() > 0.7) {
          const randomRelated = relatedSkills[Math.floor(Math.random() * relatedSkills.length)];
          topicLinks.push({ source: skill.skill_id, target: randomRelated.skill_id });
        }
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
      ctx.fillStyle = "#ffffff";
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
        const isCategoryNode = node.id.startsWith("cat-");
        const radius = node.isCenter ? 20 : isCategoryNode ? 12 : 6;
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
          ctx.strokeStyle = "rgba(124, 58, 237, 0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Draw labels for all nodes
        const fontSize = node.isCenter ? 14 : isCategoryNode ? 11 : 9;
        ctx.fillStyle = "#000000";
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Truncate long labels
        const maxLength = isCategoryNode ? 20 : 15;
        const displayLabel = node.label.length > maxLength 
          ? node.label.substring(0, maxLength) + "..." 
          : node.label;
        
        ctx.fillText(displayLabel, node.x, node.y - radius - 8);

        // Show mastery percentage for hovered nodes
        if (!node.isCenter && hoveredNode?.id === node.id) {
          ctx.font = "10px sans-serif";
          ctx.fillStyle = "#7c3aed";
          ctx.fillText(
            `${Math.round(node.mastery * 100)}% mastery`,
            node.x,
            node.y + radius + 15
          );
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
      const isCategoryNode = node.id.startsWith("cat-");
      const radius = node.isCenter ? 20 : isCategoryNode ? 12 : 6;
      const dx = node.x - x;
      const dy = node.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < radius;
    });

    setHoveredNode(hovered || null);
  };

  return (
    <div className="relative w-full h-full bg-white border rounded-2xl overflow-hidden">
      <canvas
        ref={canvasRef}
        width={800}
        height={350}
        className="w-full h-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
      />
      <div className="absolute top-4 left-4 text-gray-900 text-sm">
        <p className="font-semibold mb-1">Topic Mastery Graph</p>
        <p className="text-xs text-gray-600">
          Hover over nodes to see details
        </p>
      </div>
    </div>
  );
}
