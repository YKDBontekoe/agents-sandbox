import { renderHook, act } from '@testing-library/react';
import { createRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { useConstellationPanZoom } from './useConstellationPanZoom';
import type { ConstellationLayout } from '../layout/constellation';
import type { ConstellationNode, SkillNode, Vec2 } from '../types';

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
    createConstellationNode({ id: 'node-1' }, { x: -100, y: -50 }),
    createConstellationNode({ id: 'node-2' }, { x: 100, y: 50 }),
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

describe('useConstellationPanZoom', () => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  } as unknown as HTMLCanvasElement;

  let requestAnimationFrameMock: ReturnType<typeof vi.fn>;
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    canvasRef.current = canvas;
    rafCallbacks = [];
    requestAnimationFrameMock = vi.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
      const index = id - 1;
      if (rafCallbacks[index]) {
        rafCallbacks[index] = () => {};
      }
    }));
  });

  afterEach(() => {
    rafCallbacks = [];
    vi.unstubAllGlobals();
  });

  const setup = () =>
    renderHook(() => {
      const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });
      const [zoom, setZoom] = useState(1);
      const panZoom = useConstellationPanZoom({
        canvasRef,
        layout,
        size: { w: 800, h: 600 },
        pan,
        zoom,
        onPanChange: setPan,
        onZoomChange: setZoom,
      });
      return { panZoom, pan, zoom } as const;
    });

  it('clamps zoom and updates state', () => {
    const { result } = setup();

    act(() => {
      result.current.panZoom.zoomTo(10);
    });

    expect(result.current.zoom).toBeCloseTo(4.0);
  });

  it('animates zoom when requested', () => {
    const { result } = setup();

    act(() => {
      result.current.panZoom.zoomTo(2, { animate: true });
    });

    expect(requestAnimationFrameMock).toHaveBeenCalled();
    act(() => {
      rafCallbacks.shift()?.(0);
    });
    expect(result.current.zoom).toBeGreaterThan(1);
    expect(result.current.zoom).toBeLessThanOrEqual(2);
  });

  it('computes fit-to-view zoom and pan', () => {
    const { result } = setup();

    act(() => {
      result.current.panZoom.fitToView();
    });

    expect(result.current.zoom).toBeCloseTo(2);
    expect(result.current.pan.x).toBeCloseTo(0);
    expect(result.current.pan.y).toBeCloseTo(0);
  });

  it('updates pan while dragging', () => {
    const { result } = setup();
    const mouseDownEvent = { clientX: 100, clientY: 120 } as unknown as ReactMouseEvent<HTMLCanvasElement>;
    const mouseMoveEvent = { clientX: 150, clientY: 150 } as unknown as ReactMouseEvent<HTMLCanvasElement>;

    act(() => {
      result.current.panZoom.handleMouseDown(mouseDownEvent);
    });

    let moveResult: ReturnType<typeof result.current.panZoom.handleMouseMove>;
    act(() => {
      moveResult = result.current.panZoom.handleMouseMove(mouseMoveEvent);
    });

    expect(moveResult).toMatchObject({ isDragging: true, didPan: true });
    expect(result.current.pan).toEqual({ x: 50, y: 30 });
  });
});
