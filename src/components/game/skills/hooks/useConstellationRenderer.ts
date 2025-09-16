import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type {
  ConstellationNode,
  SkillNode,
  SkillTree,
  TooltipState,
  Vec2,
  StarField,
  ParticleEffect,
} from '../types';
import { ParticleSystem, drawConnections, drawParticles } from '../effects';
import { useAnimationFrame } from '../hooks';
import type { ConstellationLayout } from '../layout/constellation';

type NodeTransitionTarget = Partial<{
  scale: number;
  opacity: number;
  glowIntensity: number;
}>;

interface NodeTransitionState {
  scale: number;
  opacity: number;
  glowIntensity: number;
  targetScale: number;
  targetOpacity: number;
  targetGlowIntensity: number;
  lastUpdate: number;
}

export interface UseConstellationRendererOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  layout: ConstellationLayout;
  tree: SkillTree;
  unlocked: Record<string, boolean>;
  hover: ConstellationNode | null;
  selected: ConstellationNode | null;
  highlightNodes: Set<string>;
  highlightEdges: Set<string>;
  pan: Vec2;
  zoom: number;
  size: { w: number; h: number };
  colorFor: (category: SkillNode['category']) => string;
  canAfford: (node: SkillNode) => boolean;
  checkUnlock: (node: SkillNode) => { ok: boolean; reasons: string[] };
  tooltip: TooltipState;
  setTooltip: React.Dispatch<React.SetStateAction<TooltipState>>;
}

export interface UseConstellationRendererResult {
  updateNodeTransition: (nodeId: string, target: NodeTransitionTarget) => void;
  spawnParticles: (
    x: number,
    y: number,
    type: ParticleEffect['type'],
    count: number,
    color: string,
  ) => void;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const RENDER_THROTTLE = 16;
const STAR_FIELD_SEED = 0x1badf00d;

const createRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export function useConstellationRenderer({
  canvasRef,
  layout,
  tree,
  unlocked,
  hover,
  selected,
  highlightNodes,
  highlightEdges,
  pan,
  zoom,
  size,
  colorFor,
  canAfford,
  checkUnlock,
  tooltip,
  setTooltip,
}: UseConstellationRendererOptions): UseConstellationRendererResult {
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  const [nodeTransitions, setNodeTransitions] = useState<Map<string, NodeTransitionState>>(
    () => new Map(),
  );
  const [time, setTime] = useState(0);
  const [starField, setStarField] = useState<StarField[]>([]);
  const lastRenderTime = useRef(0);

  useEffect(() => {
    if (starField.length > 0) return;
    const stars: StarField[] = [];
    const random = createRandom(STAR_FIELD_SEED);
    for (let i = 0; i < 150; i += 1) {
      stars.push({
        x: random() * 2400 - 1200,
        y: random() * 1600 - 800,
        brightness: random() * 0.8 + 0.2,
        twinkle: random() * Math.PI * 2,
        size: random() * 2 + 0.5,
      });
    }
    setStarField(stars);
  }, [starField.length]);

  const updateNodeTransition = useCallback((nodeId: string, target: NodeTransitionTarget) => {
    setNodeTransitions((prev) => {
      const current = prev.get(nodeId) ?? {
        scale: 1,
        opacity: 1,
        glowIntensity: 0,
        targetScale: 1,
        targetOpacity: 1,
        targetGlowIntensity: 0,
        lastUpdate: Date.now(),
      };

      const next = new Map(prev);
      next.set(nodeId, {
        ...current,
        targetScale: target.scale ?? current.targetScale,
        targetOpacity: target.opacity ?? current.targetOpacity,
        targetGlowIntensity: target.glowIntensity ?? current.targetGlowIntensity,
        lastUpdate: Date.now(),
      });
      return next;
    });
  }, []);

  const spawnParticles = useCallback<UseConstellationRendererResult['spawnParticles']>(
    (x, y, type, count, color) => {
      particleSystemRef.current.addParticles(x, y, type, count, color);
    },
    [],
  );

  useAnimationFrame(
    useCallback(
      (dt: number) => {
        const now = Date.now();
        setTime((prev) => prev + dt * 0.001);

        if (tooltip.visible && tooltip.fadeIn < 1) {
          setTooltip((prev) => {
            if (!prev.visible || prev.fadeIn >= 1) return prev;
            return { ...prev, fadeIn: Math.min(1, prev.fadeIn + dt * 0.003) };
          });
        }

        setNodeTransitions((prev) => {
          if (prev.size === 0) return prev;

          const updated = new Map<string, NodeTransitionState>();
          const transitionDuration = 300;

          for (const [nodeId, transition] of prev) {
            const elapsed = now - transition.lastUpdate;
            const progress = Math.min(1, elapsed / transitionDuration);

            if (progress < 1) {
              const easedProgress = easeOutCubic(progress);
              updated.set(nodeId, {
                ...transition,
                scale:
                  transition.scale +
                  (transition.targetScale - transition.scale) * easedProgress,
                opacity:
                  transition.opacity +
                  (transition.targetOpacity - transition.opacity) * easedProgress,
                glowIntensity:
                  transition.glowIntensity +
                  (transition.targetGlowIntensity - transition.glowIntensity) * easedProgress,
              });
            } else {
              updated.set(nodeId, {
                ...transition,
                scale: transition.targetScale,
                opacity: transition.targetOpacity,
                glowIntensity: transition.targetGlowIntensity,
              });
            }
          }

          return updated;
        });

        particleSystemRef.current.update(dt);

        if (Math.random() < 0.002) {
          const x = (Math.random() - 0.5) * 1200;
          const y = (Math.random() - 0.5) * 800;
          particleSystemRef.current.addParticles(x, y, 'ambient', 1, '#4a90e2');
        }
      },
      [tooltip.visible, tooltip.fadeIn, setTooltip],
    ),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = Date.now();
    if (now - lastRenderTime.current < RENDER_THROTTLE) {
      return;
    }
    lastRenderTime.current = now;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, size.w, size.h);

    ctx.save();
    ctx.translate(size.w / 2 + pan.x, size.h / 2 + pan.y);
    ctx.scale(zoom, zoom);

    starField.forEach((star) => {
      const twinkle = Math.sin(time * 2 + star.twinkle) * 0.3 + 0.7;
      const alpha = star.brightness * twinkle * 0.8;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();

      if (alpha > 0.9) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha - 0.9) * 0.2})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    drawParticles(ctx, particleSystemRef.current.getParticles(), time);
    drawConnections(ctx, layout, tree.edges, unlocked, highlightEdges, time, checkUnlock);

    ctx.save();
    const sectorColors: Record<SkillNode['category'], string> = {
      economic: '#0ea5e955',
      military: '#ef444455',
      mystical: '#a855f755',
      infrastructure: '#22c55e55',
      diplomatic: '#f59e0b55',
      social: '#64748b55',
    };
    const sectors = [
      { start: 0, end: Math.PI / 3, cat: 'economic' as const },
      { start: Math.PI / 3, end: (2 * Math.PI) / 3, cat: 'military' as const },
      { start: (2 * Math.PI) / 3, end: Math.PI, cat: 'mystical' as const },
      { start: Math.PI, end: (4 * Math.PI) / 3, cat: 'infrastructure' as const },
      { start: (4 * Math.PI) / 3, end: (5 * Math.PI) / 3, cat: 'diplomatic' as const },
      { start: (5 * Math.PI) / 3, end: 2 * Math.PI, cat: 'social' as const },
    ];
    sectors.forEach((sector) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 900, sector.start, sector.end);
      ctx.closePath();
      ctx.fillStyle = sectorColors[sector.cat];
      ctx.globalAlpha = 0.04;
      ctx.fill();
    });
    ctx.restore();

    layout.nodes.forEach((cNode) => {
      const { node } = cNode;
      const isUnlocked = unlocked[node.id];
      const isHovered = hover?.node.id === node.id;
      const isSelected = selected?.node.id === node.id;
      const { ok: canUnlock } = checkUnlock(node);
      const affordable = canAfford(node);
      const inHighlight = highlightNodes.has(node.id);
      const baseColor = colorFor(node.category);
      const baseRadius = 22;

      const transition = nodeTransitions.get(node.id) ?? {
        scale: 1,
        opacity: 1,
        glowIntensity: 0,
        targetScale: 1,
        targetOpacity: 1,
        targetGlowIntensity: 0,
        lastUpdate: Date.now(),
      };

      const nodeRadius = baseRadius * transition.scale;

      if (isUnlocked || isHovered || isSelected) {
        const shadowOffset = isSelected ? 4 : isHovered ? 3 : 2;
        const shadowBlur = isSelected ? 12 : isHovered ? 8 : 6;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = shadowOffset;
        ctx.shadowOffsetY = shadowOffset;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      if (isUnlocked || isHovered || inHighlight) {
        const outerGlowRadius = nodeRadius + (isSelected ? 20 : isHovered ? 16 : 12);
        const outerGlow = ctx.createRadialGradient(
          cNode.x,
          cNode.y,
          nodeRadius,
          cNode.x,
          cNode.y,
          outerGlowRadius,
        );
        outerGlow.addColorStop(0, `${baseColor}${isSelected ? '60' : isHovered ? '50' : '30'}`);
        outerGlow.addColorStop(0.7, `${baseColor}${isSelected ? '20' : '10'}`);
        outerGlow.addColorStop(1, `${baseColor}00`);

        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, outerGlowRadius, 0, Math.PI * 2);
        ctx.fill();

        if (isSelected || isHovered) {
          const innerGlowRadius = nodeRadius + 6;
          const innerGlow = ctx.createRadialGradient(
            cNode.x,
            cNode.y,
            nodeRadius - 2,
            cNode.x,
            cNode.y,
            innerGlowRadius,
          );
          innerGlow.addColorStop(0, `${baseColor}00`);
          innerGlow.addColorStop(0.8, `${baseColor}${isSelected ? '40' : '30'}`);
          innerGlow.addColorStop(1, `${baseColor}00`);

          ctx.fillStyle = innerGlow;
          ctx.beginPath();
          ctx.arc(cNode.x, cNode.y, innerGlowRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const nodeGradient = ctx.createRadialGradient(cNode.x - 6, cNode.y - 6, 0, cNode.x, cNode.y, nodeRadius);

      if (isUnlocked) {
        nodeGradient.addColorStop(0, '#ffffff');
        nodeGradient.addColorStop(0.2, `${baseColor}f0`);
        nodeGradient.addColorStop(0.6, baseColor);
        nodeGradient.addColorStop(0.9, `${baseColor}cc`);
        nodeGradient.addColorStop(1, '#1a1a1a');
      } else if (canUnlock) {
        if (affordable) {
          nodeGradient.addColorStop(0, `${baseColor}cc`);
          nodeGradient.addColorStop(0.3, `${baseColor}99`);
          nodeGradient.addColorStop(0.7, `${baseColor}66`);
          nodeGradient.addColorStop(1, `${baseColor}33`);
        } else {
          nodeGradient.addColorStop(0, '#fbbf24cc');
          nodeGradient.addColorStop(0.3, '#f59e0b99');
          nodeGradient.addColorStop(0.7, '#d97706');
          nodeGradient.addColorStop(1, '#92400e');
        }
      } else {
        nodeGradient.addColorStop(0, '#6b7280');
        nodeGradient.addColorStop(0.3, '#4b5563');
        nodeGradient.addColorStop(0.7, '#374151');
        nodeGradient.addColorStop(1, '#1f2937');
      }

      ctx.fillStyle = nodeGradient;
      ctx.beginPath();
      ctx.arc(cNode.x, cNode.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();

      const borderWidth = isSelected ? 3 : isHovered || inHighlight ? 2.5 : 1.5;
      ctx.strokeStyle = isSelected
        ? '#ffffff'
        : isHovered || inHighlight
        ? canUnlock && !isUnlocked && !affordable
          ? '#f59e0b'
          : baseColor
        : '#6b7280';
      ctx.lineWidth = borderWidth;
      ctx.beginPath();
      ctx.arc(cNode.x, cNode.y, nodeRadius, 0, Math.PI * 2);
      ctx.stroke();

      if (isUnlocked) {
        ctx.strokeStyle = `${baseColor}80`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, nodeRadius - 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      const iconSize = isSelected ? 14 : isHovered ? 13 : 12;
      ctx.font = `${iconSize}px 'Inter', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isUnlocked || isHovered) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(
          {
            economic: '💰',
            military: '⚔️',
            mystical: '🔮',
            infrastructure: '🏗️',
            diplomatic: '🤝',
            social: '👥',
          }[node.category] ?? '⭐',
          cNode.x + 1,
          cNode.y + 1,
        );
      }

      ctx.fillStyle = isUnlocked ? '#ffffff' : canUnlock ? (affordable ? baseColor : '#fbbf24') : '#9ca3af';
      ctx.fillText(
        {
          economic: '💰',
          military: '⚔️',
          mystical: '🔮',
          infrastructure: '🏗️',
          diplomatic: '🤝',
          social: '👥',
        }[node.category] ?? '⭐',
        cNode.x,
        cNode.y,
      );

      if (canUnlock && !isUnlocked) {
        const pulse = Math.sin(time * 3) * 0.3 + 0.7;
        const pulseRadius = nodeRadius + 5 + Math.sin(time * 4) * 3;
        const pulseColor = canUnlock && !affordable ? '#ef4444' : baseColor;
        ctx.strokeStyle = `${pulseColor}${Math.floor(pulse * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        const innerPulse = Math.sin(time * 5 + Math.PI) * 0.2 + 0.8;
        ctx.strokeStyle = `${baseColor}${Math.floor(innerPulse * 128).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, nodeRadius + 2, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 4; i += 1) {
          const sparkleAngle = (time * 2 + (i * Math.PI) / 2) % (Math.PI * 2);
          const sparkleRadius = nodeRadius + 15;
          const sparkleX = cNode.x + Math.cos(sparkleAngle) * sparkleRadius;
          const sparkleY = cNode.y + Math.sin(sparkleAngle) * sparkleRadius;

          ctx.fillStyle = `${baseColor}80`;
          ctx.beginPath();
          ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    ctx.restore();
  }, [
    canvasRef,
    size,
    pan,
    zoom,
    starField,
    time,
    layout,
    tree.edges,
    unlocked,
    highlightEdges,
    checkUnlock,
    canAfford,
    colorFor,
    hover,
    selected,
    highlightNodes,
    nodeTransitions,
  ]);

  return {
    updateNodeTransition,
    spawnParticles,
  };
}
