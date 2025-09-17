import { renderHook, act } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { useConstellationHover } from './useConstellationHover';
import type { ConstellationLayout } from '../layout/constellation';
import type { ConstellationNode, SkillNode, TooltipState, Vec2 } from '../types';
import type { PanZoomMouseMoveResult } from './useConstellationPanZoom';

const createSkillNode = (overrides: Partial<SkillNode> = {}): SkillNode => ({
  id: overrides.id ?? 'node-1',
  title: overrides.title ?? 'Node 1',
  description: overrides.description ?? 'Test node',
  category: overrides.category ?? 'economic',
  rarity: overrides.rarity ?? 'common',
  quality: overrides.quality ?? 'common',
  tags: overrides.tags ?? [],
  cost: overrides.cost ?? {},
  baseCost: overrides.baseCost ?? {},
  effects: overrides.effects ?? [],
  requires: overrides.requires,
  tier: overrides.tier,
  importance: overrides.importance,
  unlockCount: overrides.unlockCount,
  isRevealed: overrides.isRevealed,
  specialAbility: overrides.specialAbility,
  statMultiplier: overrides.statMultiplier,
  exclusiveGroup: overrides.exclusiveGroup,
  unlockConditions: overrides.unlockConditions,
});

const createConstellationNode = (nodeOverrides: Partial<SkillNode>, position: Vec2): ConstellationNode => ({
  node: createSkillNode(nodeOverrides),
  gridX: Math.round(position.x),
  gridY: Math.round(position.y),
  x: position.x,
  y: position.y,
  constellation: 'Test',
  tier: nodeOverrides.tier ?? 0,
});

const layout: ConstellationLayout = {
  nodes: [
    createConstellationNode({ id: 'node-1', category: 'economic' }, { x: -100, y: -50 }),
    createConstellationNode({ id: 'node-2', category: 'mystical' }, { x: 100, y: 50 }),
  ],
  constellations: {},
  metrics: {
    baseRingRadius: 0,
    ringGap: 0,
    radiusByTier: [0],
    maxConstellationRadius: 200,
    maxTier: 1,
    constellationSpacing: 0,
  },
};

const initialTooltip: TooltipState = {
  visible: false,
  x: 0,
  y: 0,
  node: null,
  fadeIn: 0,
  anchor: 'top',
  offset: { x: 0, y: 0 },
};

describe('useConstellationHover', () => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  } as unknown as HTMLCanvasElement;

  beforeEach(() => {
    canvasRef.current = canvas;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const setup = (initialHover: ConstellationNode | null = null) => {
    const updateNodeTransition = vi.fn();
    const spawnParticles = vi.fn();
    const colorFor = vi.fn(() => '#fff');

    const hook = renderHook(() => {
      const [hover, setHover] = useState<ConstellationNode | null>(initialHover);
      const [tooltip, setTooltip] = useState<TooltipState>(initialTooltip);
      const handlers = useConstellationHover({
        canvasRef,
        layout,
        hover,
        onHoverChange: setHover,
        onTooltipChange: setTooltip,
        updateNodeTransition,
        spawnParticles,
        colorFor,
      });
      return { handlers, hover, tooltip, updateNodeTransition, spawnParticles, colorFor } as const;
    });

    return {
      ...hook,
      updateNodeTransition,
      spawnParticles,
      colorFor,
    };
  };

  const moveResultForNode = (node: ConstellationNode): PanZoomMouseMoveResult => ({
    canvas: { x: node.x + 400, y: node.y + 300 },
    world: { x: node.x, y: node.y },
    isDragging: false,
    didPan: false,
  });

  it('applies hover effects and schedules tooltip', () => {
    const { result, updateNodeTransition, spawnParticles } = setup();
    const targetNode = layout.nodes[1]!;

    act(() => {
      result.current.handlers.handleMouseMove(moveResultForNode(targetNode));
    });

    expect(result.current.hover?.node.id).toBe(targetNode.node.id);
    expect(spawnParticles).toHaveBeenCalledWith(targetNode.x, targetNode.y, 'hover', 4, '#fff');
    expect(updateNodeTransition).toHaveBeenCalledWith(targetNode.node.id, { scale: 1.1, glowIntensity: 0.8 });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.tooltip.visible).toBe(true);
    expect(result.current.tooltip.node?.id).toBe(targetNode.node.id);
  });

  it('resets hover when dragging pans', () => {
    const initialHover = layout.nodes[0]!;
    const { result, updateNodeTransition } = setup(initialHover);

    act(() => {
      result.current.handlers.handleMouseMove({
        canvas: { x: 0, y: 0 },
        world: { x: 0, y: 0 },
        isDragging: true,
        didPan: true,
      });
    });

    expect(result.current.hover).toBeNull();
    expect(updateNodeTransition).toHaveBeenCalledWith(initialHover.node.id, { scale: 1, glowIntensity: 0 });
  });

  it('clears hover state on leave', () => {
    const initialHover = layout.nodes[0]!;
    const { result, updateNodeTransition } = setup(initialHover);

    act(() => {
      result.current.handlers.handleMouseLeave();
    });

    expect(result.current.hover).toBeNull();
    expect(updateNodeTransition).toHaveBeenCalledWith(initialHover.node.id, { scale: 1, glowIntensity: 0 });
    expect(result.current.tooltip.visible).toBe(false);
  });
});
