import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConstellationSkillTree } from './useConstellationSkillTree';
import type { ConstellationLayout } from '../layout/constellation';
import type { ConstellationNode, SkillNode, Vec2 } from '../types';
import type { ControllerHandlers } from './useConstellationController';

vi.mock('../layout/constellation', () => ({
  createConstellationLayout: vi.fn(),
}));

vi.mock('../layout/highlights', () => ({
  computeHighlight: vi.fn(() => ({ nodes: new Set<string>(), edges: new Set<string>() })),
}));

vi.mock('../unlock', () => ({
  collectUnlockBlockers: vi.fn(() => []),
}));

import { createConstellationLayout } from '../layout/constellation';
import { computeHighlight } from '../layout/highlights';
import { collectUnlockBlockers } from '../unlock';

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

const createConstellationNode = (id: string, position: Vec2): ConstellationNode => ({
  node: createSkillNode({ id }),
  gridX: Math.round(position.x),
  gridY: Math.round(position.y),
  x: position.x,
  y: position.y,
  constellation: 'Test',
  tier: 0,
});

const createLayout = (nodes: ConstellationNode[], maxRadius: number): ConstellationLayout => ({
  nodes,
  constellations: {},
  metrics: {
    baseRingRadius: 0,
    ringGap: 0,
    radiusByTier: [0],
    maxConstellationRadius: maxRadius,
    maxTier: 1,
    constellationSpacing: 0,
  },
});

describe('useConstellationSkillTree', () => {
  const createControllerHandlers = () => ({
    onMouseMove: vi.fn(),
    onMouseDown: vi.fn(),
    onMouseUp: vi.fn(),
    onMouseLeave: vi.fn(),
    onClick: vi.fn(),
    onWheel: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    resetZoom: vi.fn(),
    fitToView: vi.fn(),
    zoomTo: vi.fn(),
  });

  beforeEach(() => {
    vi.mocked(computeHighlight).mockReturnValue({ nodes: new Set<string>(), edges: new Set<string>() });
    vi.mocked(collectUnlockBlockers).mockReturnValue([]);
  });

  it('selects focused node and centers view when controls are registered', async () => {
    const focusedNode = createConstellationNode('focus', { x: 50, y: -30 });
    const layout = createLayout([focusedNode], 120);
    vi.mocked(createConstellationLayout).mockImplementation(() => layout);

    const onSelectNode = vi.fn();
    const { result } = renderHook((props: Parameters<typeof useConstellationSkillTree>[0]) =>
      useConstellationSkillTree(props),
      {
        initialProps: {
          tree: { nodes: [focusedNode.node], edges: [] },
          unlocked: {},
          onUnlock: vi.fn(),
          colorFor: () => '#fff',
          focusNodeId: 'focus',
          resources: undefined,
          onSelectNode,
        },
      },
    );

    const controls = createControllerHandlers();
    const zoomToSpy = controls.zoomTo;
    const fitToViewSpy = controls.fitToView;

    act(() => {
      result.current.registerControls(controls as ControllerHandlers);
    });

    await waitFor(() => {
      expect(zoomToSpy).toHaveBeenCalled();
    });

    expect(result.current.selected?.node.id).toBe('focus');
    expect(result.current.pan).toEqual({ x: -focusedNode.x, y: -focusedNode.y });
    expect(onSelectNode).toHaveBeenCalledWith('focus');
    expect(fitToViewSpy).not.toHaveBeenCalled();
  });

  it('auto fits when the constellation radius grows without a focus node', async () => {
    const node = createConstellationNode('node-1', { x: 0, y: 0 });
    let layout = createLayout([node], 100);
    vi.mocked(createConstellationLayout).mockImplementation(() => layout);

    const { result, rerender } = renderHook((props: Parameters<typeof useConstellationSkillTree>[0]) =>
      useConstellationSkillTree(props),
      {
        initialProps: {
          tree: { nodes: [node.node], edges: [] },
          unlocked: {},
          onUnlock: vi.fn(),
          colorFor: () => '#fff',
          focusNodeId: undefined,
          resources: undefined,
          onSelectNode: vi.fn(),
        },
      },
    );

    const controls = createControllerHandlers();
    const fitToViewSpy = controls.fitToView;

    act(() => {
      result.current.registerControls(controls as ControllerHandlers);
    });

    await waitFor(() => {
      expect(fitToViewSpy).toHaveBeenCalledTimes(1);
    });

    layout = createLayout([node], 150);

    rerender({
      tree: { nodes: [node.node], edges: [] },
      unlocked: {},
      onUnlock: vi.fn(),
      colorFor: () => '#fff',
      focusNodeId: undefined,
      resources: undefined,
      onSelectNode: vi.fn(),
    });

    await waitFor(() => {
      expect(fitToViewSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('updates selection state and notifies callback when selection changes', () => {
    const node = createConstellationNode('node-2', { x: 10, y: -10 });
    const layout = createLayout([node], 80);
    vi.mocked(createConstellationLayout).mockImplementation(() => layout);

    const onSelectNode = vi.fn();
    const { result } = renderHook((props: Parameters<typeof useConstellationSkillTree>[0]) =>
      useConstellationSkillTree(props),
      {
        initialProps: {
          tree: { nodes: [node.node], edges: [] },
          unlocked: {},
          onUnlock: vi.fn(),
          colorFor: () => '#fff',
          focusNodeId: undefined,
          resources: undefined,
          onSelectNode,
        },
      },
    );

    act(() => {
      result.current.handleSelectedChange(node);
    });

    expect(result.current.selected).toBe(node);
    expect(onSelectNode).toHaveBeenCalledWith('node-2');
  });
});
