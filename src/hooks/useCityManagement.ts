import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Define types locally since they're not exported from @engine
export interface CityStats {
  population: number;
  happiness: number;
  traffic: number;
  pollution: number;
  crime: number;
  education: number;
  healthcare: number;
  employment: number;
  budget: number;
  income: number;
  expenses: number;
}

export interface ManagementAction {
  type: 'zone' | 'build_road' | 'build_service' | 'demolish' | 'upgrade';
  position: { x: number; y: number };
  data: Record<string, unknown>;
  cost: number;
}

// Mock CityManagementInterface for now since it's not exported from @engine
interface CityManagementConfig {
  gridWidth: number;
  gridHeight: number;
  initialBudget?: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

class CityManagementInterface {
  private config: CityManagementConfig;
  private stats: CityStats;

  constructor(config: CityManagementConfig) {
    this.config = config;
    this.stats = {
      population: 0,
      happiness: 50,
      traffic: 0,
      pollution: 0,
      crime: 0,
      education: 0,
      healthcare: 0,
      employment: 0,
      budget: config.initialBudget || 10000,
      income: 0,
      expenses: 0
    };
  }
  
  async initialize(): Promise<void> {
    // Mock initialization
  }
  
  update(): void {
    // Mock update logic
    this.stats.population += Math.random() * 0.1;
    this.stats.happiness = Math.max(0, Math.min(100, this.stats.happiness + (Math.random() - 0.5) * 2));
  }
  
  getStats(): CityStats {
    return { ...this.stats };
  }
  
  async executeAction(action: ManagementAction): Promise<boolean> {
    if (this.stats.budget >= action.cost) {
      this.stats.budget -= action.cost;
      return true;
    }
    return false;
  }
  
  dispose?(): void {
    // Mock cleanup
  }
}

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
}

export interface UseCityManagementReturn {
  // State
  state: CityManagementState;
  
  // Core operations
  initialize: (options?: UseCityManagementOptions) => Promise<void>;
  executeAction: (action: ManagementAction) => Promise<boolean>;
  updateSimulation: (deltaTime: number) => void;
  
  // Specific actions
  buildRoad: (x: number, y: number) => Promise<boolean>;
  setZone: (x: number, y: number, zoneType: string) => Promise<boolean>;
  buildService: (x: number, y: number, serviceType: string) => Promise<boolean>;
  demolish: (x: number, y: number) => Promise<boolean>;
  
  // Utilities
  getStats: () => CityStats;
  canAffordAction: (action: ManagementAction) => boolean;
  reset: () => void;
}

const DEFAULT_OPTIONS: Required<UseCityManagementOptions> = {
  gridWidth: 50,
  gridHeight: 50,
  initialBudget: 10000,
  difficulty: 'normal',
  autoUpdate: true,
  updateInterval: 1000
};

export function useCityManagement(options: UseCityManagementOptions = {}): UseCityManagementReturn {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const cityManagementRef = useRef<CityManagementInterface | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<CityManagementState>({
    stats: {
      population: 0,
      happiness: 50,
      traffic: 0,
      pollution: 0,
      crime: 0,
      education: 0,
      healthcare: 0,
      employment: 0,
      budget: opts.initialBudget,
      income: 0,
      expenses: 0
    },
    isInitialized: false,
    isSimulating: false,
    lastUpdate: Date.now()
  });

  // Update simulation
  const updateSimulation = useCallback(() => {
    if (!cityManagementRef.current || !state.isInitialized) return;

    setState(prev => ({ ...prev, isSimulating: true }));

    try {
      // Update the simulation
      cityManagementRef.current.update();

      // Get updated stats
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
  }, [state.isInitialized]);

  // Start automatic simulation updates
  const startAutoUpdate = useCallback((interval: number) => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    updateIntervalRef.current = setInterval(() => {
      if (cityManagementRef.current && state.isInitialized) {
        updateSimulation();
      }
    }, interval);
  }, [state.isInitialized, updateSimulation]);

  // Initialize city management system
  const initialize = useCallback(async (initOptions?: UseCityManagementOptions) => {
    const finalOptions = { ...opts, ...initOptions };

    try {
      // Create city management interface
      cityManagementRef.current = new CityManagementInterface({
        gridWidth: finalOptions.gridWidth,
        gridHeight: finalOptions.gridHeight,
        initialBudget: finalOptions.initialBudget,
        difficulty: finalOptions.difficulty
      });

      // Initialize the system
      await cityManagementRef.current.initialize();

      // Get initial stats
      const initialStats = cityManagementRef.current.getStats();

      setState(prev => ({
        ...prev,
        stats: initialStats,
        isInitialized: true,
        lastUpdate: Date.now()
      }));

      // Start auto-update if enabled
      if (finalOptions.autoUpdate) {
        startAutoUpdate(finalOptions.updateInterval);
      }

    } catch (error) {
      console.error('Failed to initialize city management:', error);
      throw error;
    }
  }, [opts, startAutoUpdate]);

  // Execute a management action
  const executeAction = useCallback(async (action: ManagementAction): Promise<boolean> => {
    if (!cityManagementRef.current || !state.isInitialized) {
      console.warn('City management not initialized');
      return false;
    }
    
    try {
      const success = await cityManagementRef.current.executeAction(action);
      
      if (success) {
        // Update stats after successful action
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
  }, [state.isInitialized]);

  // Specific action helpers
  const buildRoad = useCallback(async (x: number, y: number): Promise<boolean> => {
    return executeAction({
      type: 'build_road',
      position: { x, y },
      data: {},
      cost: 100 // Default road cost
    });
  }, [executeAction]);

  const setZone = useCallback(async (x: number, y: number, zoneType: string): Promise<boolean> => {
    return executeAction({
      type: 'zone',
      position: { x, y },
      data: { zoneType },
      cost: 50 // Default zoning cost
    });
  }, [executeAction]);

  const buildService = useCallback(async (x: number, y: number, serviceType: string): Promise<boolean> => {
    const serviceCosts: Record<string, number> = {
      police: 500,
      fire: 600,
      hospital: 1000,
      school: 800,
      park: 200
    };
    
    return executeAction({
      type: 'build_service',
      position: { x, y },
      data: { serviceType },
      cost: serviceCosts[serviceType] || 500
    });
  }, [executeAction]);

  const demolish = useCallback(async (x: number, y: number): Promise<boolean> => {
    return executeAction({
      type: 'demolish',
      position: { x, y },
      data: {},
      cost: 0 // Demolition is free but may have other costs
    });
  }, [executeAction]);

  // Utility functions
  const getStats = useCallback((): CityStats => {
    return state.stats;
  }, [state.stats]);

  const canAffordAction = useCallback((action: ManagementAction): boolean => {
    return state.stats.budget >= action.cost;
  }, [state.stats.budget]);

  const reset = useCallback(() => {
    // Stop auto-update
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    // Reset city management interface
    if (cityManagementRef.current) {
      cityManagementRef.current.dispose?.();
      cityManagementRef.current = null;
    }
    
    // Reset state
    setState({
      stats: {
        population: 0,
        happiness: 50,
        traffic: 0,
        pollution: 0,
        crime: 0,
        education: 0,
        healthcare: 0,
        employment: 0,
        budget: opts.initialBudget,
        income: 0,
        expenses: 0
      },
      isInitialized: false,
      isSimulating: false,
      lastUpdate: Date.now()
    });
  }, [opts.initialBudget]);

  // Cleanup on unmount
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
