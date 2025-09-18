import { describe, it, expect } from 'vitest';
import { createInitialQuestSnapshot } from '../ModularQuestPanel';
import {
  evaluateQuestProgress,
  type QuestComputationContext,
  type QuestEventLogEntry,
  type StoredBuilding,
  type TradeRoute,
} from '@/app/play/PlayPageInternal';

const makeBuildings = (): StoredBuilding[] => [
  { id: 'farm-1', typeId: 'farm', x: 4, y: 2, level: 1, workers: 1 },
  { id: 'house-1', typeId: 'house', x: 5, y: 2, level: 1, workers: 0 },
  { id: 'trade-1', typeId: 'trade_post', x: 6, y: 2, level: 1, workers: 2 },
  { id: 'trade-2', typeId: 'trade_post', x: 8, y: 2, level: 1, workers: 2 },
  { id: 'trade-3', typeId: 'trade_post', x: 10, y: 2, level: 1, workers: 2 },
  { id: 'trade-4', typeId: 'trade_post', x: 12, y: 2, level: 1, workers: 2 },
  { id: 'store-1', typeId: 'storehouse', x: 7, y: 3, level: 1, workers: 1 },
  { id: 'council-1', typeId: 'council_hall', x: 9, y: 3, level: 1, workers: 0 },
];

const baseRoutes: TradeRoute[] = [
  { id: 'r1', fromId: 'trade-1', toId: 'store-1', length: 3 },
  { id: 'r2', fromId: 'trade-1', toId: 'trade-2', length: 4 },
  { id: 'r3', fromId: 'trade-2', toId: 'trade-3', length: 5 },
  { id: 'r4', fromId: 'trade-2', toId: 'trade-4', length: 6 },
];

describe('evaluateQuestProgress', () => {
  it('advances through trade, leyline, and ascension chapters', () => {
    const initial = createInitialQuestSnapshot();
    const buildings = makeBuildings();

    const earlyContext: QuestComputationContext = {
      milestoneSnapshot: { m_farm: true, m_route: true, m_storehouse: true },
      routes: [baseRoutes[0]],
      buildings,
      proposalsSummoned: true,
      proposalsCount: 1,
      unlockedSkillIds: ['skill-a'],
      resources: { grain: 45, coin: 200, mana: 120 },
      cycle: 3,
      leylines: [],
      edicts: { tariffs: 50, patrols: 0 },
      crisisStats: { encountered: 0, resolved: 0 },
      currentCrisis: null,
      eventHistory: [],
    };

    const afterEarly = evaluateQuestProgress(initial, earlyContext);
    expect(afterEarly.chapters['unlock-council-power'].status).toBe('complete');
    expect(afterEarly.activeChapterId).toBe('command-trade-empire');

    const tradeContext: QuestComputationContext = {
      ...earlyContext,
      routes: baseRoutes,
      proposalsCount: 3,
      unlockedSkillIds: ['skill-a', 'skill-b'],
      resources: { grain: 60, coin: 650, mana: 180 },
      edicts: { tariffs: 55, patrols: 1 },
    };

    const afterTrade = evaluateQuestProgress(afterEarly, tradeContext);
    expect(afterTrade.chapters['command-trade-empire'].status).toBe('complete');
    expect(afterTrade.activeChapterId).toBe('master-the-leylines');
    expect(
      afterTrade.chapters['command-trade-empire'].objectives['trade-network-dominance'].progress?.current,
    ).toBe(4);

    const leylineContext: QuestComputationContext = {
      ...tradeContext,
      leylines: [
        { id: 'l1', fromX: 3, fromY: 3, toX: 9, toY: 4, capacity: 80, currentFlow: 80, isActive: true },
        { id: 'l2', fromX: 5, fromY: 1, toX: 11, toY: 2, capacity: 90, currentFlow: 90, isActive: true },
      ],
    };

    const afterLeylines = evaluateQuestProgress(afterTrade, leylineContext);
    expect(afterLeylines.chapters['master-the-leylines'].status).toBe('complete');
    expect(afterLeylines.activeChapterId).toBe('ascension-prelude');

    const ascensionEvents: QuestEventLogEntry[] = [
      { id: 'omen-1', name: 'Eclipse of Glass', occurredAt: 8, summary: 'Sky darkens' },
      { id: 'omen-2', name: 'Harvest Bloom', occurredAt: 9, summary: 'Fields glow' },
      { id: 'omen-3', name: 'Stellar Choir', occurredAt: 10, summary: 'Spheres resonate' },
    ];

    const ascensionContext: QuestComputationContext = {
      ...leylineContext,
      unlockedSkillIds: ['skill-a', 'skill-b', 'skill-c', 'skill-d', 'skill-e', 'skill-f'],
      crisisStats: { encountered: 3, resolved: 2 },
      resources: { grain: 120, coin: 820, mana: 450, favor: 40 },
      eventHistory: ascensionEvents,
      proposalsCount: 5,
    };

    const afterAscension = evaluateQuestProgress(afterLeylines, ascensionContext);
    expect(afterAscension.chapters['ascension-prelude'].status).toBe('complete');
    const ascensionObjectives = afterAscension.chapters['ascension-prelude'].objectives;
    expect(ascensionObjectives['unlock-advanced-skills'].progress?.current).toBe(6);
    expect(ascensionObjectives['weather-crises'].progress?.current).toBe(2);
    expect(ascensionObjectives['catalog-omens'].progress?.current).toBe(3);
    expect(ascensionObjectives['mana-stockpile'].progress?.current).toBe(400);
  });
});
