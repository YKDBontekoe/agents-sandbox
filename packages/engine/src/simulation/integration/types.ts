import type { SimResources } from '../../index';
import type { GameTime } from '../../types/gameTime';
import type { SimulatedBuilding } from '../buildingSimulation';
import type { Citizen } from '../citizenBehavior';
import type { WorkerProfile } from '../workers/types';
import type { ActiveEvent } from '../gameplayEvents';

// Enhanced game state interface
export interface EnhancedGameState {
  // Core game state
  buildings: Array<{
    id: string;
    typeId: string;
    x: number;
    y: number;
    level: number;
    workers: number;
    traits?: Record<string, number>;
  }>;
  resources: SimResources;
  gameTime: GameTime;

  // Enhanced simulation data
  simulatedBuildings: SimulatedBuilding[];
  citizens: Citizen[];
  workers: WorkerProfile[];
  activeEvents: ActiveEvent[];

  // System metrics
  systemHealth: {
    economicHealth: number;
    publicSafety: number;
    socialCohesion: number;
  };
}

// Visual feedback configuration
export interface VisualFeedbackConfig {
  showBuildingStatus: boolean;
  showCitizenMood: boolean;
  showResourceFlow: boolean;
  showEventImpacts: boolean;
  showSystemHealth: boolean;
}

// Performance metrics
export interface PerformanceMetrics {
  totalUpdates: number;
  averageUpdateTime: number;
  systemLoad: number;
  memoryUsage: number;
}

