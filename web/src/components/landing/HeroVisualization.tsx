/**
 * HeroVisualization — animated graphic representing the four domains converging.
 *
 * This is a Canvas 2D animation showing four clusters of small dots/nodes,
 * each in their domain's accent color, orbiting or pulsing around a central
 * convergence point. Lines connect nearby nodes across domains, symbolizing
 * the unified platform.
 *
 * This is NOT the algorithm visualization engine — it's a standalone
 * decorative animation specific to the landing page.
 *
 * Architecture:
 * - Four orbital groups, each with their category color
 * - Nodes slowly orbit the center at different radii
 * - Faint connecting lines between nearby nodes create a mesh effect
 * - A central glow pulse at the convergence point
 * - Respects reduced motion (static arrangement, no animation)
 *
 * Mathematical model:
 * - Each node's position is computed as:
 *     x = cx + (baseRadius + oscillation) × cos(angle + time × angularSpeed)
 *     y = cy + (baseRadius + oscillation) × sin(angle + time × angularSpeed)
 *   where:
 *     cx, cy = canvas center
 *     baseRadius = orbital radius for this group (staggered per domain)
 *     oscillation = small sinusoidal variance for organic feel
 *     angle = fixed starting angle for this node
 *     angularSpeed = rotation speed (radians per second)
 *
 * - Connecting lines: for every pair of nodes within `connectionRadius` distance,
 *   draw a line with opacity proportional to (1 - distance / connectionRadius).
 *   Only check cross-domain pairs to avoid clutter.
 *
 * Performance:
 * - Nodes are pre-allocated (no per-frame allocation)
 * - Connection checking uses squared distance (avoids sqrt)
 * - Max node count: 80 (20 per domain) — trivially fast
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** ─── Domain Configuration ─── */
interface DomainConfig {
  color: string;
  /** Orbital radius in fraction of canvas min-dimension (0-0.5) */
  orbitRadius: number;
  /** Number of nodes in this group */
  nodeCount: number;
  /** Angular speed in radians per second (positive = clockwise) */
  angularSpeed: number;
  /** Starting angle offset in radians */
  angleOffset: number;
}

const DOMAINS: DomainConfig[] = [
  {
    color: "rgba(56, 189, 248, 0.8)", // classical — blue
    orbitRadius: 0.25,
    nodeCount: 16,
    angularSpeed: 0.15,
    angleOffset: 0,
  },
  {
    color: "rgba(139, 92, 246, 0.8)", // deep learning — purple
    orbitRadius: 0.3,
    nodeCount: 16,
    angularSpeed: -0.12,
    angleOffset: Math.PI / 4,
  },
  {
    color: "rgba(244, 114, 182, 0.8)", // genai — pink
    orbitRadius: 0.35,
    nodeCount: 16,
    angularSpeed: 0.1,
    angleOffset: Math.PI / 2,
  },
  {
    color: "rgba(0, 255, 200, 0.8)", // quantum — cyan
    orbitRadius: 0.22,
    nodeCount: 12,
    angularSpeed: -0.18,
    angleOffset: (3 * Math.PI) / 4,
  },
];

/** Maximum distance (in px) for drawing connection lines between nodes. */
const CONNECTION_RADIUS = 80;
/** Squared version for fast distance comparison (avoids Math.sqrt). */
const CONNECTION_RADIUS_SQ = CONNECTION_RADIUS * CONNECTION_RADIUS;

interface Node {
  domainIndex: number;
  /** Fixed angle offset for this node (radians) */
  angle: number;
  /** Oscillation phase offset for radius variation */
  phaseOffset: number;
  /** Current computed x position */
  x: number;
  /** Current computed y position */
  y: number;
  /** Node radius in px */
  radius: number;
  color: string;
}

export function HeroVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animFrameRef = useRef<number>(0);
  const prefersReducedMotion = useReducedMotion();

  /** Initialize nodes once. Positions are updated per frame. */
  const initializeNodes = useCallback(() => {
    const nodes: Node[] = [];
    DOMAINS.forEach((domain, domainIdx) => {
      for (let i = 0; i < domain.nodeCount; i++) {
        const angle = domain.angleOffset + (i / domain.nodeCount) * Math.PI * 2;
        nodes.push({
          domainIndex: domainIdx,
          angle,
          phaseOffset: Math.random() * Math.PI * 2,
          x: 0,
          y: 0,
          radius: 1.5 + Math.random() * 2,
          color: domain.color,
        });
      }
    });
    nodesRef.current = nodes;
  }, []);

  /**
   * Update node positions based on current time.
   *
   * For each node:
   *   currentAngle = node.angle + time × domain.angularSpeed
   *   r = minDim × domain.orbitRadius + 8 × sin(time × 0.5 + node.phaseOffset)
   *   node.x = cx + r × cos(currentAngle)
   *   node.y = cy + r × sin(currentAngle)
   */
  const updatePositions = useCallback((time: number, cx: number, cy: number, minDim: number) => {
    for (const node of nodesRef.current) {
      const domain = DOMAINS[node.domainIndex];
      const currentAngle = node.angle + time * domain.angularSpeed;
      const r = minDim * domain.orbitRadius + 8 * Math.sin(time * 0.5 + node.phaseOffset);

      node.x = cx + r * Math.cos(currentAngle);
      node.y = cy + r * Math.sin(currentAngle);
    }
  }, []);

  /**
   * Render the complete scene: connections, nodes, and center glow.
   */
  const renderScene = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, cx: number, cy: number) => {
      ctx.clearRect(0, 0, width, height);
      const nodes = nodesRef.current;

      /** Draw connection lines between nearby cross-domain nodes. */
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          /** Only connect nodes from different domains. */
          if (nodes[i].domainIndex === nodes[j].domainIndex) continue;

          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distSq = dx * dx + dy * dy;

          if (distSq < CONNECTION_RADIUS_SQ) {
            /**
             * Opacity falls off linearly with distance.
             * At distance 0: opacity = 0.15. At connectionRadius: opacity = 0.
             *
             * Using Math.sqrt here is acceptable because this branch is only
             * entered for nearby pairs, and the total node count is ≤ 80.
             */
            const dist = Math.sqrt(distSq);
            const opacity = 0.15 * (1 - dist / CONNECTION_RADIUS);

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(160, 168, 192, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      /** Draw nodes. */
      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
      }

      /** Center glow: soft radial gradient at convergence point. */
      const glowRadius = Math.min(width, height) * 0.08;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      gradient.addColorStop(0, "rgba(139, 92, 246, 0.25)");
      gradient.addColorStop(0.5, "rgba(6, 182, 212, 0.1)");
      gradient.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    initializeNodes();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    if (prefersReducedMotion) {
      /** Static render at time=0. */
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const minDim = Math.min(rect.width, rect.height);
      updatePositions(0, cx, cy, minDim);
      renderScene(ctx, rect.width, rect.height, cx, cy);
      return () => window.removeEventListener("resize", resize);
    }

    const startTime = performance.now();

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const minDim = Math.min(rect.width, rect.height);
      const time = (performance.now() - startTime) / 1000;

      updatePositions(time, cx, cy, minDim);

      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      renderScene(ctx, rect.width, rect.height, cx, cy);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [prefersReducedMotion, initializeNodes, updatePositions, renderScene]);

  return (
    <canvas
      ref={canvasRef}
      className="h-[350px] w-full sm:h-[400px] lg:h-[500px]"
      aria-hidden="true"
    />
  );
}
