import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { ConstellationLayout } from '../layout/constellation';
import type { ParticleEffect } from '../types';
import {
  paintBackground,
  paintConnections,
  paintNodes,
  paintParticles,
} from '../constellationPainter';

vi.mock('../effects', () => ({
  drawConnections: vi.fn(),
  drawParticles: vi.fn(),
}));

const { drawConnections, drawParticles } = await import('../effects');

const createMockContext = () => {
  const gradientFactory = () => ({ addColorStop: vi.fn() });
  const ctx: any = {
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    closePath: vi.fn(),
    createRadialGradient: vi.fn(gradientFactory),
    fillText: vi.fn(),
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
  };

  Object.defineProperties(ctx, {
    fillStyle: {
      get() {
        return this._fillStyle;
      },
      set(value) {
        this._fillStyle = value;
      },
    },
    strokeStyle: {
      get() {
        return this._strokeStyle;
      },
      set(value) {
        this._strokeStyle = value;
      },
    },
    font: {
      get() {
        return this._font;
      },
      set(value) {
        this._font = value;
      },
    },
    textAlign: {
      get() {
        return this._textAlign;
      },
      set(value) {
        this._textAlign = value;
      },
    },
    textBaseline: {
      get() {
        return this._textBaseline;
      },
      set(value) {
        this._textBaseline = value;
      },
    },
  });

  return ctx as unknown as CanvasRenderingContext2D;
};

const baseLayout: ConstellationLayout = {
  nodes: [
    {
      node: {
        id: 'node-1',
        title: 'Node',
        description: '',
        category: 'economic',
        rarity: 'common',
        quality: 'common',
        tags: [],
        cost: {},
        baseCost: {},
        effects: [],
      },
      gridX: 0,
      gridY: 0,
      x: 10,
      y: 20,
      constellation: 'Merchant',
      tier: 0,
    },
  ],
  constellations: {} as any,
  metrics: {
    baseRingRadius: 0,
    ringGap: 0,
    radiusByTier: [],
    maxConstellationRadius: 0,
    maxTier: 0,
    constellationSpacing: 0,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('constellationPainter', () => {
  it('paints the background stars', () => {
    const ctx = createMockContext();
    const starField = [
      { x: 5, y: -3, brightness: 0.5, twinkle: 0, size: 2 },
    ];

    paintBackground(ctx, {
      size: { w: 100, h: 50 },
      pan: { x: 0, y: 0 },
      zoom: 1,
      starField,
      time: 0,
    });

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 50);
    expect(
      ctx.arc.mock.calls.some((call) => call[0] === 5 && call[1] === -3 && call[2] === 2),
    ).toBe(true);
  });

  it('delegates connection and particle painting to effect helpers', () => {
    const ctx = createMockContext();
    const particles: ParticleEffect[] = [
      { id: 'p', x: 0, y: 0, vx: 0, vy: 0, life: 1, maxLife: 1, size: 1, color: '#fff', type: 'ambient' },
    ];

    const highlightEdges = new Set<string>();
    const treeEdges = [{ from: 'a', to: 'b' }];
    const unlocked: Record<string, boolean> = {};

    paintParticles(ctx, { particles, time: 1 });
    expect(drawParticles).toHaveBeenCalledWith(ctx, particles, 1);

    paintParticles(ctx, { particles: [], time: 1 });
    expect(drawParticles).toHaveBeenCalledTimes(1);

    paintConnections(ctx, {
      layout: baseLayout,
      treeEdges,
      unlocked,
      highlightEdges,
      time: 0,
      checkUnlock: () => ({ ok: true, reasons: [] }),
    });

    expect(drawConnections).toHaveBeenCalledWith(
      ctx,
      baseLayout,
      treeEdges,
      unlocked,
      highlightEdges,
      0,
      expect.any(Function),
    );
  });

  it('renders nodes using transition scaling and gradients', () => {
    const ctx = createMockContext();
    const transitions = new Map([
      [
        'node-1',
        {
          scale: 1.2,
          opacity: 1,
          glowIntensity: 0,
          targetScale: 1.2,
          targetOpacity: 1,
          targetGlowIntensity: 0,
          lastUpdate: 0,
        },
      ],
    ]);

    paintNodes(ctx, {
      layout: baseLayout,
      transitions,
      highlightNodes: new Set(),
      hover: null,
      selected: null,
      unlocked: { 'node-1': false },
      time: 0,
      colorFor: () => '#abcdef',
      canAfford: () => true,
      checkUnlock: () => ({ ok: true, reasons: [] }),
    });

    expect(ctx.createRadialGradient).toHaveBeenCalled();
    expect(
      ctx.arc.mock.calls.some(([, , radius]) => Math.abs(radius - 26.4) < 0.001),
    ).toBe(true);
    expect(
      ctx.fillText.mock.calls.some((call) => call[0] === '💰' && call[1] === 10 && call[2] === 20),
    ).toBe(true);
  });
});
