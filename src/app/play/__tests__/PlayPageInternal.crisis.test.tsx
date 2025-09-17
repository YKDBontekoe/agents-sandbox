/* @vitest-environment jsdom */

import React, { type ReactNode } from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import PlayPage from '../PlayPageInternal';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => null,
}));

vi.mock('@/components/game/GameRenderer', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/GameContext', () => ({
  GameProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/game/IsometricGrid', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/ViewportManager', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/game/MemoryManager', () => ({
  __esModule: true,
  default: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/game/hud/CouncilPanel', () => ({
  __esModule: true,
  CouncilPanel: () => null,
}));

vi.mock('@/components/game/hud/EdictsPanel', () => ({
  __esModule: true,
  EdictsPanel: () => null,
}));

vi.mock('@/components/game/TileTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/SettingsPanel', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/panels/TileInfoPanel', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/GameLayers', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/GoalBanner', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/OnboardingGuide', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/hud/panels/ModularWorkerPanel', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/hud/panels/ModularQuestPanel', () => ({
  __esModule: true,
  default: () => null,
  createInitialQuestSnapshot: () => ({
    activeChapterId: 'intro',
    chapterOrder: [],
    chapters: {},
  }),
  QUEST_BLUEPRINTS: [],
}));

vi.mock('@/components/game/hud/NotificationHost', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/CityManagementPanel', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/hud/WorkerPanel', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/game/resourceUtils', () => ({
  __esModule: true,
  SimResources: {} as unknown,
  canAfford: () => true,
  applyCost: (resources: Record<string, number>) => resources,
  projectCycleDeltas: (resources: Record<string, number>) => ({
    updated: {
      grain: resources.grain ?? 0,
      wood: resources.wood ?? 0,
      planks: resources.planks ?? 0,
      coin: resources.coin ?? 0,
      mana: resources.mana ?? 0,
      favor: resources.favor ?? 0,
      unrest: 0,
      threat: 0,
    },
    shortages: {},
  }),
}));

vi.mock('@/components/game/simCatalog', () => ({
  __esModule: true,
  SIM_BUILDINGS: {
    farm: { workCapacity: 2, buildCosts: { grain: 0 } },
  },
  BUILDABLE_TILES: ['grass'],
}));

vi.mock('@/components/game/skills/generate', () => ({
  __esModule: true,
  generateSkillTree: () => ({ nodes: [] }),
}));

vi.mock('@/components/game/skills/progression', () => ({
  __esModule: true,
  accumulateEffects: () => ({
    resMul: {},
    bldMul: {},
    upkeepDelta: 0,
    globalBuildingMultiplier: 1,
    globalResourceMultiplier: 1,
    routeCoinMultiplier: 1,
    patrolCoinUpkeepMultiplier: 1,
    buildingInputMultiplier: 1,
  }),
}));

vi.mock('@/components/game/skills/storage', () => ({
  __esModule: true,
  sanitizeSkillList: (skills: string[] = []) => skills,
  readSkillCache: () => null,
  recordToSkillList: () => [],
  writeSkillCache: () => {},
}));

vi.mock('@/state/useNotify', () => ({
  useNotify: () => () => {},
}));

vi.mock('@/hooks/useIdGenerator', () => ({
  useIdGenerator: () => () => 'id-1',
}));

vi.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/infrastructure/config', () => ({
  __esModule: true,
  publicConfig: {
    nodeEnv: 'test',
    logLevel: 'error',
    nextPublicSupabaseUrl: 'http://localhost',
    nextPublicSupabaseAnonKey: 'anon',
    nextPublicOfflineMode: false,
    nextPublicDisableRealtime: true,
  },
}));

vi.mock('@engine', () => {
  const fakeTime = {
    start: vi.fn(),
    destroy: vi.fn(),
    setSpeed: vi.fn(),
    getCurrentTime: () => ({ totalMinutes: 0, season: 'spring' }),
  };
  return {
    __esModule: true,
    simulationSystem: {
      updateSimulation: vi.fn(() => ({ buildings: [], resources: {} })),
      generateVisualIndicators: vi.fn(() => []),
    },
    EnhancedGameState: class {},
    VisualIndicator: class {},
    TimeSystem: class {
      start = vi.fn();
      destroy = vi.fn();
      setSpeed = vi.fn();
      getCurrentTime = () => ({ totalMinutes: 0, season: 'spring' });
    },
    timeSystem: fakeTime,
    TIME_SPEEDS: { NORMAL: 'normal', PAUSED: 'paused' },
    GameTime: class {},
  };
});

const originalFetch = global.fetch;
const originalCrypto = globalThis.crypto;
const originalReactGlobal = (globalThis as Record<string, unknown>).React;

const createJsonResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  json: async () => data,
});

describe('PlayPageInternal crisis handling', () => {
  beforeEach(() => {
    const crisisState = {
      id: 'state-1',
      cycle: 1,
      max_cycle: 1,
      workers: 0,
      resources: {
        grain: 100,
        coin: 50,
        mana: 40,
        favor: 5,
        unrest: 85,
        threat: 10,
      },
      buildings: [],
      routes: [],
      auto_ticking: false,
      crisis: {
        type: 'unrest' as const,
        message: 'Test crisis',
        penalty: { grain: -10 },
      },
    };
    const stableState = {
      ...crisisState,
      auto_ticking: true,
      crisis: undefined,
      resources: {
        ...crisisState.resources,
        unrest: 20,
      },
    };
    let crisisActive = true;

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('/api/map')) {
        return createJsonResponse({ map: [] });
      }
      if (url.startsWith('/api/debug-log')) {
        return createJsonResponse({ ok: true });
      }
      if (url === '/api/proposals') {
        return createJsonResponse({ proposals: [] });
      }
      if (url === '/api/state/heartbeat') {
        return createJsonResponse({ applied: 0, state: stableState });
      }
      if (url === '/api/state' && init?.method === 'PATCH') {
        crisisActive = false;
        return createJsonResponse(stableState);
      }
      if (url === '/api/state') {
        return createJsonResponse(crisisActive ? crisisState : stableState);
      }
      return createJsonResponse({});
    }) as typeof fetch;

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: () => 'uuid',
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'React', {
      value: React,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    global.fetch = originalFetch;
    if (originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis as Record<string, unknown>, 'crypto');
    }
    if (originalReactGlobal) {
      Object.defineProperty(globalThis, 'React', {
        value: originalReactGlobal,
        configurable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis as Record<string, unknown>, 'React');
    }
  });

  it('shows crisis modal and resolves when Endure is clicked', async () => {
    render(<PlayPage initialState={null} initialProposals={[]} />);

    await screen.findByText('Unrest Boils Over');

    fireEvent.click(screen.getByText('Endure'));

    await waitFor(() => {
      const calls = (global.fetch as vi.Mock).mock.calls;
      const acknowledged = calls.some(([url, init]) => {
        if (typeof url !== 'string') return false;
        const options = init as RequestInit | undefined;
        return url === '/api/state' && options?.method === 'PATCH';
      });
      expect(acknowledged).toBe(true);
    });

    await waitFor(() => {
      expect(screen.queryByText('Unrest Boils Over')).toBeNull();
    });
  });
});
