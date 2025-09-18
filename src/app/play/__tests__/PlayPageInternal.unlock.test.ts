import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('pixi.js', () => {
  class MockEventEmitter {
    on() {
      return this;
    }

    off() {
      return this;
    }

    emit() {
      return true;
    }
  }

  class MockContainer {
    addChild() {
      return this;
    }

    removeChildren() {}

    destroy() {}

    on() {
      return this;
    }

    off() {
      return this;
    }
  }

  class MockGraphics extends MockContainer {
    lineStyle() {
      return this;
    }

    beginFill() {
      return this;
    }

    drawRect() {
      return this;
    }

    drawCircle() {
      return this;
    }

    endFill() {
      return this;
    }
  }

  class MockTexture {
    source: unknown;
    frame: unknown;
    defaultAnchor: { x: number; y: number };

    constructor(options: { source?: unknown; frame?: unknown; defaultAnchor?: { x: number; y: number } } = {}) {
      this.source = options.source ?? {};
      this.frame = options.frame ?? null;
      this.defaultAnchor = options.defaultAnchor ?? { x: 0, y: 0 };
    }

    destroy() {}

    static from() {
      return new MockTexture();
    }
  }

  class MockRectangle {
    constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
  }

  class MockMatrix {
    constructor(
      public a = 1,
      public b = 0,
      public c = 0,
      public d = 1,
      public tx = 0,
      public ty = 0,
    ) {}
  }

  class MockRenderer {
    render() {}
  }

  class MockTicker {
    add() {}

    remove() {}
  }

  const mockRenderTexture = {
    create: vi.fn(() => ({
      source: {},
      destroy: vi.fn(),
    })),
  };

  const mockAssets = {
    add: vi.fn(),
    load: vi.fn(() => Promise.resolve({})),
  };

  const mockExtensions = {
    add: vi.fn(),
  };

  class MockApplication {
    stage = new MockContainer();
    view = {};
    renderer = new MockRenderer();
    ticker = new MockTicker();

    destroy() {}
  }

  return {
    Application: MockApplication,
    settings: {},
    utils: { EventEmitter: MockEventEmitter },
    Container: MockContainer,
    Graphics: MockGraphics,
    Sprite: class extends MockContainer {},
    Texture: MockTexture,
    RenderTexture: mockRenderTexture,
    Rectangle: MockRectangle,
    Matrix: MockMatrix,
    Renderer: MockRenderer,
    Ticker: MockTicker,
    Assets: mockAssets,
    extensions: mockExtensions,
    ExtensionType: { LoadParser: 'LoadParser' },
    LoaderParserPriority: { Normal: 0 },
    Point: class {
      constructor(public x = 0, public y = 0) {}
    },
  };
});

vi.mock('pixi-viewport', () => ({
  Viewport: class MockViewport {},
}));

import { ensureStateForSkillUnlock } from '../PlayPageInternal';
import logger from '@/lib/logger';
import type { SkillNode } from '@/components/game/skills/types';

describe('ensureStateForSkillUnlock', () => {
  const skill: SkillNode = {
    id: 'test-skill',
    title: 'Test Skill',
    description: 'A skill used for testing.',
    category: 'mystical',
    rarity: 'common',
    quality: 'common',
    tags: [],
    cost: {},
    baseCost: {},
    effects: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('warns and notifies when the state has not hydrated yet', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const notify = vi.fn();

    const result = ensureStateForSkillUnlock(null, skill, notify);

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('Received skill unlock "test-skill" before state hydration');
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        title: 'Syncing game data',
      }),
    );
  });

  it('allows unlock processing when state is present', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const notify = vi.fn();

    const hydratedState = {
      id: 'state-1',
      cycle: 1,
      resources: { coin: 0, mana: 0, favor: 0 },
      workers: 0,
      buildings: [],
    };

    const result = ensureStateForSkillUnlock(hydratedState, skill, notify);

    expect(result).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
