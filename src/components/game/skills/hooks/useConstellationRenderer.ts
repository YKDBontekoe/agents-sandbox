import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { ParticleSystem } from '@engine/visuals/constellation/particleSystem';
import type {
  ConstellationNode,
  SkillNode,
  SkillTree,
  TooltipState,
  Vec2,
  ParticleEffect,
} from '../types';
import { useAnimationFrame } from '../hooks';
import type { ConstellationLayout } from '../layout/constellation';
import {
  paintBackground,
  paintConnections,
  paintNodes,
  paintParticles,
} from '../constellationPainter';
import { useConstellationStarfield } from './useConstellationStarfield';
import { type NodeTransitionTarget, useNodeTransitions } from './useNodeTransitions';

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

const RENDER_THROTTLE = 16;

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
  const { starField, time, tick: tickStarfield } = useConstellationStarfield();
  const { transitions, updateNodeTransition, tickTransitions } = useNodeTransitions();
  const lastRenderTime = useRef(0);

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
        tickStarfield(dt);

        if (tooltip.visible && tooltip.fadeIn < 1) {
          setTooltip((prev) => {
            if (!prev.visible || prev.fadeIn >= 1) return prev;
            return { ...prev, fadeIn: Math.min(1, prev.fadeIn + dt * 0.003) };
          });
        }

        tickTransitions(now);

        particleSystemRef.current.update(dt);

        if (Math.random() < 0.002) {
          const x = (Math.random() - 0.5) * 1200;
          const y = (Math.random() - 0.5) * 800;
          particleSystemRef.current.addParticles(x, y, 'ambient', 1, '#4a90e2');
        }
      },
      [tickStarfield, tooltip.visible, tooltip.fadeIn, setTooltip, tickTransitions],
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

    paintBackground(ctx, { size, pan, zoom, starField, time });

    ctx.save();
    ctx.translate(size.w / 2 + pan.x, size.h / 2 + pan.y);
    ctx.scale(zoom, zoom);

    const particles = particleSystemRef.current.getParticles();
    paintParticles(ctx, { particles, time });
    paintConnections(ctx, {
      layout,
      treeEdges: tree.edges,
      unlocked,
      highlightEdges,
      time,
      checkUnlock,
    });
    paintNodes(ctx, {
      layout,
      transitions,
      highlightNodes,
      hover,
      selected,
      unlocked,
      time,
      colorFor,
      canAfford,
      checkUnlock,
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
    transitions,
  ]);

  return {
    updateNodeTransition,
    spawnParticles,
  };
}
