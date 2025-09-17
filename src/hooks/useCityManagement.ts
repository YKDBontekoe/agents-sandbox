import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import {
  CityManagementInterface,
  type CityManagementConfig,
  type CityStats,
  type ManagementAction,
  type GameTime,
  createGameTime
} from '@engine';

export interface CityManagementState {
  stats: CityStats;
  isInitialized: boolean;
  isSimulating: boolean;
  lastUpdate: number;
}

export interface UseCityManagementOptions {
  gridWidth?: number;
  gridHeight?: number;
  initialBudget?: number;
  difficulty?: 'easy' | 'normal' | 'hard';
  autoUpdate?: boolean;
  updateInterval?: number;
  createInterface?: (config: CityManagementConfig) => CityManagementInterface;
}

export interface UseCityManagementReturn {
  state: CityManagementState;
  initialize: (options?: UseCityManagementOptions) => Promise<void>;
  executeAction: (action: ManagementAction) => Promise<boolean>;
  updateSimulation: (deltaTime: number, gameTime: GameTime) => void;
  buildRoad: (
    startX: number,
    startY: number,
    endX?: number,
    endY?: number,
    roadType?: string
  ) => Promise<boolean>;
  setZone: (
    startX: number,
    startY: number,
    zoneType: string,
    endX?: number,
    endY?: number
  ) => Promise<boolean>;
  buildService: (x: number, y: number, serviceType: string) => Promise<boolean>;
  demolish: (x: number, y: number) => Promise<boolean>;
  getStats: () => CityStats;
  canAffordAction: (action: ManagementAction) => boolean;
  reset: () => void;
}

type ResolvedOptions = Required<Omit<UseCityManagementOptions, 'createInterface'>> &
  Pick<UseCityManagementOptions, 'createInterface'>;

const DEFAULT_OPTIONS: ResolvedOptions = {
  gridWidth: 50,
  gridHeight: 50,
  initialBudget: 10000,
  difficulty: 'normal',
  autoUpdate: true,
  updateInterval: 1000,
  createInterface: undefined
};

const createDefaultStats = (budget: number): CityStats => ({
  population: 0,
  happiness: 50,
  traffic: 0,
  pollution: 0,
  crime: 0,
  education: 0,
  healthcare: 0,
  employment: 0,
  budget,
  income: 0,
  expenses: 0
});

const calculateZoneCost = (
  startX: number,
  startY: number,
  endX: number,
  endY: number
): number => {
  const area = Math.abs(endX - startX + 1) * Math.abs(endY - startY + 1);
  return area * 100;
};

const calculateRoadCost = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  roadType: string
): number => {
  const distance = Math.abs(endX - startX) + Math.abs(endY - startY);
  const baseCost = roadType === 'highway' ? 500 : roadType === 'commercial' ? 300 : 200;
  return distance * baseCost;
};

const calculateServiceCost = (serviceType: string): number => {
  switch (serviceType) {
    case 'police':
      return 5000;
    case 'fire':
      return 7000;
    case 'healthcare':
    case 'hospital':
      return 10000;
    case 'education':
    case 'school':
      return 8000;
    case 'power':
      return 15000;
    case 'water':
      return 12000;
    case 'waste':
      return 6000;
    default:
      return 5000;
  }
};

export function useCityManagement(options: UseCityManagementOptions = {}): UseCityManagementReturn {
  const opts = useMemo<ResolvedOptions>(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const cityManagementRef = useRef<CityManagementInterface | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const lastUpdateTimestampRef = useRef<number | null>(null);
  const accumulatedMinutesRef = useRef(0);

  const [state, setState] = useState<CityManagementState>({
    stats: createDefaultStats(opts.initialBudget),
    isInitialized: false,
    isSimulating: false,
    lastUpdate: Date.now()
  });

  const updateSimulation = useCallback((deltaTime: number, gameTime: GameTime) => {
    if (!cityManagementRef.current || !isInitializedRef.current) return;

    setState(prev => ({ ...prev, isSimulating: true }));

    try {
      cityManagementRef.current.update(deltaTime, gameTime);
      const updatedStats = cityManagementRef.current.getStats();

      setState(prev => ({
        ...prev,
        stats: updatedStats,
        isSimulating: false,
        lastUpdate: Date.now()
      }));
    } catch (error) {
      console.error('Simulation update failed:', error);
      setState(prev => ({ ...prev, isSimulating: false }));
    }
  }, []);

  const startAutoUpdate = useCallback((interval: number) => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    lastUpdateTimestampRef.current = null;

    updateIntervalRef.current = setInterval(() => {
      if (!cityManagementRef.current || !isInitializedRef.current) {
        return;
      }

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const last = lastUpdateTimestampRef.current ?? now;
      const deltaSeconds = Math.max(0, (now - last) / 1000);
      lastUpdateTimestampRef.current = now;

      accumulatedMinutesRef.current += deltaSeconds / 60;
      const totalMinutes = Math.max(0, Math.floor(accumulatedMinutesRef.current));
      const gameTime = createGameTime(totalMinutes);

      updateSimulation(deltaSeconds, gameTime);
    }, interval);
  }, [updateSimulation]);

  const initialize = useCallback(async (initOptions?: UseCityManagementOptions) => {
    const finalOptions: ResolvedOptions = { ...opts, ...initOptions };

    try {
      const createInstance = finalOptions.createInterface ??
        ((config: CityManagementConfig) => new CityManagementInterface(config));

      const instance = createInstance({
        gridWidth: finalOptions.gridWidth,
        gridHeight: finalOptions.gridHeight,
        initialBudget: finalOptions.initialBudget,
        difficulty: finalOptions.difficulty
      });

      cityManagementRef.current = instance;

      if (typeof instance.initialize === 'function') {
        await instance.initialize();
      }

      instance.startSimulation?.();

      const initialStats = instance.getStats();

      isInitializedRef.current = true;
      setState(prev => ({
        ...prev,
        stats: initialStats,
        isInitialized: true,
        lastUpdate: Date.now()
      }));

      if (finalOptions.autoUpdate) {
        startAutoUpdate(finalOptions.updateInterval);
      }
    } catch (error) {
      console.error('Failed to initialize city management:', error);
      throw error;
    }
  }, [opts, startAutoUpdate]);

  const executeAction = useCallback(async (action: ManagementAction): Promise<boolean> => {
    if (!cityManagementRef.current || !isInitializedRef.current) {
      console.warn('City management not initialized');
      return false;
    }

    try {
      const success = await cityManagementRef.current.executeAction(action);

      if (success) {
        const updatedStats = cityManagementRef.current.getStats();
        setState(prev => ({
          ...prev,
          stats: updatedStats,
          lastUpdate: Date.now()
        }));
      }

      return success;
    } catch (error) {
      console.error('Action execution failed:', error);
      return false;
    }
  }, []);

  const buildRoad = useCallback(async (
    startX: number,
    startY: number,
    endX: number = startX,
    endY: number = startY,
    roadType: string = 'residential'
  ): Promise<boolean> => {
    const cost = calculateRoadCost(startX, startY, endX, endY, roadType);

    return executeAction({
      type: 'build_road',
      position: { x: startX, y: startY },
      data: {
        endPosition: { x: endX, y: endY },
        roadType
      },
      cost
    });
  }, [executeAction]);

  const setZone = useCallback(async (
    startX: number,
    startY: number,
    zoneType: string,
    endX: number = startX,
    endY: number = startY
  ): Promise<boolean> => {
    const cost = calculateZoneCost(startX, startY, endX, endY);

    return executeAction({
      type: 'zone',
      position: { x: startX, y: startY },
      data: {
        zoneType,
        endX,
        endY
      },
      cost
    });
  }, [executeAction]);

  const buildService = useCallback(async (x: number, y: number, serviceType: string): Promise<boolean> => {
    const cost = calculateServiceCost(serviceType);

    return executeAction({
      type: 'build_service',
      position: { x, y },
      data: { serviceType },
      cost
    });
  }, [executeAction]);

  const demolish = useCallback(async (x: number, y: number): Promise<boolean> => {
    return executeAction({
      type: 'demolish',
      position: { x, y },
      data: {},
      cost: 0
    });
  }, [executeAction]);

  const getStats = useCallback((): CityStats => {
    return state.stats;
  }, [state.stats]);

  const canAffordAction = useCallback((action: ManagementAction): boolean => {
    return state.stats.budget >= action.cost;
  }, [state.stats.budget]);

  const reset = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    if (cityManagementRef.current) {
      cityManagementRef.current.dispose?.();
      cityManagementRef.current = null;
    }

    isInitializedRef.current = false;
    lastUpdateTimestampRef.current = null;
    accumulatedMinutesRef.current = 0;

    setState({
      stats: createDefaultStats(opts.initialBudget),
      isInitialized: false,
      isSimulating: false,
      lastUpdate: Date.now()
    });
  }, [opts.initialBudget]);

  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (cityManagementRef.current) {
        cityManagementRef.current.dispose?.();
      }
    };
  }, []);

  return {
    state,
    initialize,
    executeAction,
    updateSimulation,
    buildRoad,
    setZone,
    buildService,
    demolish,
    getStats,
    canAffordAction,
    reset
  };
}

export default useCityManagement;
