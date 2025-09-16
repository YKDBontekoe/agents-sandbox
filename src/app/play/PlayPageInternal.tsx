"use client";

// This file contains the original PlayPage client component logic.
// It accepts optional initial state/proposals to avoid initial loading loops.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import GameRenderer from '@/components/game/GameRenderer';
import { GameProvider } from '@/components/game/GameContext';
import IsometricGrid from '@/components/game/IsometricGrid';
import ViewportManager from '@/components/game/ViewportManager';
import MemoryManager from '@/components/game/MemoryManager';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import logger from '@/lib/logger';
import { publicConfig as config } from '@/infrastructure/config';

import dynamic from 'next/dynamic';
const IntegratedHUDSystem = dynamic(
  () => import('@/components/game/hud/IntegratedHUDSystem').then(m => m.IntegratedHUDSystem),
  { ssr: false }
);
import { SimResources, canAfford, applyCost, projectCycleDeltas } from '@/components/game/resourceUtils';
import { SIM_BUILDINGS, BUILDABLE_TILES } from '@/components/game/simCatalog';
import WorkerPanel from '@/components/game/hud/WorkerPanel';
import { CouncilPanel, CouncilProposal } from '@/components/game/hud/CouncilPanel';
import { EdictsPanel, EdictSetting } from '@/components/game/hud/EdictsPanel';
import type { District } from '@/components/game/districts';
import type { Leyline } from '../../../apps/web/features/leylines';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { generateSkillTree } from '@/components/game/skills/generate';
import { accumulateEffects } from '@/components/game/skills/progression';
import type { SkillNode } from '@/components/game/skills/types';
import { sanitizeSkillList, readSkillCache, recordToSkillList, writeSkillCache } from '@/components/game/skills/storage';
import TileTooltip from '@/components/game/TileTooltip';
import SettingsPanel from '@/components/game/SettingsPanel';
import type { AssignLine } from '@/components/game/AssignmentLinesLayer';
import type { PathHint } from '@/components/game/PathHintsLayer';
import type { Pulse } from '@/components/game/BuildingPulseLayer';
import TileInfoPanel from '@/components/game/panels/TileInfoPanel';
import GameLayers from '@/components/game/GameLayers';
import type { CrisisData } from '@/components/game/CrisisModal';
import GoalBanner from '@/components/game/GoalBanner';
import OnboardingGuide from '@/components/game/OnboardingGuide';
import ModularWorkerPanel from '@/components/game/hud/panels/ModularWorkerPanel';
import ModularQuestPanel from '@/components/game/hud/panels/ModularQuestPanel';
import NotificationHost from '@/components/game/hud/NotificationHost';
import { useNotify } from '@/state/useNotify';
import type { Notification } from '@/components/game/hud/types';
import { useIdGenerator } from '@/hooks/useIdGenerator';
import CityManagementPanel from '@/components/game/CityManagementPanel';
import type { CityStats, ManagementTool, ZoneType, ServiceType } from '@/components/game/CityManagementPanel';
// (settings && other panels are currently not rendered on this page)
// layout preferences not used on this page
import type { GameResources, GameTime } from '@/components/game/hud/types';
import type { CategoryType } from '@arcane/ui';
import { simulationSystem, EnhancedGameState } from '@engine'
import { VisualIndicator } from '@engine';
import { pauseSimulation, resumeSimulation } from './simulationControls';
import { TimeSystem, timeSystem, TIME_SPEEDS, GameTime as SystemGameTime, type TimeSpeed } from '@engine';
import { intervalMsToTimeSpeed, sanitizeIntervalMs } from './timeSpeedUtils';

type BuildTypeId = keyof typeof SIM_BUILDINGS;

const ISO_TILE_WIDTH = 64;
const ISO_TILE_HEIGHT = 32;
const LEYLINE_STORAGE_KEY = 'ad_leylines';

const indicatorDurationToMs = (duration: number): number => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return duration > 100 ? duration : duration * 1000;
};

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);



interface StoredBuilding {
  id: string;
  typeId: keyof typeof SIM_BUILDINGS;
  x: number;
  y: number;
  level: number;
  workers: number;
  traits?: { waterAdj?: number; mountainAdj?: number; forestAdj?: number };
}

interface GameState {
  id: string;
  cycle: number; // Keep for backward compatibility with server
  resources: Record<string, number>;
  workers: number;
  buildings: StoredBuilding[];
  routes?: TradeRoute[];
  edicts?: Record<string, number>;
  map_size?: number;
  skills?: string[];
  skill_tree_seed?: number;
  pinned_skill_targets?: string[];
}

interface TradeRoute {
  id: string;
  fromId: string;
  toId: string;
  length: number;
}

interface Proposal {
  id: string;
  guild: string;
  title: string;
  description: string;
  status: "pending" | "accepted" | "rejected" | "applied";
  predicted_delta: Record<string, number>;
}

interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  cycle: number;
}

interface OmenReading {
  id: string;
  text: string;
  type: string;
  cycle: number;
}

interface PlayPageProps {
  initialState?: GameState | null;
  initialProposals?: Proposal[];
}

type SkillUnlockNotification = Pick<Notification, 'type' | 'title' | 'message'> & {
  dedupeKey?: string;
  dedupeMs?: number;
};

export function ensureStateForSkillUnlock(
  state: GameState | null | undefined,
  skill: SkillNode,
  notify?: (notification: SkillUnlockNotification) => void,
): state is GameState {
  if (state) {
    return true;
  }

  const skillLabel = skill?.title || skill?.id || 'this skill';
  const skillId = skill?.id || 'unknown';
  logger.warn(`Received skill unlock "${skillId}" before state hydration`);
  if (notify) {
    notify({
      type: 'warning',
      title: 'Syncing game data',
      message: `Please wait for your city to finish loading, then try unlocking ${skillLabel} again.`,
      dedupeKey: `skill-unlock-${skillId}-deferred`,
      dedupeMs: 5000,
    });
  }
  return false;
}

export default function PlayPage({ initialState = null, initialProposals = [] }: PlayPageProps) {
  logger.debug('🚀 PlayPage component mounting/rendering');
  const generateId = useIdGenerator();
  const [state, setState] = useState<GameState | null>(initialState);
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals ?? []);
  const [loading, setLoading] = useState(false);
  const [guild, _setGuild] = useState("Wardens");
  const [error, setError] = useState<string | null>(null);
  
  // Initialize tileTypes and gridSize early - MUST be before conditional returns
  const [tileTypes, setTileTypes] = useState<string[][]>([]);
  const [gridSize, setGridSize] = useState<number | null>(() => {
    // Priority: initialState.map_size > localStorage > default 32
    if (initialState?.map_size) {
      const n = Math.max(8, Math.min(48, initialState.map_size));
      logger.debug('Initial gridSize from initialState.map_size:', n);
      return n;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ad_map_size');
        if (stored) {
          const n = Math.max(8, Math.min(48, parseInt(stored, 10) || 32));
          logger.debug('Initial gridSize from localStorage:', n);
          return n;
        }
      } catch (err) {
        logger.error('Error reading gridSize from localStorage:', err);
      }
    }
    logger.debug('Initial gridSize fallback to default: 32');
    return 32;
  });

  const effectiveGridSize = useMemo(() => {
    if (typeof gridSize === 'number' && gridSize > 0) {
      return gridSize;
    }

    const rows = tileTypes.length;
    const cols = tileTypes[0]?.length ?? 0;
    const derived = Math.max(rows, cols);

    return derived > 0 ? derived : 32;
  }, [gridSize, tileTypes]);

  const miniMapDescriptor = useMemo(
    () => ({
      gridSize: effectiveGridSize,
      tileWidth: ISO_TILE_WIDTH,
      tileHeight: ISO_TILE_HEIGHT,
    }),
    [effectiveGridSize],
  );

  // Load map data when gridSize changes - MUST be before conditional returns
  useEffect(() => {
    logger.debug('🔥 MAP USEEFFECT SETUP - gridSize:', gridSize);
    async function loadMap() {
      try {
        logger.debug('🗺️ USEEFFECT TRIGGERED - gridSize:', gridSize);
        
        if (gridSize == null) {
          logger.debug('❌ SKIPPED - gridSize is null');
          return;
        }
        
        const url = `/api/map?size=${gridSize}`;
        logger.debug('🌐 FETCHING:', url);
        
        const res = await fetch(url);
        logger.debug('📡 RESPONSE STATUS:', res.status, res.ok);
        
        if (!res.ok) throw new Error('Failed to load map');
        
        const data = await res.json();
        logger.debug('📦 DATA RECEIVED - map length:', data.map?.length);
        
        logger.debug('🎯 CALLING setTileTypes with data:', {
          mapLength: data.map?.length,
          firstRowLength: data.map?.[0]?.length,
          sampleData: data.map?.slice(0, 2)
        });
        logger.debug('🔄 Current tileTypes length before setState:', tileTypes.length);
        setTileTypes(data.map);
        logger.debug('✅ setTileTypes CALLED - should trigger tileTypes useEffect');
        // Check if we're in React StrictMode (double execution)
        logger.debug('🔍 React StrictMode check - this log should appear once per actual call');
        
      } catch (err) {
        logger.error('❌ MAP LOAD ERROR:', err);
      }
    }
    loadMap();
  }, [gridSize]);
  
  // Monitor tileTypes state changes - MUST be before conditional returns
  useEffect(() => {
    logger.debug('🔥 TILETYPES USEEFFECT SETUP');
    logger.debug('🔍 TILETYPES CHANGED - length:', tileTypes.length, 'firstRowLength:', tileTypes[0]?.length || 0);
    if (tileTypes.length > 0) {
      logger.debug('✅ TILETYPES STATE UPDATED SUCCESSFULLY!');
      // Make a server-side visible log by calling a simple API
      fetch('/api/debug-log?message=TILETYPES_STATE_UPDATED&length=' + tileTypes.length).catch(() => {});
    } else {
      logger.debug('❌ TILETYPES STILL EMPTY');
      // Make a server-side visible log for empty state too
      fetch('/api/debug-log?message=TILETYPES_STILL_EMPTY').catch(() => {});
    }
  }, [tileTypes]);
  
  const [isPaused, setIsPaused] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [edgeScrollEnabled, setEdgeScrollEnabled] = useState(true);
  const [, setCrisis] = useState<CrisisData | null>(null);
  const [isCouncilOpen, setIsCouncilOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try { return parseInt(localStorage.getItem('ad_onboarding_step') || '1', 10) || 1; } catch { return 1; }
  });
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('ad_onboarding_dismissed') === '1';
      setOnboardingOpen(!dismissed);
    } catch {}
  }, []);
  const [tutorialFree, setTutorialFree] = useState<Partial<Record<BuildTypeId, number>>>({ farm: 1, house: 1, council_hall: 1 });
  const [isEdictsOpen, setIsEdictsOpen] = useState(false);
  const [, setIsOmensOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dismissedGuide, setDismissedGuide] = useState(false);
  const [acceptedNotice, setAcceptedNotice] = useState<{ title: string; delta: Record<string, number> } | null>(null);
  const acceptedNoticeKeyRef = useRef<string | null>(null);
  const [markers, setMarkers] = useState<{ id: string; x: number; y: number; label?: string }[]>([]);
  const [visualIndicators, setVisualIndicators] = useState<VisualIndicator[]>([]);
  const indicatorExpiryRef = useRef<Map<string, number>>(new Map());
  const [enhancedGameState, setEnhancedGameState] = useState<EnhancedGameState | null>(null);
  const notify = useNotify();
  const lastMemoryToastRef = useRef<{ time: number; lastShownMB: number }>({ time: 0, lastShownMB: 0 });
  // building hover details disabled in stable mode
  const [gameMode, setGameMode] = useState<'casual' | 'advanced'>('casual');
  const [, setShowOnboarding] = useState(false);
  const [, setGuideProgress] = useState({ selectedTile: false, openedCouncil: false, generated: false, accepted: false, advanced: false });
  const [, setGuideHint] = useState<string | null>(null);
  const [isSimMode, setIsSimMode] = useState(false);
  const [simResources, setSimResources] = useState<SimResources | null>(null);
  const [placedBuildings, setPlacedBuildings] = useState<StoredBuilding[]>([]);
  const [routes, setRoutes] = useState<TradeRoute[]>([]);
  const [roads, setRoads] = useState<Array<{x:number;y:number}>>([]);

  useEffect(() => {
    const expiryMap = indicatorExpiryRef.current;
    const activeIds = new Set<string>();
    const timestamp = nowMs();

    for (const indicator of visualIndicators) {
      activeIds.add(indicator.id);
      const durationMs = indicatorDurationToMs(indicator.duration);
      if (durationMs <= 0) {
        expiryMap.delete(indicator.id);
        continue;
      }
      if (!expiryMap.has(indicator.id)) {
        expiryMap.set(indicator.id, timestamp + durationMs);
      }
    }

    for (const id of Array.from(expiryMap.keys())) {
      if (!activeIds.has(id)) {
        expiryMap.delete(id);
      }
    }
  }, [visualIndicators]);

  useEffect(() => {
    if (!visualIndicators.length) {
      indicatorExpiryRef.current.clear();
      return;
    }

    const interval = window.setInterval(() => {
      const expiryMap = indicatorExpiryRef.current;

      setVisualIndicators((current) => {
        if (current.length === 0) {
          return current;
        }

        const now = nowMs();
        let changed = false;
        const filtered = current.filter(indicator => {
          const expiresAt = expiryMap.get(indicator.id);
          if (expiresAt !== undefined && expiresAt <= now) {
            expiryMap.delete(indicator.id);
            changed = true;
            return false;
          }
          return true;
        });

        return changed ? filtered : current;
      });
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [visualIndicators.length]);

  // Initialize TimeSystem
  const timeSystemRef = useRef<TimeSystem | null>(null);
  if (!timeSystemRef.current) {
    timeSystemRef.current = new TimeSystem();
    timeSystemRef.current.start();
  }
  const timeSystem = timeSystemRef.current;

  const stateId = state?.id ?? null;

  const handlePauseSimulation = useCallback(() => {
    pauseSimulation({ stateId, setIsPaused, controller: timeSystem ?? undefined });
  }, [stateId, setIsPaused, timeSystem]);

  const handleResumeSimulation = useCallback(() => {
    resumeSimulation({ stateId, setIsPaused, controller: timeSystem ?? undefined });
  }, [stateId, setIsPaused, timeSystem]);

  // Handle TimeSystem cleanup
  useEffect(() => {
    return () => {
      if (timeSystemRef.current) {
        timeSystemRef.current.destroy();
      }
    };
  }, []);
  const [showRoads, setShowRoads] = useState(true);
  const [showCitizens, setShowCitizens] = useState(true);
  const [requireRoadConfirm, setRequireRoadConfirm] = useState(true);
  const [autoAssignWorkers, setAutoAssignWorkers] = useState<boolean>(true);
  const [pendingRoad, setPendingRoad] = useState<{ tiles: {x:number;y:number}[] } | null>(null);
  const [citizensCount, setCitizensCount] = useState<number>(8);
  const [citizensSeed, setCitizensSeed] = useState<number>(() => Math.floor(Math.random()*1e6));

  const [selectedTool, setSelectedTool] = useState<ManagementTool>('select');
  const [selectedZoneType, setSelectedZoneType] = useState<ZoneType>('residential');
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType>('police');
  // simplified: direct tile builds; no separate build selection UI here
  const [districts, _setDistricts] = useState<District[]>([]);
  const [leylines, setLeylines] = useState<Leyline[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(LEYLINE_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;

      const sanitized: Leyline[] = parsed
        .filter((value): value is Leyline => {
          if (!value || typeof value !== 'object') return false;
          const candidate = value as Record<string, unknown>;
          return (
            typeof candidate.id === 'string' &&
            typeof candidate.fromX === 'number' &&
            typeof candidate.fromY === 'number' &&
            typeof candidate.toX === 'number' &&
            typeof candidate.toY === 'number' &&
            typeof candidate.capacity === 'number' &&
            typeof candidate.currentFlow === 'number' &&
            typeof candidate.isActive === 'boolean'
          );
        })
        .map((value) => {
          const capacity = Math.max(0, value.capacity);
          return {
            ...value,
            capacity,
            currentFlow: Math.max(0, Math.min(value.currentFlow, capacity)),
          };
        });

      if (sanitized.length > 0) {
        setLeylines(sanitized);
      }
    } catch (err) {
      logger.warn('Failed to load stored leylines', err);
    }
  }, []);

  const [mapSizeModalOpen, setMapSizeModalOpen] = useState(true);
  const [pendingMapSize, setPendingMapSize] = useState<number>(32);

  // Chunk fetching for unknown tiles
  const fetchChunk = useCallback(async (chunkX: number, chunkY: number, chunkSize: number = 16) => {
    try {
      const response = await fetch(
        `/api/map/chunk?chunkX=${chunkX}&chunkY=${chunkY}&chunkSize=${chunkSize}&seed=${citizensSeed}&detail=minimal`
      );
      if (!response.ok) return null;
      const data = await response.json();
      const tiles = data?.tiles;
      if (!Array.isArray(tiles)) {
        return null;
      }
      return tiles as string[][];
    } catch (error) {
      logger.warn('Failed to fetch chunk:', error);
      return null;
    }
  }, [citizensSeed]);

  // Expand map with 'unknown' tiles when interacting near the edges
  const ensureCapacityAround = useCallback((x: number, y: number, margin: number = 2) => {
    setTileTypes((prev) => {
      const rows = prev.length;
      const cols = rows > 0 ? prev[0].length : 0;
      const needRows = Math.max(rows, y + 1 + margin);
      const needCols = Math.max(cols, x + 1 + margin);
      if (needRows === rows && needCols === cols) return prev;
      const next: string[][] = new Array(needRows);
      for (let r = 0; r < needRows; r++) {
        next[r] = new Array(needCols);
        for (let c = 0; c < needCols; c++) {
          const val = (r < rows && c < (prev[r]?.length ?? 0)) ? prev[r][c] : 'unknown';
          next[r][c] = val || 'unknown';
        }
      }
      return next;
    });
  }, []);

  // Replace unknown tiles with generated terrain
  const revealUnknownTiles = useCallback(async (centerX: number, centerY: number, radius: number = 8) => {
    const chunkSize = 16;
    const chunksToFetch = new Set<string>();
    
    // Determine which chunks need fetching
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = centerX + dx;
        const ty = centerY + dy;
        if (tx < 0 || ty < 0) continue;
        
        const chunkX = Math.floor(tx / chunkSize);
        const chunkY = Math.floor(ty / chunkSize);
        chunksToFetch.add(`${chunkX},${chunkY}`);
      }
    }

    // Fetch and apply chunks
    for (const chunkKey of chunksToFetch) {
      const [chunkX, chunkY] = chunkKey.split(',').map(Number);
      const chunkData = await fetchChunk(chunkX, chunkY, chunkSize);
      if (!chunkData) continue;

      setTileTypes(prev => {
        const next = prev.map(row => [...row]);
        const startX = chunkX * chunkSize;
        const startY = chunkY * chunkSize;
        
        for (let cy = 0; cy < chunkData.length; cy++) {
          for (let cx = 0; cx < chunkData[cy].length; cx++) {
            const worldX = startX + cx;
            const worldY = startY + cy;
            
            if (worldY >= 0 && worldY < next.length && worldX >= 0 && worldX < next[worldY].length) {
              if (next[worldY][worldX] === 'unknown') {
                next[worldY][worldX] = chunkData[cy][cx];
              }
            }
          }
        }
        
        return next;
      });
    }
  }, [fetchChunk]);

  const [routeDraftFrom, setRouteDraftFrom] = useState<string | null>(null);
  const [edicts, setEdicts] = useState<Record<string, number>>({ tariffs: 50, patrols: 0 });
  const [pendingEdictChanges, setPendingEdictChanges] = useState<Record<string, number>>({});

  // Milestone helpers
  const getMilestones = () => {
    if (typeof window === 'undefined') return {} as Record<string, boolean>;
    try { return JSON.parse(localStorage.getItem('ad_milestones_completed') || '{}'); } catch { return {}; }
  };
  const setMilestone = (k: string) => { try { const m = getMilestones(); m[k] = true; localStorage.setItem('ad_milestones_completed', JSON.stringify(m)); } catch {} };
  const hasMilestone = (k: string) => !!getMilestones()[k];
  const award = async (delta: Partial<Record<'coin'|'grain'|'mana'|'favor', number>>) => {
    const newRes = { ...state!.resources } as Record<string, number>;
    (Object.keys(delta) as Array<keyof typeof delta>).forEach(k => { newRes[k as string] = Math.max(0, (newRes[k as string] || 0) + (delta[k] || 0)); });
    setState(prev => prev ? { ...prev, resources: newRes } : prev);
    await saveState({ resources: newRes });
    const parts = Object.entries(delta).map(([k,v]) => `${k} +${v}`).join('  ')
      notify({ type: 'success', title: 'Milestone Reward', message: parts })
  };
  const checkMilestones = async () => {
    if (!state) return;
    // First farm
    if (!hasMilestone('m_farm') && placedBuildings.some(b => b.typeId === 'farm')) { setMilestone('m_farm'); await award({ coin: 10 }); }
    // First route
    if (!hasMilestone('m_route') && (routes?.length || 0) > 0) { setMilestone('m_route'); await award({ favor: 5 }); }
    // 5 workers assigned
    const assigned = placedBuildings.reduce((s,b)=>s+(b.workers||0),0);
    if (!hasMilestone('m_workers5') && assigned >= 5) { setMilestone('m_workers5'); await award({ grain: 20 }); }
    // Storehouse logistics
    const hasStore = placedBuildings.some(b => b.typeId === 'storehouse');
    const connectedToStore = hasStore && (routes || []).some(r => {
      const a = placedBuildings.find(b=>b.id===r.fromId); const b = placedBuildings.find(b=>b.id===r.toId);
      return a?.typeId=='storehouse' || b?.typeId=='storehouse';
    });
    if (!hasMilestone('m_storehouse') && hasStore && connectedToStore) { setMilestone('m_storehouse'); await award({ coin: 20 }); }
  };

  const [unlockedSkillIds, setUnlockedSkillIds] = useState<string[]>(() => {
    const skillsFromProps = Array.isArray(initialState?.skills)
      ? sanitizeSkillList(initialState?.skills)
      : null;

    if (skillsFromProps !== null) {
      return skillsFromProps;
    }

    if (typeof window === 'undefined') return [];

    return recordToSkillList(readSkillCache());
  });
  useEffect(() => {
    writeSkillCache(unlockedSkillIds);
  }, [unlockedSkillIds]);
  useEffect(() => {
    logger.debug('localStorage useEffect running, window defined:', typeof window !== 'undefined');
    if (typeof window === 'undefined') return;
    
    // Don't override if gridSize was already set from initialState.map_size
    if (initialState?.map_size) {
      logger.debug('Skipping localStorage override - initialState.map_size already set gridSize to:', gridSize);
      setPendingMapSize(gridSize || 24);
      setMapSizeModalOpen(false);
      return;
    }
    
    try {
      const saved = localStorage.getItem('ad_map_size');
      logger.debug('Saved map size from localStorage:', saved);
      if (saved) {
        // Limit map size to prevent performance issues - max 48 for stability
        const n = Math.max(8, Math.min(48, Number(saved) || 24));
        logger.debug('Setting gridSize from localStorage:', n);
        setGridSize(n);
        setPendingMapSize(n);
        setMapSizeModalOpen(false);
        logger.debug('localStorage: Set gridSize to', n, 'and closed modal');
      } else {
        // Set default map size if none exists
        logger.debug('No saved map size, setting default to 32');
        setGridSize(32);
        setPendingMapSize(32);
        setMapSizeModalOpen(false);
        localStorage.setItem('ad_map_size', '32');
        logger.debug('localStorage: Set default gridSize to 32 and closed modal');
      }
    } catch (err) {
      logger.error('Error loading map size from localStorage:', err);
      // Fallback to default
      setGridSize(32);
      setPendingMapSize(32);
      setMapSizeModalOpen(false);
      logger.debug('localStorage: Error fallback - set gridSize to 32 and closed modal');
    }
  }, [initialState?.map_size, gridSize]);

  // Load map data when gridSize changes - MUST be before conditional returns
  useEffect(() => {
    logger.debug('🔥 MAP USEEFFECT SETUP - gridSize:', gridSize);
    async function loadMap() {
      try {
        logger.debug('🗺️ USEEFFECT TRIGGERED - gridSize:', gridSize);
        
        if (gridSize == null) {
          logger.debug('❌ SKIPPED - gridSize is null');
          return;
        }
        
        const url = `/api/map?size=${gridSize}`;
        logger.debug('🌐 FETCHING:', url);
        
        const res = await fetch(url);
        logger.debug('📡 RESPONSE STATUS:', res.status, res.ok);
        
        if (!res.ok) throw new Error('Failed to load map');
        
        const data = await res.json();
        logger.debug('📦 DATA RECEIVED - map length:', data.map?.length);
        
        logger.debug('🎯 CALLING setTileTypes');
        setTileTypes(data.map);
        logger.debug('✅ setTileTypes CALLED');
        
      } catch (err) {
        logger.error('❌ MAP LOAD ERROR:', err);
      }
    }
    loadMap();
  }, [gridSize]);
  
  // Monitor tileTypes state changes - MUST be before conditional returns
  useEffect(() => {
    logger.debug('🔥 TILETYPES USEEFFECT SETUP');
    logger.debug('🔍 TILETYPES CHANGED - length:', tileTypes.length);
  }, [tileTypes]);
  
  // Listen for skill unlock events to deduct costs && persist
  useEffect(() => {
    const onUnlock = async (e: any) => {
      const n = e.detail as SkillNode;
      if (unlockedSkillIds.includes(n.id)) return;
      if (!ensureStateForSkillUnlock(state, n, notify)) {
        return;
      }
      const needed = { coin: n.cost.coin || 0, mana: n.cost.mana || 0, favor: n.cost.favor || 0 } as Record<string, number>;
      const have = { coin: state.resources.coin || 0, mana: state.resources.mana || 0, favor: state.resources.favor || 0 } as Record<string, number>;
      if (have.coin < needed.coin || have.mana < needed.mana || have.favor < needed.favor) return;
      const newResServer = { ...state.resources } as Record<string, number>;
      newResServer.coin = Math.max(0, newResServer.coin - needed.coin);
      newResServer.mana = Math.max(0, newResServer.mana - needed.mana);
      newResServer.favor = Math.max(0, newResServer.favor - needed.favor);
      const nextSkills = [...unlockedSkillIds, n.id];
      setState(prev => prev ? { ...prev, resources: newResServer, skills: nextSkills as any } : prev);
      await saveState({ resources: newResServer, buildings: placedBuildings, routes, workers: state.workers, skills: nextSkills } as any);
      setUnlockedSkillIds(nextSkills);
      notify({ type: 'success', title: 'Skill Unlocked', message: n.title })
    };
    window.addEventListener('ad_unlock_skill', onUnlock as any);
    return () => window.removeEventListener('ad_unlock_skill', onUnlock as any);
  }, [state, unlockedSkillIds]);
  const syncSkillsFromServer = useCallback((value: unknown) => {
    if (!Array.isArray(value)) return;

    const normalized = sanitizeSkillList(value);
    setUnlockedSkillIds(prev => (arraysEqual(prev, normalized) ? prev : normalized));
  }, [setUnlockedSkillIds]);

  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number; tileType?: string } | null>(null);
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number; tileType?: string } | null>(null);
  const [previewTypeId, setPreviewTypeId] = useState<BuildTypeId | null>(null);
  const [tooltipLocked, setTooltipLocked] = useState(false);
  const [clickEffectKey, setClickEffectKey] = useState<string | null>(null);
  const [selectedLeyline, setSelectedLeyline] = useState<Leyline | null>(null);
  const [isLeylineDrawing, setIsLeylineDrawing] = useState(false);
  const hasAutoOpenedCouncilRef = useRef(false);
  const [routeHoverToId, setRouteHoverToId] = useState<string | null>(null);
  const [assignLines, setAssignLines] = useState<AssignLine[]>([]);
  const [pathHints, setPathHints] = useState<PathHint[]>([]);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [ctxMenu, setCtxMenu] = useState<{ open: boolean; buildingId: string | null; x: number; y: number }>({ open: false, buildingId: null, x: 0, y: 0 });
  const [constructionEvents, setConstructionEvents] = useState<Array<{
    id: string;
    buildingId: string;
    position: { x: number; y: number };
    type: 'building' | 'upgrading' | 'demolishing';
    timestamp: number;
  }>>([]);

  // Cleanup old construction events
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setConstructionEvents(prev => prev.filter(event => now - event.timestamp < 10000)); // Keep for 10 seconds
    }, 5000);
    return () => clearInterval(cleanup);
  }, []);

  const saveState = useCallback(async (partial: { resources?: Record<string, number>; workers?: number; buildings?: StoredBuilding[]; routes?: TradeRoute[]; roads?: Array<{x:number;y:number}>; edicts?: Record<string, number>; map_size?: number; skills?: string[] }) => {
    if (!state) return;
    try {
      const body: { id: string; resources?: Record<string, number>; workers?: number; buildings?: StoredBuilding[]; routes?: TradeRoute[]; roads?: Array<{x:number;y:number}>; edicts?: Record<string, number>; map_size?: number; skills?: string[] } = { id: state.id };
      if (partial.resources) body.resources = partial.resources;
      if (typeof partial.workers === 'number') body.workers = partial.workers;
      if (partial.buildings) body.buildings = partial.buildings;
      if (partial.routes) body.routes = partial.routes;
      if (partial.roads) body.roads = partial.roads;
      if (partial.edicts) body.edicts = partial.edicts;
      if (typeof partial.map_size === 'number') body.map_size = partial.map_size;
      if (partial.skills !== undefined) body.skills = partial.skills;
      const res = await fetch('/api/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      logger.error('Failed to save state:', err);
    }
  }, [state]);

  // Listen for skill unlock events to deduct costs & persist the latest state slices
  const onUnlock = useCallback(async (e: any) => {
    const n = e.detail as SkillNode;
    if (unlockedSkillIds.includes(n.id)) return;
    if (!state) return;

    const needed = { coin: n.cost.coin || 0, mana: n.cost.mana || 0, favor: n.cost.favor || 0 } as Record<string, number>;
    const have = {
      coin: state.resources.coin || 0,
      mana: state.resources.mana || 0,
      favor: state.resources.favor || 0,
    } as Record<string, number>;
    if (have.coin < needed.coin || have.mana < needed.mana || have.favor < needed.favor) return;

    const newResServer = { ...state.resources } as Record<string, number>;
    newResServer.coin = Math.max(0, newResServer.coin - needed.coin);
    newResServer.mana = Math.max(0, newResServer.mana - needed.mana);
    newResServer.favor = Math.max(0, newResServer.favor - needed.favor);

    const nextSkills = [...unlockedSkillIds, n.id];
    setState(prev => prev ? { ...prev, resources: newResServer, skills: nextSkills as any } : prev);
    await saveState({ resources: newResServer, buildings: placedBuildings, routes, workers: state?.workers, skills: nextSkills } as any);
    setUnlockedSkillIds(nextSkills);
    notify({ type: 'success', title: 'Skill Unlocked', message: n.title });

    try {
      const prev = JSON.parse(localStorage.getItem('ad_skills_unlocked') || '{}');
      prev[n.id] = true;
      localStorage.setItem('ad_skills_unlocked', JSON.stringify(prev));
    } catch {}
  }, [state, unlockedSkillIds, placedBuildings, routes, saveState, notify]);

  useEffect(() => {
    window.addEventListener('ad_unlock_skill', onUnlock as any);
    return () => window.removeEventListener('ad_unlock_skill', onUnlock as any);
  }, [onUnlock]);

  const confirmMapSize = useCallback(async () => {
    // Limit map size to prevent performance issues - max 48 for stability
    const n = Math.max(8, Math.min(48, Number(pendingMapSize) || 24));
    setGridSize(n);
    try { localStorage.setItem('ad_map_size', String(n)); } catch {}
    // Save map size to game state for persistence
    if (state) {
      await saveState({ map_size: n } as any);
    }
    setMapSizeModalOpen(false);
  }, [pendingMapSize, state, saveState]);

  const updateLeylines = useCallback((updater: (prev: Leyline[]) => Leyline[]) => {
    setLeylines(prev => {
      const next = updater(prev);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LEYLINE_STORAGE_KEY, JSON.stringify(next));
        } catch (err) {
          logger.warn('Failed to persist leylines', err);
        }
      }
      return next;
    });
  }, []);

  const handleLeylineCreate = useCallback((fromX: number, fromY: number, toX: number, toY: number) => {
    const newLeyline: Leyline = {
      id: generateId(),
      fromX: Math.round(fromX),
      fromY: Math.round(fromY),
      toX: Math.round(toX),
      toY: Math.round(toY),
      capacity: 100,
      currentFlow: 0,
      isActive: true,
    };
    updateLeylines(prev => [...prev, newLeyline]);
    setSelectedLeyline(newLeyline);
  }, [generateId, updateLeylines]);

  const handleLeylineDelete = useCallback((id: string) => {
    updateLeylines(prev => prev.filter(leyline => leyline.id !== id));
    setSelectedLeyline(prev => (prev && prev.id === id ? null : prev));
  }, [updateLeylines]);

  const handleLeylineUpdate = useCallback((id: string, updates: Partial<Leyline>) => {
    let updated: Leyline | null = null;
    updateLeylines(prev => prev.map(leyline => {
      if (leyline.id !== id) return leyline;
      const nextCapacity = updates.capacity !== undefined ? Math.max(0, Math.round(updates.capacity)) : leyline.capacity;
      const rawFlow = updates.currentFlow !== undefined ? Math.max(0, Math.round(updates.currentFlow)) : leyline.currentFlow;
      const nextFlow = Math.min(rawFlow, nextCapacity);
      const next: Leyline = {
        ...leyline,
        ...updates,
        id: leyline.id,
        capacity: nextCapacity,
        currentFlow: nextFlow,
        isActive: updates.isActive !== undefined ? updates.isActive : leyline.isActive,
      };
      updated = next;
      return next;
    }));
    if (updated) {
      setSelectedLeyline(updated);
    }
  }, [updateLeylines]);

  useEffect(() => {
    if (!selectedLeyline) return;
    const latest = leylines.find(l => l.id === selectedLeyline.id);
    if (!latest) {
      setSelectedLeyline(null);
      return;
    }
    if (
      latest.capacity !== selectedLeyline.capacity ||
      latest.currentFlow !== selectedLeyline.currentFlow ||
      latest.isActive !== selectedLeyline.isActive ||
      latest.fromX !== selectedLeyline.fromX ||
      latest.fromY !== selectedLeyline.fromY ||
      latest.toX !== selectedLeyline.toX ||
      latest.toY !== selectedLeyline.toY
    ) {
      setSelectedLeyline(latest);
    }
  }, [leylines, selectedLeyline]);

  const computeRoadPath = useCallback((sx:number, sy:number, tx:number, ty:number): Array<{x:number;y:number}> => {
    // Lightweight Dijkstra with road preference
    const key = (x:number,y:number)=>`${x},${y}`;
    const roadSet = new Set((roads||[]).map(r=>`${r.x},${r.y}`));
    const inBounds = (x:number,y:number) => y>=0 && y<tileTypes.length && x>=0 && x<(tileTypes[y]?.length||0);
    const nbrs = (x:number,y:number) => {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      const res: Array<{x:number;y:number;cost:number}> = [];
      for (const [dx,dy] of dirs) {
        const nx=x+dx, ny=y+dy;
        if (!inBounds(nx,ny)) continue;
        const onRoad = roadSet.has(key(nx,ny));
        res.push({x:nx,y:ny,cost: onRoad ? 0.6 : 1.0});
      }
      return res;
    };
    const dist = new Map<string,number>();
    const prev = new Map<string,{x:number;y:number}>();
    const pq: Array<{x:number;y:number;d:number}> = [{x:sx,y:sy,d:0}];
    dist.set(key(sx,sy),0);
    while (pq.length) {
      pq.sort((a,b)=>a.d-b.d);
      const cur = pq.shift()!;
      if (cur.x===tx && cur.y===ty) break;
      for (const n of nbrs(cur.x, cur.y)) {
        const nd = cur.d + n.cost;
        const k = key(n.x,n.y);
        if (nd < (dist.get(k) ?? Infinity)) {
          dist.set(k, nd);
          prev.set(k, {x:cur.x,y:cur.y});
          pq.push({x:n.x,y:n.y,d:nd});
        }
      }
    }
    const out: Array<{x:number;y:number}> = [];
    let cx = tx, cy = ty; let k = key(cx,cy);
    if (!prev.has(k) && !(sx===tx&&sy===ty)) return out;
    out.push({x:cx,y:cy});
    while (prev.has(k)) { const p = prev.get(k)!; out.push({x:p.x,y:p.y}); cx=p.x; cy=p.y; k=key(cx,cy); if (cx===sx && cy===sy) break; }
    out.reverse();
    // Filter to only road tiles for the hint
    return out.filter(t => roadSet.has(key(t.x,t.y)));
  }, [JSON.stringify(roads), JSON.stringify(tileTypes)]);

  // HUD layout presets omitted for stability

  // cursor/tooltip state omitted for stability
  const edictDefs: EdictSetting[] = useMemo(() => ([
    {
      id: 'tariffs',
      name: 'Trade Tariffs',
      description: 'Adjust duties on caravans; higher revenue but unrest risk.',
      type: 'slider',
      category: 'economic',
      currentValue: edicts.tariffs ?? 50,
      defaultValue: 50,
      cost: 1,
      effects: [
        { resource: 'Coin', impact: '+/- route coin yield' },
        { resource: 'Unrest', impact: 'High tariffs can raise unrest' },
      ],
    },
    {
      id: 'patrols',
      name: 'Caravan Patrols',
      description: 'Deploy patrols to secure routes; reduces unrest but costs coin.',
      type: 'toggle',
      category: 'military',
      currentValue: edicts.patrols ?? 0,
      defaultValue: 0,
      cost: 1,
      effects: [
        { resource: 'Unrest', impact: '-1 unrest from route pressure' },
        { resource: 'Coin', impact: '-2 coin upkeep per cycle' },
      ],
    },
  ]), [edicts]);
  const totalEdictCost = useMemo(() => Object.keys(pendingEdictChanges).length * 1, [pendingEdictChanges]);
  const [upcomingEvents, _setUpcomingEvents] = useState<SeasonalEvent[]>([]);
  const [omenReadings, _setOmenReadings] = useState<OmenReading[]>([]);

  useEffect(() => {
    const onStartRoute = (e: any) => {
      const id = e?.detail?.buildingId as string | undefined;
      if (!id) return;
      setRouteDraftFrom(id);
      setIsSettingsOpen(false);
      setIsCouncilOpen(false);
      try { notify({ type: 'info', title: 'Route Draft', message: 'Select a target trade post to connect.' }); } catch {}
    };
    const onShowMenu = (e: any) => {
      const { buildingId, screenX, screenY } = e?.detail || {};
      if (!buildingId) return;
      setCtxMenu({ open: true, buildingId, x: screenX, y: screenY });
    };
    const onHoverBuilding = (e: any) => {
      const id = e?.detail?.buildingId as string | undefined;
      if (!routeDraftFrom) return;
      setRouteHoverToId(id || null);
    };
    const onTapBuilding = async (e: any) => {
      const toId = e?.detail?.buildingId as string | undefined;
      const fromId = routeDraftFrom;
      if (!fromId || !toId || fromId === toId) return;
      if (!simResources) return;
      const a = placedBuildings.find(b => b.id === fromId);
      const b = placedBuildings.find(b => b.id === toId);
      if (!a || !b) return;
      if (a.typeId !== 'trade_post' || b.typeId !== 'trade_post') {
        setRouteDraftFrom(null); setRouteHoverToId(null);
        try { notify({ type: 'warning', title: 'Invalid Route', message: 'Routes can only connect trade posts.' }); } catch {}
        return;
      }
      if ((routes || []).some(r => (r.fromId === a.id && r.toId === b.id) || (r.fromId === b.id && r.toId === a.id))) {
        setRouteDraftFrom(null); setRouteHoverToId(null);
        try { notify({ type: 'info', title: 'No Change', message: 'A route already exists between these posts.' }); } catch {}
        return;
      }
      const MAX_ROUTES_PER_NODE = 3;
      const aCount = (routes || []).filter(r => r.fromId === a.id || r.toId === a.id).length;
      const bCount = (routes || []).filter(r => r.fromId === b.id || r.toId === b.id).length;
      if (aCount >= MAX_ROUTES_PER_NODE || bCount >= MAX_ROUTES_PER_NODE) {
        setRouteDraftFrom(null); setRouteHoverToId(null);
        try { notify({ type: 'warning', title: 'Too Many Routes', message: 'A post cannot exceed 3 connections.' }); } catch {}
        return;
      }
      const length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      const MAX_ROUTE_LEN = 20;
      if (length > MAX_ROUTE_LEN) {
        setRouteDraftFrom(null); setRouteHoverToId(null);
        try { notify({ type: 'warning', title: 'Too Far', message: 'That route is longer than allowed.' }); } catch {}
        return;
      }
      const cost = 5 + 2 * length;
      if ((simResources.coin ?? 0) < cost) { try { notify({ type: 'error', title: 'Insufficient Coin', message: `Need ${cost} coin to build this route.` }); } catch {}; return; }
      const newResSim = { ...simResources, coin: simResources.coin - cost };
      const newResServer = { ...state!.resources, coin: (state!.resources.coin || 0) - cost } as any;
      const newRoute: TradeRoute = { id: `r-${generateId()}`, fromId, toId, length };
      const newRoutes = [newRoute, ...(routes || [])];
      setRoutes(newRoutes);
      setSimResources(newResSim);
      setState(prev => prev ? { ...prev, resources: newResServer, routes: newRoutes } as any : prev);
      await saveState({ resources: newResServer, routes: newRoutes });
      try { notify({ type: 'success', title: 'Route Built', message: `Connected ${SIM_BUILDINGS[a.typeId].name} ↔ ${SIM_BUILDINGS[b.typeId].name}` }); } catch {}
      setRouteDraftFrom(null);
      setRouteHoverToId(null);
    };
    window.addEventListener('ad_start_route', onStartRoute as any);
    window.addEventListener('ad_hover_building', onHoverBuilding as any);
    window.addEventListener('ad_building_tap', onTapBuilding as any);
    window.addEventListener('ad_show_building_menu', onShowMenu as any);
    return () => {
      window.removeEventListener('ad_start_route', onStartRoute as any);
      window.removeEventListener('ad_hover_building', onHoverBuilding as any);
      window.removeEventListener('ad_building_tap', onTapBuilding as any);
      window.removeEventListener('ad_show_building_menu', onShowMenu as any);
    };
  }, [routeDraftFrom, routes, simResources, placedBuildings, state, notify]);

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (e.key === 'Escape' && routeDraftFrom) {
        setRouteDraftFrom(null); setRouteHoverToId(null);
        try { notify({ type: 'info', title: 'Draft Cancelled', message: 'Route draft has been cancelled.' }); } catch {}
        return;
      }
      if ((e.key === 'm' || e.key === 'M') && selectedTile) {
        const b = placedBuildings.find(bb => bb.x === selectedTile.x && bb.y === selectedTile.y);
        if (b) {
          setCtxMenu({ open: true, buildingId: b.id, x: Math.round(window.innerWidth/2), y: Math.round(window.innerHeight/2) });
          return;
        }
      }
      if (!selectedTile) return;
      const b = placedBuildings.find(bb => bb.x === selectedTile.x && bb.y === selectedTile.y);
      if (!b) return;
      const cap = SIM_BUILDINGS[b.typeId].workCapacity ?? 0;
      const level = Math.max(1, Number(b.level ?? 1));
      const maxCap = Math.round(cap * (1 + 0.25 * (level - 1)));
      if (e.key === '+' || e.key === '=' ) {
        if ((simResources?.workers ?? 0) <= 0 || b.workers >= maxCap) return;
        const updated = placedBuildings.map(x => x.id === b.id ? { ...x, workers: x.workers + 1 } : x);
        setPlacedBuildings(updated);
        setSimResources(prev => prev ? { ...prev, workers: Math.max(0, prev.workers - 1) } : prev);
        await saveState({ buildings: updated });
        // visual line from closest house/storehouse
        try {
          const targets = placedBuildings.filter(x => x.typeId === 'house' || x.typeId === 'storehouse');
          let src = targets[0]; let best = Number.POSITIVE_INFINITY;
          for (const t of targets) { const d = Math.hypot((t.x - b.x), (t.y - b.y)); if (d < best) { best = d; src = t; } }
          if (src) {
            setAssignLines(prev => [{ id: `al-${Date.now()}`, from: { x: src!.x, y: src!.y }, to: { x: b.x, y: b.y }, createdAt: performance.now(), ttl: 800 }, ...prev].slice(0, 8));
            const tiles = computeRoadPath(src!.x, src!.y, b.x, b.y);
            if (tiles.length) {
              setPathHints(prev => [{ id: `ph-${Date.now()}`, tiles, createdAt: performance.now(), ttl: 1100 }, ...prev].slice(0, 6));
            } else {
              try { notify({ type: 'info', title: 'No Road Path', message: 'No roads connect; citizens will take the long way.' }); } catch {}
            }
            setPulses(prev => [{ id: `bp-${Date.now()}`, x: b.x, y: b.y, createdAt: performance.now(), ttl: 650 }, ...prev].slice(0, 10));
          }
        } catch {}
      } else if (e.key === '-' || e.key === '_') {
        if (b.workers <= 0) return;
        const updated = placedBuildings.map(x => x.id === b.id ? { ...x, workers: x.workers - 1 } : x);
        setPlacedBuildings(updated);
        setSimResources(prev => prev ? { ...prev, workers: prev.workers + 1 } : prev);
        await saveState({ buildings: updated });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedTile, placedBuildings, simResources]);

  useEffect(() => {
    try {
      const done = typeof window !== 'undefined' ? localStorage.getItem('ad_onboarding_done') : null;
      const mode = (typeof window !== 'undefined' ? localStorage.getItem('ad_game_mode') : null) as 'casual' | 'advanced' | null;
      const dismissed = typeof window !== 'undefined' ? localStorage.getItem('ad_dismissed_guide') === '1' : false;
      if (dismissed) setDismissedGuide(true);
      if (!done) {
        setShowOnboarding(true);
        setIsPaused(true);
      } else if (mode) {
        setGameMode(mode);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!state) return;
    const buildings = state.buildings || [];
    setPlacedBuildings(buildings);
    setRoutes(state.routes ?? []);
    // Load edicts if present
    const stateEdicts = (state as any).edicts as Record<string, number> | undefined;
    if (stateEdicts) setEdicts(prev => ({ ...prev, ...stateEdicts }));
    const assigned = buildings.reduce((sum, b) => sum + (b.workers || 0), 0);
    setSimResources({
      grain: state.resources.grain || 0,
      coin: state.resources.coin || 0,
      mana: state.resources.mana || 0,
      favor: state.resources.favor || 0,
      workers: (state.workers || 0) - assigned,
      wood: (state.resources as any).wood || 0,
      planks: (state.resources as any).planks || 0,
    });
  }, [state]);

  const stateWorkers = state?.workers ?? 0;
  const stateCycle = state?.cycle ?? 0;

  const autoAssignIdleWorkers = useCallback(() => {
    if (!simResources) return;
    let idle = simResources.workers || 0;
    if (idle <= 0) return;

    const updatedBuildings = [...placedBuildings];
    if (updatedBuildings.length === 0) return;

    let safety = 100;
    const scoreWeights: Record<string, number> = {
      grain: 3,
      wood: 2,
      planks: 2,
      coin: 1,
      favor: 0.4,
      mana: 0,
    };

    const routesArr = routes ?? [];
    const edictsApplied = edicts;
    const cycleMod = stateCycle % 4;
    const season = cycleMod === 0 ? 'spring' : cycleMod === 1 ? 'summer' : cycleMod === 2 ? 'autumn' : 'winter';

    const tariffs = Math.max(0, Math.min(100, Number(edictsApplied['tariffs'] ?? 50)));
    const coinBoost = 1 + ((tariffs - 50) / 100) * 0.6;
    if (season === 'winter') scoreWeights.grain += 1.2;
    if (season === 'autumn') scoreWeights.wood += 0.6;
    if (season === 'summer') scoreWeights.planks += 0.4;
    scoreWeights.coin *= coinBoost;

    const marginalScore = (idx: number): number => {
      const building = updatedBuildings[idx];
      const def = SIM_BUILDINGS[building.typeId];
      if (!def) return -Infinity;

      const capBase = def.workCapacity ?? 0;
      const level = Math.max(1, Number(building.level ?? 1));
      const levelCapScale = 1 + 0.25 * (level - 1);
      const cap = Math.round(capBase * levelCapScale);
      if (cap <= 0) return -Infinity;
      if ((building.workers || 0) >= cap) return -Infinity;

      const base = projectCycleDeltas(
        { ...simResources },
        updatedBuildings,
        routesArr,
        SIM_BUILDINGS,
        { totalWorkers: stateWorkers, edicts: edictsApplied }
      ).updated;

      const temp = [...updatedBuildings];
      temp[idx] = { ...temp[idx], workers: (temp[idx].workers || 0) + 1 } as StoredBuilding;

      const next = projectCycleDeltas(
        { ...simResources },
        temp,
        routesArr,
        SIM_BUILDINGS,
        { totalWorkers: stateWorkers, edicts: edictsApplied }
      ).updated;

      let score = 0;
      for (const [resource, weight] of Object.entries(scoreWeights)) {
        const delta = (next as any)[resource] - (base as any)[resource];
        score += (delta || 0) * (weight as number);
      }

      if ((simResources.grain || 0) < 50 && building.typeId === 'farm') score += 5;
      if ((simResources.wood || 0) < 30 && building.typeId === 'lumber_camp') score += 3;
      if ((simResources.planks || 0) < 20 && building.typeId === 'sawmill') score += 2;
      if (tariffs > 70 && building.typeId === 'trade_post') score += 1.5;

      return score;
    };

    while (idle > 0 && safety-- > 0) {
      let bestIdx = -1;
      let bestScore = 0;
      for (let i = 0; i < updatedBuildings.length; i++) {
        const score = marginalScore(i);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;

      updatedBuildings[bestIdx] = {
        ...updatedBuildings[bestIdx],
        workers: (updatedBuildings[bestIdx].workers || 0) + 1,
      } as StoredBuilding;
      idle -= 1;
    }

    if (idle !== (simResources.workers || 0)) {
      setPlacedBuildings(updatedBuildings);
      setSimResources(prev => (prev ? { ...prev, workers: idle } : prev));
      saveState({ buildings: updatedBuildings }).catch(() => {});
    }
  }, [simResources, placedBuildings, routes, edicts, stateCycle, stateWorkers, saveState]);

  // Greedy auto-assign idle workers to best buildings by marginal yield
  useEffect(() => {
    if (!autoAssignWorkers) return;
    autoAssignIdleWorkers();
  }, [autoAssignWorkers, autoAssignIdleWorkers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem('ad_onboarding_step', String(onboardingStep)); } catch {}
  }, [onboardingStep]);

  const fetchState = useCallback(async () => {
    logger.debug('Fetching state from /api/state');
    const res = await fetch("/api/state");
    logger.debug('Response status:', res.status, res.ok);
    const json = await res.json();
    logger.debug('Response JSON:', json);
    if (!res.ok) {
      const msg = json?.error || `Failed to fetch state (${res.status})`;
      if (config.nextPublicOfflineMode) {
        logger.warn('Offline mode enabled: using local fallback state:', msg);
        setState({
          id: 'local-fallback',
          cycle: 1,
          resources: { grain: 1000, coin: 500, mana: 200, favor: 10, unrest: 0, threat: 0 },
          workers: 0,
          buildings: [],
        });
        return;
      }
      throw new Error(msg);
    }
    const rawSkills = (json as any).skills;
    const sanitizedSkills = Array.isArray(rawSkills) ? sanitizeSkillList(rawSkills) : undefined;

    setState({
      ...json,
      workers: json.workers ?? 0,
      buildings: json.buildings ?? [],
      routes: (json as any).routes ?? [],
      roads: (json as any).roads ?? [],
      citizens_seed: (json as any).citizens_seed,
      citizens_count: (json as any).citizens_count,
      ...(sanitizedSkills !== undefined ? { skills: sanitizedSkills } : {}),
    });
    if (sanitizedSkills !== undefined) {
      syncSkillsFromServer(sanitizedSkills);
    }
    try { setIsPaused(!(json as any).auto_ticking); } catch {}
    try { setRoads(((json as any).roads as Array<{x:number;y:number}>) ?? []); } catch {}
    try { if ((json as any).citizens_count) setCitizensCount((json as any).citizens_count); } catch {}
    try { if ((json as any).citizens_seed) setCitizensSeed((json as any).citizens_seed); } catch {}
    // Load saved map size from game state with performance-focused validation
    try { 
      if ((json as any).map_size) {
        // Limit map size to prevent performance issues - max 48 for stability
        const savedSize = Math.max(8, Math.min(48, Number((json as any).map_size) || 24));
        setGridSize(savedSize);
        setPendingMapSize(savedSize);
        setMapSizeModalOpen(false);
      }
    } catch {}
  }, [syncSkillsFromServer]);

  const fetchProposals = useCallback(async () => {
    const res = await fetch("/api/proposals");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to fetch proposals");
    setProposals(json.proposals || []);
  }, []);
  
  // Fetch initial state if not provided
  useEffect(() => {
    if (!initialState && !state) {
      logger.debug('🔄 No initial state provided, fetching from API...');
      fetchState().catch((err) => {
        logger.error('❌ Failed to fetch initial state:', err);
        setError(err.message || 'Failed to load game state');
      });
    }
  }, [initialState, state, fetchState]);

  const tick = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/state/tick`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to tick");
      const serverState: GameState = { ...json.state, workers: json.state.workers ?? 0, buildings: json.state.buildings ?? [] };
      const tickSkills = Array.isArray((json.state as any)?.skills) ? sanitizeSkillList((json.state as any).skills) : undefined;
      if (tickSkills !== undefined) {
        serverState.skills = tickSkills;
        syncSkillsFromServer(tickSkills);
      }
      setState(serverState);
      const assigned = serverState.buildings.reduce((sum, b) => sum + (b.workers || 0), 0);
      const simRes: SimResources = {
        grain: serverState.resources.grain || 0,
        coin: serverState.resources.coin || 0,
        mana: serverState.resources.mana || 0,
        favor: serverState.resources.favor || 0,
        workers: (serverState.workers || 0) - assigned,
        wood: (serverState.resources as any).wood || 0,
        planks: (serverState.resources as any).planks || 0,
      };
      setSimResources(simRes);
      setPlacedBuildings(serverState.buildings);
      // Reset local countdown based on server interval if present
      const ms = Number((json.state as any)?.tick_interval_ms ?? 60000)
      setTimeRemaining(Math.max(1, Math.round(ms / 1000)));
      if (json.crisis) {
        setIsPaused(true);
        setCrisis(json.crisis);
      }
      await fetchProposals();
      
      // Update simulation systems
      try {
        const simulationInput = {
          buildings: serverState.buildings,
          resources: simRes,
          gameTime: timeSystem.getCurrentTime()
        };
        const enhancedState = simulationSystem.updateSimulation(simulationInput, 1.0);
        setEnhancedGameState(enhancedState);
        const indicators = simulationSystem.generateVisualIndicators(enhancedState);
        setVisualIndicators(indicators);
      } catch (simError) {
        logger.warn('Simulation system update failed:', simError);
      }
      
      // Flavor events disabled for stability
      return { simRes, state: serverState };
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchProposals, syncSkillsFromServer]);

  // Council actions
  const generate = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/proposals/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guild }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate proposals');
      await fetchProposals();
      notify({ type: 'success', title: 'Proposals Summoned', message: 'New counsel ideas await review.' })
      setDismissedGuide(true);
      setGuideProgress(prev => ({ ...prev, generated: true }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [guild, fetchProposals]);

  const scry = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/proposals/${id}/scry`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to scry');
      await fetchProposals();
      // Show a brief summary toast of scry (best-effort)
      const p = proposals.find(p => p.id === id);
      if (p?.predicted_delta) {
        const parts = Object.entries(p.predicted_delta).slice(0, 3).map(([k,v]) => `${k} ${v>=0?'+':''}${v}`).join('  ');
        notify({ type: 'info', title: 'Scry Result', message: parts || 'Forecast updated.' })
      } else {
        notify({ type: 'info', title: 'Scry Result', message: 'Forecast updated.' })
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [fetchProposals]);

  const decide = useCallback(async (id: string, decision: 'accept' | 'reject') => {
    try {
      setLoading(true);
      const selected = proposals.find(p => p.id === id) || null;
      setProposals(prev => prev.map(p => p.id === id ? { ...p, status: decision === 'accept' ? 'accepted' : 'rejected' } : p));
      const res = await fetch(`/api/proposals/${id}/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to decide');
      if (decision === 'accept' && selected) {
        setAcceptedNotice({ title: selected.title, delta: selected.predicted_delta || {} });
        notify({ type: 'success', title: 'Decree Accepted', message: selected.title });
        setDismissedGuide(true);
        setGuideProgress(prev => ({ ...prev, accepted: true }));
        if (selectedTile) {
          setMarkers(prev => [{ id: `m-${generateId()}`, x: selectedTile.x, y: selectedTile.y, label: 'Accepted' }, ...prev]);
        }
        setTimeout(() => setAcceptedNotice(null), 4000);
      } else if (decision === 'reject' && selected) {
        notify({ type: 'warning', title: 'Proposal Rejected', message: selected.title });
      }
      await fetchProposals();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [proposals, selectedTile, fetchProposals, generateId]);

  useEffect(() => {
    (async () => {
      try {
        if (!state) await fetchState();
        await fetchProposals();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error('Failed to connect to database:', message);
        setError(message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time heartbeat: drive countdown and server ticks
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const updateCountdown = () => {
      if (!state) return;
      const lastStr = (state as any).last_tick_at as string | undefined;
      const ms = Number((state as any).tick_interval_ms ?? 60000);
      const last = lastStr ? Date.parse(lastStr) : Date.now();
      const diff = (last + ms) - Date.now();
      const secs = Math.max(0, Math.ceil(diff / 1000));
      setTimeRemaining(secs);
    };
    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
    return () => { if (interval) clearInterval(interval); };
  }, [state]);

  useEffect(() => {
    let hb: NodeJS.Timeout | null = null;
    const ping = async () => {
      try {
        if (!isPaused) {
          await fetch('/api/state/heartbeat', { method: 'POST' });
        }
      } catch {}
    };
    // Kick once immediately to avoid drift, then every second
    ping();
    hb = setInterval(ping, 1000);
    return () => { if (hb) clearInterval(hb); };
  }, [isPaused]);

  useEffect(() => {
    if (config.nextPublicDisableRealtime || config.nodeEnv === 'development') {
      logger.debug('Realtime disabled by environment flag');
      return;
    }
    let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    try {
      client = createSupabaseBrowserClient(config);
    } catch (e: unknown) {
      logger.debug('Realtime disabled:', e instanceof Error ? e.message : String(e));
      return;
    }

    const channel = client
      .channel('game_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, (payload: { new?: unknown }) => {
        const next = payload?.new as GameState | undefined;
        if (next && typeof next === 'object') {
          const realtimeSkills = Array.isArray((next as any).skills) ? sanitizeSkillList((next as any).skills) : undefined;
          const patchedNext = realtimeSkills !== undefined ? { ...next, skills: realtimeSkills } : next;
          setState(patchedNext as GameState);
          if (realtimeSkills !== undefined) {
            syncSkillsFromServer(realtimeSkills);
          }
          try { setIsPaused(!(next as any).auto_ticking); } catch {}
          const assigned = (next.buildings || []).reduce((sum, b) => sum + (b.workers || 0), 0);
          setPlacedBuildings(next.buildings || []);
          setSimResources({
            grain: next.resources.grain || 0,
            coin: next.resources.coin || 0,
            mana: next.resources.mana || 0,
            favor: next.resources.favor || 0,
            wood: next.resources.wood || 0,
            planks: next.resources.planks || 0,
            workers: (next.workers || 0) - assigned,
          });
          try { setRoads(((next as any).roads as Array<{x:number;y:number}>) ?? []); } catch {}
          try { if ((next as any).citizens_count) setCitizensCount((next as any).citizens_count as any); } catch {}
          try { if ((next as any).citizens_seed) setCitizensSeed((next as any).citizens_seed as any); } catch {}
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => {
        fetchProposals();
      })
      .subscribe();

    return () => { if (client && channel) client.removeChannel(channel); };
  }, [fetchState, fetchProposals, syncSkillsFromServer]);

  useEffect(() => {
    if (acceptedNotice) {
      if (!acceptedNoticeKeyRef.current) {
        const makeId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
        acceptedNoticeKeyRef.current = `accept-${makeId()}`;
      }
    } else {
      acceptedNoticeKeyRef.current = null;
    }
  }, [acceptedNotice]);

  // The remaining UI is identical to the original PlayPage component.
  // For brevity, we import && reuse the JSX from the existing file to avoid duplication.
  // We will render a minimal shell here && rely on the original file content compiled in this component.

  // To keep the patch concise, we delegate the JSX rendering to the existing file via a dynamic import
  // pattern would be overkill here. Instead, we mirror the original conditional gates:

  const resources: GameResources = {
    grain: state?.resources?.grain ?? 0,
    coin: state?.resources?.coin ?? 0,
    mana: state?.resources?.mana ?? 0,
    favor: state?.resources?.favor ?? 0,
    wood: simResources?.wood ?? 0,
    planks: simResources?.planks ?? 0,
    unrest: state?.resources?.unrest ?? 0,
    threat: state?.resources?.threat ?? 0,
  };

  const skillTreeSeed = typeof state?.skill_tree_seed === 'number' ? state.skill_tree_seed : 12345;

  const currentTime = timeSystem.getCurrentTime();
  const gameTime: GameTime = {
    cycle: Math.floor(currentTime.totalMinutes / 60), // Convert to legacy cycle for HUD compatibility
    season: 'spring', // TODO: Implement seasons based on currentTime.month
    timeRemaining,
  };
  const totalAssigned = placedBuildings.reduce((sum, b) => sum + b.workers, 0);
  const totalWorkers = totalAssigned + (simResources?.workers ?? 0);
  const idleWorkers = simResources?.workers ?? 0;
  const neededWorkers = placedBuildings.reduce((sum, b) => {
    const cap = SIM_BUILDINGS[b.typeId].workCapacity ?? 0;
    return sum + Math.max(0, cap - b.workers);
  }, 0);

  const guildToCategoryType = (guild: string): CategoryType => {
    const normalized = guild.toLowerCase();
    switch (normalized) {
      case 'wardens': return 'military';
      case 'merchants': return 'economic';
      case 'scholars': return 'mystical';
      case 'artisans': return 'infrastructure';
      case 'diplomats': return 'diplomatic';
      default: return 'social';
    }
  };

  const councilProposals: CouncilProposal[] = proposals.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    type: guildToCategoryType(p.guild),
    cost: p.predicted_delta,
    benefit: p.predicted_delta,
    risk: 25,
    duration: 1,
    canScry: true,
    status: p.status
  }));

  const resourceChanges = useMemo(() => {
    if (!simResources) {
      return { grain: 0, wood: 0, planks: 0, coin: 0, mana: 0, favor: 0, unrest: 0, threat: 0 } as any;
    }
    const tree = generateSkillTree(skillTreeSeed);
    const unlocked = tree.nodes.filter(n => unlockedSkillIds.includes(n.id));
    const acc = accumulateEffects(unlocked);
    const { updated } = projectCycleDeltas(simResources, placedBuildings, routes, SIM_BUILDINGS, {
      totalWorkers: totalWorkers,
      edicts,
      modifiers: {
        resourceOutputMultiplier: acc.resMul as any,
        buildingOutputMultiplier: acc.bldMul,
        upkeepGrainPerWorkerDelta: acc.upkeepDelta,
        globalBuildingOutputMultiplier: acc.globalBuildingMultiplier,
        globalResourceOutputMultiplier: acc.globalResourceMultiplier,
        routeCoinOutputMultiplier: acc.routeCoinMultiplier,
        patrolCoinUpkeepMultiplier: acc.patrolCoinUpkeepMultiplier,
        buildingInputMultiplier: acc.buildingInputMultiplier,
      }
    });
    return {
      grain: updated.grain - simResources.grain,
      wood: updated.wood - simResources.wood,
      planks: updated.planks - simResources.planks,
      coin: updated.coin - simResources.coin,
      mana: updated.mana - simResources.mana,
      favor: updated.favor - simResources.favor,
      unrest: 0,
      threat: 0,
    } as any;
  }, [simResources, placedBuildings, routes, totalWorkers, edicts, unlockedSkillIds, skillTreeSeed]);

  // Shared PIXI context for Game + HUD (so HUD panels can access viewport)
  const [pixiApp, setPixiApp] = useState<PIXI.Application | null>(null);
  const [pixiViewport, setPixiViewport] = useState<Viewport | null>(null);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-lg text-center">
          <h2 className="text-xl font-semibold text-red-800">Error</h2>
          <p className="mt-2 text-red-700">{error}</p>
          <button className="mt-4 px-4 py-2 bg-red-700 text-white rounded" onClick={() => { setError(null); fetchState().catch(() => {}); }}>Retry</button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Initializing game state...</p>
        </div>
      </div>
    );
  }

  const applyRoads = (tiles: Array<{x:number;y:number}>) => {
    setRoads(prev => {
      const seen = new Set(prev.map(t=>`${t.x},${t.y}`));
      const cost = { coin: 1, planks: 1 } as Record<string, number>;
      const resources = { ...(state?.resources || {}) } as Record<string, number>;
      const affordable: Array<{x:number;y:number}> = [];
      const tryPay = () => {
        for (const [k,v] of Object.entries(cost)) {
          const have = Number(resources[k] || 0);
          if (have < v) return false;
        }
        for (const [k,v] of Object.entries(cost)) resources[k] = Math.max(0, Number(resources[k]||0) - v);
        return true;
      };
      for (const t of tiles) {
        const k = `${t.x},${t.y}`;
        if (seen.has(k)) continue;
        if (tryPay()) { affordable.push(t); seen.add(k); }
        else break;
      }
      const merged = [...prev, ...affordable];
      saveState({ resources, roads: merged }).catch(()=>{});
      setState(prev => prev ? { ...prev, resources } as any : prev);
      return merged;
    });
  };

  // Minimal inline scene to ensure we render beyond the spinner for validation
  return (
    <div className="h-dvh w-full bg-gray-900 overflow-hidden relative">
      <div className="relative flex flex-col min-w-0 h-full">
        <GoalBanner />
        <div className="flex-1 relative min-h-0">
        {mapSizeModalOpen && (
          <div className="absolute inset-0 z-[20000] bg-black/60 flex items-center justify-center">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl w-[min(92vw,28rem)]">
              <h2 className="text-lg font-semibold text-gray-100">Choose starting map size</h2>
              <p className="text-sm text-gray-400 mt-1">You can expand infinitely by exploring. Pick an initial size (larger maps may cause performance issues):</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[16,24,32,48].map(sz => (
                  <button key={sz} onClick={() => setPendingMapSize(sz)} className={`px-3 py-2 rounded border text-sm ${pendingMapSize===sz ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-750'} ${sz > 32 ? 'border-yellow-600 text-yellow-200' : ''}`}>{sz}×{sz}{sz > 32 ? ' ⚠️' : ''}</button>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-xs text-gray-400 mb-1">Custom size (8 - 48, larger sizes may cause freezing)</label>
                <input type="number" min={8} max={48} value={pendingMapSize} onChange={e=>setPendingMapSize(Number(e.target.value)||24)} className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="text-xs text-gray-500">Infinite expansion is enabled during play.</div>
                <button onClick={confirmMapSize} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500">Start</button>
              </div>
            </div>
          </div>
        )}
        <GameProvider app={pixiApp} viewport={pixiViewport} setApp={setPixiApp} setViewport={setPixiViewport}>
          <MemoryManager 
            maxMemoryMB={300}
            maxTextures={150}
            cleanupInterval={15000}
            warnAtPercent={90}
            warningCooldownMs={90000}
            onMemoryWarning={(stats) => {
              const now = Date.now();
              const last = lastMemoryToastRef.current;
              const deltaMb = Math.abs(stats.memoryUsage - last.lastShownMB);
              const cooldownPassed = now - last.time > 60000; // 60s UI cooldown for toasts
              const significantChange = deltaMb >= 32; // Only toast if >=32MB change
              if (cooldownPassed || significantChange) {
                logger.warn('Memory usage high:', stats);
                const percent = typeof stats.percentUsed === 'number' ? `${stats.percentUsed.toFixed(1)}%` : 'n/a';
                notify({ type: 'warning', title: 'Memory Warning', message: `Memory usage: ${stats.memoryUsage.toFixed(1)}MB (${percent})`, dedupeKey: 'memory-warning', dedupeMs: 60000 });
                lastMemoryToastRef.current = { time: now, lastShownMB: stats.memoryUsage };
              }
            }}
            onMemoryCleanup={(freedMB) => {
              logger.info(`Memory cleanup freed ${freedMB.toFixed(1)}MB`);
            }}
          />
          <ViewportManager
            initialZoom={1.5}
            minZoom={0.2}
            maxZoom={4.0}
            worldWidth={20000}
            worldHeight={20000}
          >
            <IsometricGrid
               gridSize={gridSize || 24}
               tileTypes={tileTypes}
               tileWidth={ISO_TILE_WIDTH}
               tileHeight={ISO_TILE_HEIGHT}
              onTileHover={(x,y,t)=>{ 
                ensureCapacityAround(x,y,2); 
                const tileType = t || 'grass';
                setHoverTile({x,y,tileType});
              }}
              onTileClick={(x,y,t)=>{
                ensureCapacityAround(x,y,2);
                const tileType = t || 'grass';
                setSelectedTile({x,y,tileType});
                setTooltipLocked(true);
                setClickEffectKey(`click-${Date.now()}-${x}-${y}`);
                try {
                  window.dispatchEvent(
                    new CustomEvent('ad_select_tile', {
                      detail: {
                        gridX: x,
                        gridY: y,
                        tileWidth: ISO_TILE_WIDTH,
                        tileHeight: ISO_TILE_HEIGHT,
                      },
                    }),
                  );
                } catch {}
              }}
            />
          </ViewportManager>
          <GameRenderer
            useExternalProvider
            enableEdgeScroll={edgeScrollEnabled}
            gridSize={(() => {
              logger.debug('🎮 GameRenderer gridSize prop:', { 
                gridSize, 
                fallback: gridSize || 0, 
                tileTypesLength: tileTypes.length,
                tileTypesFirstRow: tileTypes[0]?.length || 0,
                hasTileData: tileTypes.length > 0 && tileTypes[0]?.length > 0
              });
              return gridSize || 0;
            })()}
            tileTypes={tileTypes}
            onReset={() => {
              // Reset game state for development
              if (confirm('Reset all game progress? This cannot be undone.')) {
                setPlacedBuildings([]);
                setRoutes([]);
                setRoads([]);
                setConstructionEvents([]);
                setSelectedTile(null);
                setPreviewTypeId(null);
                setRouteDraftFrom(null);
                setRouteHoverToId(null);
                setCtxMenu({ open: false, buildingId: null, x: 0, y: 0 });
                setSimResources({
                  grain: 100,
                  coin: 50,
                  mana: 25,
                  favor: 10,
                  workers: 5,
                  wood: 0,
                  planks: 0
                });
                // Reset time system
                 if (timeSystemRef.current) {
                   timeSystemRef.current.setTime({
                     year: 2024,
                     month: 1,
                     day: 1,
                     hour: 8,
                     minute: 0,
                     totalMinutes: 0
                   });
                 }
                // Save reset state
                saveState({
                  resources: { grain: 100, coin: 50, mana: 25, favor: 10, wood: 0, planks: 0, unrest: 0, threat: 0 },
                  workers: 5,
                  buildings: [],
                  routes: [],
                  roads: []
                });
              }
            }}
      >
            <GameLayers
              tileTypes={tileTypes}
              hoverTile={hoverTile}
              selectedTile={selectedTile}
              placedBuildings={placedBuildings}
              previewTypeId={previewTypeId}
              tutorialFree={tutorialFree}
              simResources={simResources}
              routes={routes}
              routeDraftFrom={routeDraftFrom}
              routeHoverToId={routeHoverToId}
              assignLines={assignLines}
              pathHints={pathHints}
              pulses={pulses}
              showRoads={showRoads}
              roads={roads}
              showCitizens={showCitizens}
              citizensCount={citizensCount}
              acceptedNotice={acceptedNotice}
              acceptedNoticeKey={acceptedNoticeKeyRef.current}
              clickEffectKey={clickEffectKey}
              markers={markers}
              visualIndicators={visualIndicators}
              districts={districts}
              leylines={leylines}
              selectedLeyline={selectedLeyline}
              setSelectedLeyline={setSelectedLeyline}
              isLeylineDrawing={isLeylineDrawing}
              onLeylineCreate={handleLeylineCreate}
              onLeylineRemove={handleLeylineDelete}
              resources={resources}
              cycle={state.cycle ?? 0}
              constructionEvents={constructionEvents}
            />
      </GameRenderer>

      {/* Route draft chip */}
      {routeDraftFrom && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[9999]">
          {(() => {
            const from = placedBuildings.find(b => b.id === routeDraftFrom);
            const msg = from?.typeId === 'storehouse'
              ? 'Draft: only trade posts can finalize (Esc to cancel)'
              : 'Draft: select target trade post (Esc to cancel)';
            return (
              <div className="px-3 py-1.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/60 text-xs shadow-sm">{msg}</div>
            );
          })()}
        </div>
      )}

      {selectedLeyline && (
        <div className="fixed right-6 top-24 z-[12000] w-72 max-w-full pointer-events-auto">
          <div className="rounded-lg border border-blue-700/60 bg-slate-900/95 p-4 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-blue-200">Leyline Inspector</h3>
                <p className="mt-1 text-xs text-gray-400">
                  {`(${selectedLeyline.fromX}, ${selectedLeyline.fromY}) → (${selectedLeyline.toX}, ${selectedLeyline.toY})`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeyline(null)}
                className="rounded-full p-1 text-gray-400 hover:text-gray-200 hover:bg-slate-800"
                aria-label="Close leyline inspector"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 space-y-3 text-xs text-gray-200">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-gray-400">Capacity</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={selectedLeyline.capacity}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    const sanitized = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
                    const adjustedFlow = Math.min(selectedLeyline.currentFlow, sanitized);
                    handleLeylineUpdate(selectedLeyline.id, { capacity: sanitized, currentFlow: adjustedFlow });
                  }}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-gray-400">Current Flow</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={selectedLeyline.currentFlow}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    const sanitized = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
                    handleLeylineUpdate(selectedLeyline.id, { currentFlow: Math.min(sanitized, selectedLeyline.capacity) });
                  }}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  {selectedLeyline.capacity === 0
                    ? 'No capacity assigned yet.'
                    : `${Math.round((selectedLeyline.currentFlow / Math.max(1, selectedLeyline.capacity)) * 100)}% utilized`}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-gray-400">Status:</span>
                <span className={`font-medium ${selectedLeyline.isActive ? 'text-emerald-300' : 'text-gray-400'}`}>
                  {selectedLeyline.isActive ? 'Active' : 'Dormant'}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleLeylineUpdate(selectedLeyline.id, { isActive: !selectedLeyline.isActive })}
                  className={`flex-1 rounded px-2 py-1 text-sm font-medium transition-colors ${selectedLeyline.isActive ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-700 text-gray-100 hover:bg-slate-600'}`}
                >
                  {selectedLeyline.isActive ? 'Pause Flow' : 'Resume Flow'}
                </button>
                <button
                  type="button"
                  onClick={() => handleLeylineDelete(selectedLeyline.id)}
                  className="rounded px-2 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {ctxMenu?.open && ctxMenu.buildingId && (
        <div className="fixed inset-0 z-[10000]" onClick={() => setCtxMenu({ open: false, buildingId: null, x: 0, y: 0 })}>
          <div
            className="absolute bg-gray-800 border border-gray-700 shadow-lg rounded-md text-sm min-w-[180px] text-gray-200"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onClick={(e)=> e.stopPropagation()}
          >
            {(() => {
              const b = placedBuildings.find(bb => bb.id === ctxMenu.buildingId);
              if (!b) return <div className="px-3 py-2 text-gray-400">No building</div>;
              const cap = SIM_BUILDINGS[b.typeId].workCapacity ?? 0;
              const level = Math.max(1, Number(b.level ?? 1));
              const maxCap = Math.round(cap * (1 + 0.25 * (level - 1)));
              return (
                <div className="py-1">
                  <button className="w-full text-left px-3 py-1.5 hover:bg-gray-700 disabled:opacity-50" disabled={(simResources?.workers ?? 0) <= 0 || b.workers >= maxCap}
                    onClick={async ()=>{
                      const idx = placedBuildings.findIndex(x=>x.id===b.id);
                      if (idx===-1) return;
                      const up = [...placedBuildings];
                      up[idx] = { ...b, workers: b.workers + 1 };
                      setPlacedBuildings(up);
                      setSimResources(prev => prev ? { ...prev, workers: Math.max(0, prev.workers - 1) } : prev);
                      await saveState({ buildings: up });
                      setCtxMenu({ open: false, buildingId: null, x: 0, y: 0 });
                    }}>Assign +1</button>
                  <button className="w-full text-left px-3 py-1.5 hover:bg-gray-700 disabled:opacity-50" disabled={b.workers<=0}
                    onClick={async ()=>{
                      const idx = placedBuildings.findIndex(x=>x.id===b.id);
                      if (idx===-1) return;
                      const up = [...placedBuildings];
                      up[idx] = { ...b, workers: b.workers - 1 };
                      setPlacedBuildings(up);
                      setSimResources(prev => prev ? { ...prev, workers: prev.workers + 1 } : prev);
                      await saveState({ buildings: up });
                      setCtxMenu({ open: false, buildingId: null, x: 0, y: 0 });
                    }}>Unassign -1</button>
                  <div className="h-px bg-gray-700 my-1" />
                  {(() => {
                    const def = SIM_BUILDINGS[b.typeId];
                    const maxL = def.maxLevel ?? 3;
                    const atMax = b.level >= maxL;
                    const factor = 1 + 0.5 * b.level; const scaled: Partial<SimResources> = {};
                    for (const [k,v] of Object.entries(def.cost)) { (scaled as any)[k] = Math.round((v ?? 0) * factor); }
                    const can = canAfford(scaled, simResources!);
                    const costStr = Object.entries(scaled).filter(([,v]) => (v as number) > 0).map(([k,v]) => `${k} ${v}`).join(', ');
                    return (
                      <button className="w-full text-left px-3 py-1.5 hover:bg-gray-700 disabled:opacity-50" disabled={atMax || !can}
                        title={atMax ? 'Max level reached' : (!can ? `Need: ${costStr}` : `Cost: ${costStr}`)}
                        onClick={async ()=>{
                      const def = SIM_BUILDINGS[b.typeId]; const maxL = def.maxLevel ?? 3; if (b.level >= maxL) return;
                      const factor = 1 + 0.5 * b.level; const scaled: Partial<SimResources> = {};
                      for (const [k,v] of Object.entries(def.cost)) { (scaled as any)[k] = Math.round((v ?? 0) * factor); }
                      if (!canAfford(scaled, simResources!)) return;
                      const newResSim = applyCost(simResources!, scaled);
                      const newResServer = { ...state!.resources } as Record<string, number>;
                      for (const [k, v] of Object.entries(scaled)) { const key = k as keyof typeof newResServer; newResServer[key] = Math.max(0, (newResServer[key] || 0) - (v || 0)); }
                      const up = placedBuildings.map(x=> x.id===b.id ? { ...x, level: x.level + 1 } : x);
                      setPlacedBuildings(up); setSimResources(newResSim); setState(prev => prev ? { ...prev, resources: newResServer, buildings: up } : prev);
                      await saveState({ resources: newResServer, buildings: up });
                      setCtxMenu({ open: false, buildingId: null, x: 0, y: 0 });
                        }}>Upgrade</button>
                    );
                  })()}
                  <button className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-rose-400"
                    onClick={async ()=>{
                      if (!confirm('Dismantle this building?')) return;
                      const idx = placedBuildings.findIndex(x=>x.id===b.id); if (idx===-1) return;
                      const def = SIM_BUILDINGS[b.typeId]; const factor = 1 + 0.5 * (b.level - 1); const refund: Partial<SimResources> = {};
                      for (const [k,v] of Object.entries(def.cost)) { (refund as any)[k] = Math.round(((v ?? 0) * factor) * 0.5); }
                      const newResSim = simResources ? { ...simResources } : null; const newResServer = { ...state!.resources } as Record<string, number>;
                      for (const [k,v] of Object.entries(refund)) { if (newResSim) (newResSim as any)[k] = ((newResSim as any)[k] || 0) + (v || 0); const key = k as keyof typeof newResServer; newResServer[key] = (newResServer[key] || 0) + (v || 0); }
                      const keptRoutes = (routes || []).filter(r => r.fromId !== b.id && r.toId !== b.id);
                      const up = placedBuildings.filter(x=>x.id!==b.id);
                      setPlacedBuildings(up); if (newResSim) setSimResources(newResSim); setRoutes(keptRoutes);
                      setState(prev => prev ? { ...prev, resources: newResServer, buildings: up, routes: keptRoutes } : prev);
                      await saveState({ resources: newResServer, buildings: up, routes: keptRoutes });
                      setCtxMenu({ open: false, buildingId: null, x: 0, y: 0 });
                    }}>Dismantle</button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

          {/* Subtle build legend when a building type is selected */}
          {previewTypeId && (
            <div className="absolute left-4 bottom-40 pointer-events-none select-none">
              <div className="inline-flex items-center gap-2 bg-gray-800/85 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-200 shadow-sm">
                <span className="inline-block w-3 h-3 rounded-sm border border-emerald-600" style={{ backgroundColor: 'rgba(16,185,129,0.25)' }} />
                Placeable tiles
              </div>
            </div>
          )}

          {/* Minimal surface UI; world toggles moved to Settings to reduce clutter */}

          {/* Road confirmation modal */}
          {pendingRoad && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999]">
              <div className="bg-gray-800 rounded shadow-lg border border-gray-700 p-4 w-[380px] text-gray-200">
                <div className="font-semibold mb-2 text-gray-100">Approve Road Construction</div>
                {(() => {
                  const tiles = pendingRoad.tiles;
                  const unique = Array.from(new Set(tiles.map(t=>`${t.x},${t.y}`))).length;
                  const costCoin = unique * 1;
                  const costPlanks = unique * 1;
                  const haveCoin = state?.resources.coin ?? 0;
                  const havePlanks = (state?.resources as any).planks ?? 0;
                  return (
                    <div className="text-sm text-gray-300">
                      <div className="mb-1">Tiles: {unique}</div>
                      <div className="mb-3">Cost: coin {costCoin}, planks {costPlanks}</div>
                      <div className={haveCoin>=costCoin && havePlanks>=costPlanks ? 'text-emerald-400' : 'text-rose-400'}>
                        {haveCoin>=costCoin && havePlanks>=costPlanks ? 'Affordable' : 'Insufficient resources' }
                      </div>
                    </div>
                  );
                })()}
                <div className="mt-4 flex justify-end gap-2">
                  <button className="px-3 py-1.5 rounded border border-gray-600 text-gray-200 hover:bg-gray-700" onClick={()=>setPendingRoad(null)}>Cancel</button>
                  <button className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white" onClick={()=>{ applyRoads(pendingRoad.tiles); setPendingRoad(null); }}>Build</button>
                </div>
              </div>
            </div>
          )}

          {/* DOM tooltip overlay, lockable on tile click */}
          <TileTooltip
            hoverTile={hoverTile}
            selectedTile={selectedTile}
            previewTypeId={previewTypeId}
            tileTypes={tileTypes}
            buildings={placedBuildings}
            locked={tooltipLocked}
            onUnlock={() => setTooltipLocked(false)}
          />

          {/* Register modular panels in the right sidebar */}
          {/* Modular HUD panels are rendered as children of IntegratedHUDSystem */}

          {/* Onboarding overlay */}
          {onboardingOpen && (
            <OnboardingGuide
              step={onboardingStep}
              onClose={() => { setOnboardingOpen(false); try { localStorage.setItem('ad_onboarding_dismissed','1'); } catch {} }}
            />
          )}

          {/* Integrated HUD now shares the same GameProvider */}
          <IntegratedHUDSystem
            defaultPreset="default"
            gameData={{
              resources,
              resourceChanges,
              workforce: { total: totalWorkers, idle: idleWorkers, needed: neededWorkers },
              time: { ...gameTime, isPaused, intervalMs: Number((state as any)?.tick_interval_ms ?? 60000) }
            }}
            map={miniMapDescriptor}
            isLeylineDrawing={isLeylineDrawing}
            cityManagement={{
              stats: {
                population: placedBuildings.reduce((sum, b) => sum + (b.workers || 0), 0),
                happiness: Math.max(0, 100 - (resources.unrest || 0)),
                traffic: 45,
                pollution: 30,
                crime: 15,
                education: 75,
                healthcare: 80,
                employment: 85,
                budget: resources.grain || 0,
                income: 500,
                expenses: 350
              } as CityStats,
              selectedTool,
              onToolSelect: setSelectedTool,
              selectedZoneType,
              onZoneTypeSelect: setSelectedZoneType,
              selectedServiceType,
              onServiceTypeSelect: setSelectedServiceType,
              isSimulationRunning: !isPaused,
              onToggleSimulation: () => {
                if (isPaused) {
                  handleResumeSimulation();
                } else {
                  handlePauseSimulation();
                }
              },
              onResetCity: () => {
                logger.info('Reset city requested');
                // Add reset logic here
              },
              isOpen: true,
              onClose: () => logger.info('City management panel close requested')
            }}
            onGameAction={(action, payload: any) => {
              if (action === 'advance-cycle') { tick(); if (onboardingStep < 6) setOnboardingStep(6); }
              if (action === 'pause') {
                handlePauseSimulation();
              }
              if (action === 'resume') {
                handleResumeSimulation();
              }
              if (action === 'set-speed') {
                if (!state) return;
                const rawPayload = payload && typeof payload === 'object' ? payload : null;
                const requestedMs = rawPayload && 'intervalMs' in rawPayload
                  ? (rawPayload as { intervalMs?: unknown }).intervalMs
                  : rawPayload && 'ms' in rawPayload
                    ? (rawPayload as { ms?: unknown }).ms
                    : null;
                const sanitizedMs = sanitizeIntervalMs(requestedMs);
                if (sanitizedMs == null) {
                  logger.warn('Ignoring invalid speed payload', payload);
                  return;
                }

                const nextSpeed = intervalMsToTimeSpeed(sanitizedMs);
                timeSystem.setSpeed(nextSpeed);

                setState(prev => (prev ? { ...prev, tick_interval_ms: sanitizedMs } as any : prev));

                void fetch('/api/state', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: state.id, tick_interval_ms: sanitizedMs })
                });
              }
              if (action === 'toggle-leylines') {
                setIsLeylineDrawing(prev => !prev);
              }
              if (action === 'open-council') setIsCouncilOpen(true);
              if (action === 'open-edicts') setIsEdictsOpen(true);
              if (action === 'open-omens') setIsOmensOpen(true);
              if (action === 'open-settings') setIsSettingsOpen(true);
            }}
            className="absolute inset-0"
          >
            <ModularWorkerPanel
              buildings={placedBuildings.map(b => ({ id: b.id, typeId: b.typeId as keyof typeof SIM_BUILDINGS, workers: b.workers, level: b.level }))}
              idleWorkers={idleWorkers}
              unrest={resources.unrest}
              totalWorkers={totalWorkers}
              grain={resources.grain}
              onAssign={async (id) => {
                const idx = placedBuildings.findIndex(b => b.id === id);
                if (idx === -1) return;
                const b = placedBuildings[idx];
                const cap = SIM_BUILDINGS[b.typeId].workCapacity ?? 0;
                if ((simResources?.workers ?? 0) <= 0 || b.workers >= cap) return;
                const updated = [...placedBuildings];
                updated[idx] = { ...b, workers: b.workers + 1 };
                setPlacedBuildings(updated);
                setSimResources(prev => prev ? { ...prev, workers: Math.max(0, prev.workers - 1) } : prev);
                await saveState({ buildings: updated });
                // Add assignment visual line from nearest house/storehouse
                try {
                  const targets = placedBuildings.filter(x => x.typeId === 'house' || x.typeId === 'storehouse');
                  let src = targets[0];
                  let best = Number.POSITIVE_INFINITY;
                  for (const t of targets) {
                    const d = Math.hypot((t.x - b.x), (t.y - b.y));
                    if (d < best) { best = d; src = t; }
                  }
                  if (src) {
                    setAssignLines(prev => [{ id: `al-${Date.now()}`, from: { x: src!.x, y: src!.y }, to: { x: b.x, y: b.y }, createdAt: performance.now(), ttl: 800 }, ...prev].slice(0, 8));
                    const tiles = computeRoadPath(src!.x, src!.y, b.x, b.y);
                    if (tiles.length) {
                      setPathHints(prev => [{ id: `ph-${Date.now()}`, tiles, createdAt: performance.now(), ttl: 1100 }, ...prev].slice(0, 6));
                    } else {
                      try { notify({ type: 'info', title: 'No Road Path', message: 'No roads connect; citizens will take the long way.' }); } catch {}
                    }
                    setPulses(prev => [{ id: `bp-${Date.now()}`, x: b.x, y: b.y, createdAt: performance.now(), ttl: 650 }, ...prev].slice(0, 10));
                  }
                } catch {}
                if (onboardingStep === 3) setOnboardingStep(4);
              }}
              onUnassign={async (id) => {
                const idx = placedBuildings.findIndex(b => b.id === id);
                if (idx === -1) return;
                const b = placedBuildings[idx];
                if (b.workers <= 0) return;
                const updated = [...placedBuildings];
                updated[idx] = { ...b, workers: b.workers - 1 };
                setPlacedBuildings(updated);
                setSimResources(prev => prev ? { ...prev, workers: prev.workers + 1 } : prev);
                await saveState({ buildings: updated });
                await checkMilestones();
              }}
            />
            <ModularQuestPanel
              completed={{
                farm: placedBuildings.some(b => b.typeId === 'farm'),
                house: placedBuildings.some(b => b.typeId === 'house'),
                assign: placedBuildings.some(b => (b.workers || 0) > 0),
                council: placedBuildings.some(b => b.typeId === 'council_hall'),
                proposals: proposals.length > 0,
                advance: state.cycle > 1,
              }}
            />

          </IntegratedHUDSystem>
          <NotificationHost />
          </GameProvider>

          {selectedTile && (
            <TileInfoPanel
              selected={{ x: selectedTile.x, y: selectedTile.y, tileType: selectedTile.tileType ?? tileTypes[selectedTile.y]?.[selectedTile.x] }}
              simResources={simResources}
              placedBuildings={placedBuildings}
              routes={routes || []}
              onPreviewType={(t)=> setPreviewTypeId(t)}
              onBuild={async (typeId) => {
                if (!simResources) return;
                const gx = selectedTile.x, gy = selectedTile.y;
                const tt = selectedTile.tileType ?? tileTypes[gy]?.[gx];
                // Prevent duplicate building per tile
                const occupied = placedBuildings.some(b => b.x === gx && b.y === gy);
                if (occupied) return;
                const def = SIM_BUILDINGS[typeId];
                if (!def) return;
                const allowed = (BUILDABLE_TILES as any)[typeId] as string[] | undefined;
                if (allowed && tt && !allowed.includes(tt)) return;
                // Enforce Council Hall prerequisite for advanced builds
                const hasCouncil = placedBuildings.some(b => b.typeId === 'council_hall');
                if ((typeId === 'trade_post' || typeId === 'automation_workshop') && !hasCouncil) return;
                // Affordability check (allow tutorial freebies)
                const hasFree = (tutorialFree[typeId as BuildTypeId] || 0) > 0;
                if (!hasFree && !canAfford(def.cost, simResources)) return;
                // Compute simple adjacency traits for bonuses (cardinal neighbors)
                const dirs = [
                  [1, 0], [-1, 0], [0, 1], [0, -1]
                ];
                let waterAdj = 0, mountainAdj = 0, forestAdj = 0;
                for (const [dx, dy] of dirs) {
                  const nx = gx + dx, ny = gy + dy;
                  if (ny >= 0 && ny < tileTypes.length && nx >= 0 && nx < (tileTypes[ny]?.length || 0)) {
                    const nt = tileTypes[ny][nx];
                    if (nt === 'water') waterAdj++;
                    if (nt === 'mountain') mountainAdj++;
                    if (nt === 'forest') forestAdj++;
                  }
                }

                const newBuilding: StoredBuilding = {
                  id: `b-${generateId()}`,
                  typeId: typeId as keyof typeof SIM_BUILDINGS,
                  x: gx,
                  y: gy,
                  level: 1,
                  workers: 0,
                  traits: { waterAdj, mountainAdj, forestAdj },
                };
                const newBuildings = [newBuilding, ...placedBuildings];
                const newResSim = hasFree ? simResources : applyCost(simResources, def.cost);
                // Update server state resources as well
                const newResServer = { ...state!.resources } as Record<string, number>;
                if (!hasFree) {
                  for (const [k, v] of Object.entries(def.cost)) {
                    const key = k as keyof typeof newResServer;
                    newResServer[key] = Math.max(0, (newResServer[key] || 0) - (v || 0));
                  }
                }
                setPlacedBuildings(newBuildings);
                setSimResources(newResSim);
                setState(prev => prev ? { ...prev, resources: newResServer, buildings: newBuildings } : prev);
                await saveState({ resources: newResServer, buildings: newBuildings });
                setMarkers(prev => [{ id: `m-${generateId()}`, x: gx, y: gy, label: SIM_BUILDINGS[typeId].name }, ...prev]);
                // Build effect burst
                setClickEffectKey(`build-${Date.now()}-${gx}-${gy}`);
                // Trigger construction animation
                setConstructionEvents(prev => [{
                  id: `construction-${newBuilding.id}`,
                  buildingId: newBuilding.id,
                  position: { x: gx, y: gy },
                  type: 'building',
                  timestamp: Date.now()
                }, ...prev]);
                // Tutorial progress + consume freebies
                if (hasFree) setTutorialFree(prev => ({ ...prev, [typeId as BuildTypeId]: Math.max(0, (prev[typeId as BuildTypeId] || 0) - 1) }));
                if (onboardingStep === 1 && typeId === 'farm') setOnboardingStep(2);
                if (onboardingStep === 2 && typeId === 'house') setOnboardingStep(3);
                if (onboardingStep === 4 && typeId === 'council_hall') setOnboardingStep(5);
              }}
              onUpgrade={async (buildingId) => {
                if (!simResources) return;
                const idx = placedBuildings.findIndex(b => b.id === buildingId);
                if (idx === -1) return;
                const b = placedBuildings[idx];
                const def = SIM_BUILDINGS[b.typeId];
                const maxL = def.maxLevel ?? 3;
                if (b.level >= maxL) return;
                const factor = 1 + 0.5 * b.level;
                // compute scaled cost
                const scaledCost: Partial<SimResources> = {};
                for (const [k, v] of Object.entries(def.cost)) {
                  (scaledCost as any)[k] = Math.round((v ?? 0) * factor);
                }
                if (!canAfford(scaledCost, simResources)) return;
                // apply costs
                const newResSim = applyCost(simResources, scaledCost);
                const newResServer = { ...state!.resources } as Record<string, number>;
                for (const [k, v] of Object.entries(scaledCost)) {
                  const key = k as keyof typeof newResServer;
                  newResServer[key] = Math.max(0, (newResServer[key] || 0) - (v || 0));
                }
                const updated = [...placedBuildings];
                updated[idx] = { ...b, level: b.level + 1 };
                setPlacedBuildings(updated);
                setSimResources(newResSim);
                setState(prev => prev ? { ...prev, resources: newResServer, buildings: updated } : prev);
                await saveState({ resources: newResServer, buildings: updated });
                // Trigger upgrade animation
                setConstructionEvents(prev => [{
                  id: `upgrade-${buildingId}`,
                  buildingId: buildingId,
                  position: { x: b.x, y: b.y },
                  type: 'upgrading',
                  timestamp: Date.now()
                }, ...prev]);
              }}
              onDismantle={async (buildingId) => {
                if (!confirm('Dismantle this building? You will receive a partial refund.')) return;
                const idx = placedBuildings.findIndex(b => b.id === buildingId);
                if (idx === -1) return;
                const b = placedBuildings[idx];
                const def = SIM_BUILDINGS[b.typeId];
                const factor = 1 + 0.5 * (b.level - 1);
                const refund: Partial<SimResources> = {};
                for (const [k, v] of Object.entries(def.cost)) {
                  (refund as any)[k] = Math.round(((v ?? 0) * factor) * 0.5);
                }
                const newResSim = simResources ? { ...simResources } : null;
                const newResServer = { ...state!.resources } as Record<string, number>;
                for (const [k, v] of Object.entries(refund)) {
                  if (newResSim) (newResSim as any)[k] = ((newResSim as any)[k] || 0) + (v || 0);
                  const key = k as keyof typeof newResServer;
                  newResServer[key] = (newResServer[key] || 0) + (v || 0);
                }
                // remove routes attached to this building
                const keptRoutes = (routes || []).filter(r => r.fromId !== b.id && r.toId !== b.id);
                const updated = placedBuildings.filter((_, i) => i !== idx);
                setPlacedBuildings(updated);
                if (newResSim) setSimResources(newResSim);
                setRoutes(keptRoutes);
                setState(prev => prev ? { ...prev, resources: newResServer, buildings: updated, routes: keptRoutes } : prev);
                await saveState({ resources: newResServer, buildings: updated, routes: keptRoutes });
                // Trigger demolition animation
                setConstructionEvents(prev => [{
                  id: `demolish-${buildingId}`,
                  buildingId: buildingId,
                  position: { x: b.x, y: b.y },
                  type: 'demolishing',
                  timestamp: Date.now()
                }, ...prev]);
              }}
              onRemoveRoute={async (routeId) => {
                const newRoutes = (routes || []).filter(r => r.id !== routeId);
                setRoutes(newRoutes);
                setState(prev => prev ? { ...prev, routes: newRoutes } : prev);
                await saveState({ routes: newRoutes });
              }}
              routeDraftFrom={routeDraftFrom}
              onStartRoute={(buildingId) => setRouteDraftFrom(buildingId)}
              onFinalizeRoute={async (fromId, toId) => {
                if (!simResources) return;
                const a = placedBuildings.find(b => b.id === fromId);
                const b = placedBuildings.find(b => b.id === toId);
                if (!a || !b) return;
                if (a.typeId !== 'trade_post' || b.typeId !== 'trade_post') return;
                if (a.id === b.id) return;
                // Prevent duplicate routes (either direction)
                const exists = (routes || []).some(r =>
                  (r.fromId === a.id && r.toId === b.id) || (r.fromId === b.id && r.toId === a.id)
                );
                if (exists) { setRouteDraftFrom(null); return; }
                // Limit connections per node for stability
                const MAX_ROUTES_PER_NODE = 3;
                const aCount = (routes || []).filter(r => r.fromId === a.id || r.toId === a.id).length;
                const bCount = (routes || []).filter(r => r.fromId === b.id || r.toId === b.id).length;
                if (aCount >= MAX_ROUTES_PER_NODE || bCount >= MAX_ROUTES_PER_NODE) { setRouteDraftFrom(null); return; }
                const length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
                const MAX_ROUTE_LEN = 20;
                if (length > MAX_ROUTE_LEN) { setRouteDraftFrom(null); return; }
                const cost = 5 + 2 * length;
                if ((simResources.coin ?? 0) < cost) return;
                const newResSim = { ...simResources, coin: simResources.coin - cost };
                const newResServer = { ...state!.resources, coin: (state!.resources.coin || 0) - cost };
                const newRoute: TradeRoute = { id: `r-${generateId()}`, fromId, toId, length };
                const newRoutes = [newRoute, ...(routes || [])];
                setSimResources(newResSim);
                setRoutes(newRoutes);
                setState(prev => prev ? { ...prev, resources: newResServer, routes: newRoutes } : prev);
                await saveState({ resources: newResServer, routes: newRoutes });
                setRouteDraftFrom(null);
                setMarkers(prev => [{ id: `m-${generateId()}`, x: b.x, y: b.y, label: 'Route' }, ...prev]);
                await checkMilestones();
              }}
              onCancelRoute={() => setRouteDraftFrom(null)}
              onOpenCouncil={() => { setIsCouncilOpen(true); if (onboardingStep === 4) setOnboardingStep(5); }}
              tutorialFree={tutorialFree}
              onConsumeTutorialFree={(typeId) => setTutorialFree(prev => ({ ...prev, [typeId]: Math.max(0, (prev[typeId] || 0) - 1) }))}
              onTutorialProgress={(evt) => { if (evt.type === 'openedCouncil' && onboardingStep === 4) setOnboardingStep(5); }}
              allowFineSawmill={(accumulateEffects(generateSkillTree(skillTreeSeed).nodes.filter(n => unlockedSkillIds.includes(n.id))).bldMul['sawmill'] ?? 1) > 1}
              onSetRecipe={async (buildingId, recipe) => {
                const idx = placedBuildings.findIndex(b => b.id === buildingId);
                if (idx === -1) return;
                const updated = [...placedBuildings];
                (updated[idx] as any).recipe = recipe === 'fine' ? 'fine' : 'basic';
                setPlacedBuildings(updated);
                await saveState({ buildings: updated });
                notify({ type: 'info', title: 'Recipe Updated', message: `${SIM_BUILDINGS[updated[idx].typeId].name} → ${recipe === 'fine' ? 'Fine Planks' : 'Planks'}` })
              }}
            />
          )}

          {/* Worker upkeep notice */}
          <div className="absolute left-2 bottom-2 bg-white/90 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 pointer-events-none">
            Upkeep: {Math.round(totalWorkers * 0.2)} grain/turn {resources.grain < Math.round(totalWorkers * 0.2) ? '• Insufficient!' : ''}
          </div>

          {/* Building hover details disabled for stability */}
        </div>
      </div>



      {/* Edicts Panel */}
      <EdictsPanel
        isOpen={isEdictsOpen}
        onClose={() => setIsEdictsOpen(false)}
        edicts={edictDefs}
        pendingChanges={pendingEdictChanges}
        onEdictChange={(id, value) => setPendingEdictChanges(prev => ({ ...prev, [id]: value }))}
        onApplyChanges={async () => {
          const applied: Record<string, number> = { ...edicts };
          for (const [k, v] of Object.entries(pendingEdictChanges)) applied[k] = v;
          setEdicts(applied);
          setPendingEdictChanges({});
          // Deduct favor cost
          const newRes = { ...state!.resources } as Record<string, number>;
          newRes.favor = Math.max(0, (newRes.favor || 0) - totalEdictCost);
          setState(prev => prev ? { ...prev, resources: newRes, edicts: applied } : prev);
          await saveState({ resources: newRes, edicts: applied });
        }}
        onResetChanges={() => setPendingEdictChanges({})}
        currentFavor={resources.favor}
        totalCost={totalEdictCost}
      />

      {/* Council Panel */}
      <CouncilPanel
        isOpen={isCouncilOpen}
        onClose={() => setIsCouncilOpen(false)}
        proposals={councilProposals}
        currentResources={resources}
        onAcceptProposal={(id) => decide(id, 'accept')}
        onRejectProposal={(id) => decide(id, 'reject')}
        onScryProposal={scry}
        onGenerateProposals={async () => { await generate(); if (onboardingStep === 5) setOnboardingStep(6); }}
        canGenerateProposals={true}
      />
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        layoutPresets={[{ id: 'default', name: 'Default', description: 'Standard HUD' }]}
        currentPreset={'default'}
        onPresetChange={() => {}}
        showRoads={showRoads}
        onToggleRoads={(v)=> setShowRoads(v)}
        showCitizens={showCitizens}
        onToggleCitizens={(v)=> setShowCitizens(v)}
        requireRoadConfirm={requireRoadConfirm}
        onToggleRoadConfirm={(v)=> setRequireRoadConfirm(v)}
        edgeScrollEnabled={edgeScrollEnabled}
        onToggleEdgeScroll={(v)=> setEdgeScrollEnabled(v)}
        autoAssignWorkers={autoAssignWorkers}
        onToggleAutoAssignWorkers={(v)=> setAutoAssignWorkers(v)}
        citizensCount={citizensCount}
        onChangeCitizensCount={(v)=> { setCitizensCount(v); saveState({ citizens_count: v } as any).catch(()=>{}); }}
        citizensSeed={citizensSeed}
        onChangeCitizensSeed={(v)=> { setCitizensSeed(v); saveState({ citizens_seed: v } as any).catch(()=>{}); }}
        simTickIntervalMs={Number((state as any)?.tick_interval_ms ?? 60000)}
        onChangeSimTickInterval={async (ms) => {
          if (!state) return;
          try {
            await fetch('/api/state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: state.id, tick_interval_ms: ms }) });
            setState(prev => prev ? { ...prev, tick_interval_ms: ms } as any : prev);
          } catch {}
        }}
        isAutoTicking={!(isPaused)}
        timeRemainingSec={timeRemaining}
        onToggleAutoTicking={async (auto) => {
          if (!state) return;
          setIsPaused(!auto);
          try {
            const body: any = { id: state.id, auto_ticking: auto };
            if (auto) body.last_tick_at = new Date().toISOString();
            await fetch('/api/state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          } catch {}
        }}
        onTickNow={() => { void tick(); }}
      />
    </div>
  );
}
