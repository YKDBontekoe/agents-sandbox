import type { SimResources } from '../index';
import type { GameTime } from '../types/gameTime';
import { performMaintenance, type SimulatedBuilding } from './buildings';
import { CitizenBehaviorSystem } from './citizenBehavior';
import type { Citizen } from './citizens/citizen';
import type { ActiveEvent, VisualIndicator } from './events/types';
import { EventManager } from './events/EventManager';
import { WorkerSimulationSystem, type LaborMarket } from './workerSimulation';
import type { WorkerProfile } from './workers/types';
import {
  runBuildingPipeline,
  type MaintenanceAction
} from './buildingPipeline';
import { runCitizenPipeline } from './citizenPipeline';
import { runWorkerPipeline } from './workerPipeline';
import { runEventPipeline } from './eventPipeline';

type SystemHealthSnapshot = ReturnType<EventManager['getSystemHealth']>;

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
  maintenanceActions: MaintenanceAction[];
  citizens: Citizen[];
  communityMood: { happiness: number; stress: number; satisfaction: number };
  workers: WorkerProfile[];
  laborMarket: LaborMarket;
  activeEvents: ActiveEvent[];

  // System metrics
  systemHealth: SystemHealthSnapshot;
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

// Main simulation integration system
export class SimulationIntegrationSystem {
  // Initialize simulation systems
  private citizenSystem = new CitizenBehaviorSystem();
  private workerSystem = new WorkerSimulationSystem();
  private eventManager = new EventManager();
  private previousSimulatedBuildings: SimulatedBuilding[] = [];
  private latestMaintenanceActions: MaintenanceAction[] = [];
  private latestCommunityMood = { happiness: 50, stress: 50, satisfaction: 50 };
  private latestLaborMarket: LaborMarket | null = null;
  private latestSystemHealth: SystemHealthSnapshot = this.eventManager.getSystemHealth();

  private visualConfig: VisualFeedbackConfig;
  private performanceMetrics: PerformanceMetrics;
  
  constructor(config: Partial<VisualFeedbackConfig> = {}) {
    this.visualConfig = {
      showBuildingStatus: true,
      showCitizenMood: true,
      showResourceFlow: true,
      showEventImpacts: true,
      showSystemHealth: true,
      ...config
    };
    
    this.performanceMetrics = {
      totalUpdates: 0,
      averageUpdateTime: 0,
      systemLoad: 0,
      memoryUsage: 0
    };
  }
  
  // Main update loop for all simulation systems
  updateSimulation(gameState: {
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
  }, _deltaTime: number): EnhancedGameState {
    void _deltaTime;
    const startTime = performance.now();
    
    try {
      const buildingResult = runBuildingPipeline({
        buildings: gameState.buildings,
        resources: gameState.resources,
        gameTime: gameState.gameTime,
        previousSimulatedBuildings: this.previousSimulatedBuildings
      });

      const citizenResult = runCitizenPipeline(this.citizenSystem, {
        gameTime: gameState.gameTime,
        buildings: buildingResult.simulatedBuildings,
        resources: gameState.resources,
        activeEvents: this.eventManager.getActiveEvents(),
        threatLevel: this.calculateThreatLevel({ resources: gameState.resources })
      });

      const workerResult = runWorkerPipeline(this.workerSystem, {
        gameTime: gameState.gameTime,
        buildings: buildingResult.simulatedBuildings,
        resources: gameState.resources,
        citizens: citizenResult.citizens
      });

      const eventResult = runEventPipeline(this.eventManager, {
        gameTime: gameState.gameTime,
        buildings: buildingResult.simulatedBuildings,
        citizens: citizenResult.citizens,
        workers: workerResult.workers,
        resources: gameState.resources
      });

      this.previousSimulatedBuildings = buildingResult.simulatedBuildings.map(building => ({
        ...building
      }));
      this.latestMaintenanceActions = buildingResult.maintenanceActions;
      this.latestCommunityMood = citizenResult.communityMood;
      this.latestLaborMarket = workerResult.laborMarket;
      this.latestSystemHealth = eventResult.systemHealth;

      this.updatePerformanceMetrics(startTime);

      return {
        buildings: gameState.buildings,
        resources: gameState.resources,
        gameTime: gameState.gameTime,
        simulatedBuildings: buildingResult.simulatedBuildings,
        maintenanceActions: buildingResult.maintenanceActions,
        citizens: citizenResult.citizens,
        communityMood: citizenResult.communityMood,
        workers: workerResult.workers,
        laborMarket: workerResult.laborMarket,
        activeEvents: eventResult.activeEvents,
        systemHealth: eventResult.systemHealth
      };
      
    } catch (error) {
      console.error('Simulation update error:', error);
      // Return safe fallback state using the last known good data
      return {
        buildings: gameState.buildings,
        resources: gameState.resources,
        gameTime: gameState.gameTime,
        simulatedBuildings: [...this.previousSimulatedBuildings],
        maintenanceActions: [...this.latestMaintenanceActions],
        citizens: this.citizenSystem.getAllCitizens(),
        communityMood: this.latestCommunityMood,
        workers: this.workerSystem.getAllWorkers(),
        laborMarket: this.latestLaborMarket ?? this.workerSystem.getLaborMarket(),
        activeEvents: this.eventManager.getActiveEvents(),
        systemHealth: this.latestSystemHealth
      };
    }
  }
  
  // Generate visual indicators for the UI
  generateVisualIndicators(gameState: EnhancedGameState): VisualIndicator[] {
    const indicators: VisualIndicator[] = [];
    
    // Add building status indicators
    if (this.visualConfig.showBuildingStatus) {
      gameState.simulatedBuildings.forEach(building => {
        if (building.condition === 'poor' || building.condition === 'critical') {
          indicators.push({
            id: `building_${building.id}`,
            type: 'building_status',
            position: { x: building.x, y: building.y },
            value: this.getConditionValue(building.condition),
            change: -1,
            color: building.condition === 'critical' ? '#ff4444' : '#ffaa44',
            icon: 'warning',
            animation: 'pulse',
            duration: 3000,
            priority: building.condition === 'critical' ? 'critical' : 'medium'
          });
        }
      });
    }
    
    // Add citizen mood indicators
    if (this.visualConfig.showCitizenMood) {
      const communityMood = gameState.communityMood;
      if (communityMood.happiness < 30 || communityMood.stress > 70) {
        indicators.push({
          id: 'community_mood',
          type: 'citizen_mood',
          position: { x: 0, y: 0 },
          value: communityMood.happiness,
          change: communityMood.stress > 70 ? -1 : 0,
          color: communityMood.happiness < 30 ? '#ff6666' : '#ffaa66',
          icon: 'mood',
          animation: 'bounce',
          duration: 2000,
          priority: 'medium'
        });
      }
    }
    
    // Add event-based indicators
    if (this.visualConfig.showEventImpacts) {
      indicators.push(...this.eventManager.getVisualIndicators());
    }
    
    return indicators;
  }
  
  // Generate a new citizen
  generateCitizen(name: string, age: number): string {
    const citizenId = `citizen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const seed = Math.floor(Math.random() * 1000000);
    
    this.citizenSystem.generateCitizen(citizenId, name, age, seed);
    return citizenId;
  }
  
  // Create a worker from a citizen
  createWorker(citizenId: string, roleId: string): boolean {
    const citizen = this.citizenSystem.getCitizen(citizenId);
    if (!citizen) return false;
    
    const worker = this.workerSystem.createWorker(citizen, roleId);
    return worker !== null;
  }
  
  // Handle player actions
    handlePlayerAction(action: {
      type: string;
      params: Record<string, unknown>;
    }, gameState: EnhancedGameState): {
      success: boolean;
      message: string;
      effects?: Record<string, unknown>;
    } {
    switch (action.type) {
      case 'respond_to_event':
        return this.eventManager.respondToEvent(
          action.params.eventId as string,
          action.params.responseId as string,
          { resources: gameState.resources }
        );
        
      case 'hire_worker':
        const citizenId = this.generateCitizen('New Worker', 25);
        const success = this.createWorker(citizenId, (action.params.roleId as string) || 'general');
        return {
          success,
          message: success ? 'New worker hired' : 'Failed to hire worker',
          effects: success ? { citizenId } : undefined
        };
        
      case 'maintain_building':
        const building = gameState.simulatedBuildings.find(b => b.id === action.params.buildingId);
        if (building && gameState.resources.coin && gameState.resources.coin >= 20) {
          const result = performMaintenance(building, gameState.gameTime, gameState.resources);
          return {
            success: result.success,
            message: result.success ? 'Building maintenance completed' : 'Maintenance failed',
            effects: { cost: result.cost, newCondition: result.newCondition }
          };
        }
        return { success: false, message: 'Insufficient resources or building not found' };
        
      case 'organize_festival':
        if (gameState.resources.coin && gameState.resources.coin >= 30) {
          this.eventManager.triggerEvent('festival', gameState.gameTime);
          return {
            success: true,
            message: 'Festival organized successfully',
            effects: { costPaid: 30 }
          };
        }
        return { success: false, message: 'Insufficient resources' };
        
      default:
        return { success: false, message: 'Unknown action type' };
    }
  }
  
  // Get system health summary
  getSystemHealth() {
    return this.eventManager.getSystemHealth();
  }
  
  // Helper methods
  private calculateThreatLevel(gameState: { resources: SimResources }): number {
    const resourceScore = Object.values(gameState.resources).reduce(
      (sum: number, val: number) => sum + (val || 0),
      0
    ) / 100;
    return Math.max(0, Math.min(100, 50 - resourceScore));
  }
  
  private getConditionValue(condition: string): number {
    switch (condition) {
      case 'excellent': return 100;
      case 'good': return 80;
      case 'fair': return 60;
      case 'poor': return 40;
      case 'critical': return 20;
      default: return 50;
    }
  }
  
  private updatePerformanceMetrics(startTime: number): void {
    const updateTime = performance.now() - startTime;
    this.performanceMetrics.totalUpdates++;
    this.performanceMetrics.averageUpdateTime = 
      (this.performanceMetrics.averageUpdateTime + updateTime) / 2;
    this.performanceMetrics.systemLoad = Math.min(100, updateTime / 16.67 * 100); // 60fps target
  }
  
  // Getters for accessing simulation data
  getCitizens(): Citizen[] {
    return this.citizenSystem.getAllCitizens();
  }
  
  getWorkers(): WorkerProfile[] {
    return this.workerSystem.getAllWorkers();
  }
  
  getActiveEvents(): ActiveEvent[] {
    return this.eventManager.getActiveEvents();
  }
  
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }
}

// Export a default instance for easy use
export const simulationSystem = new SimulationIntegrationSystem();
