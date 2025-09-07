import type { SimResources } from '../index';
import {
  SimulatedBuilding,
  calculateDeterioration,
  calculateUtilityEfficiency,
  performMaintenance,
  createSimulatedBuilding
} from './buildingSimulation';
import { CitizenBehaviorSystem, Citizen } from './citizenBehavior';
import { WorkerSimulationSystem } from './workerSimulation';
import type { WorkerProfile } from './workers/types';
import {
  ActiveEvent,
  VisualIndicator,
  GameplayEventsSystem
} from './gameplayEvents';
import type { GameTime } from '../types/gameTime';
import { VisualFeedbackSystem } from './integration/visualFeedback';
import { PerformanceTracker } from './integration/performance';
import type {
  EnhancedGameState,
  VisualFeedbackConfig,
  PerformanceMetrics
} from './integration/types';

// Main simulation integration system
export class SimulationIntegrationSystem {
  // Initialize simulation systems
  private citizenSystem = new CitizenBehaviorSystem();
  private workerSystem = new WorkerSimulationSystem();
  private eventSystem = new GameplayEventsSystem();

  private visualFeedback: VisualFeedbackSystem;
  private performanceTracker: PerformanceTracker;

  constructor(config: Partial<VisualFeedbackConfig> = {}) {
    this.visualFeedback = new VisualFeedbackSystem(
      this.citizenSystem,
      this.eventSystem,
      config
    );
    this.performanceTracker = new PerformanceTracker();
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
    const startTime = performance.now();
    void _deltaTime;
    
    try {
      // Convert buildings to simulated buildings
      const simulatedBuildings = gameState.buildings.map(building => 
        createSimulatedBuilding(building, gameState.gameTime)
      );
      
      // Update building simulation
      const updatedBuildings = simulatedBuildings.map(building => {
        const newCondition = calculateDeterioration(building, gameState.gameTime);
        const efficiency = calculateUtilityEfficiency(building, gameState.resources);
        return {
          ...building,
          condition: newCondition,
          utilityEfficiency: efficiency
        };
      });
      
      // Update citizens
      const citizens = this.citizenSystem.getAllCitizens();
      citizens.forEach(citizen => {
        this.citizenSystem.updateCitizen(citizen.id, gameState.gameTime, {
          buildings: updatedBuildings,
          resources: gameState.resources,
          threatLevel: this.calculateThreatLevel(gameState),
          cityEvents: this.eventSystem.getActiveEvents().map((e: ActiveEvent) => e.type)
        });
      });
      
      // Update workers using enhanced system
      this.workerSystem.updateSystem({
        buildings: updatedBuildings,
        resources: gameState.resources,
        citizens: citizens
      }, gameState.gameTime);
      
      const workers = this.workerSystem.getAllWorkers();
      
      // Update events system
      this.eventSystem.updateEvents(gameState.gameTime, {
        buildings: updatedBuildings,
        citizens: citizens,
        workers: workers,
        resources: gameState.resources
      });
      
      // Calculate system health
      const systemHealth = this.calculateSystemHealth({
        buildings: updatedBuildings,
        citizens: citizens,
        workers: workers,
        resources: gameState.resources
      });
      
      // Update performance metrics
      this.performanceTracker.track(startTime);
      
      return {
        buildings: gameState.buildings,
        resources: gameState.resources,
        gameTime: gameState.gameTime,
        simulatedBuildings: updatedBuildings,
        citizens: citizens,
        workers: workers,
        activeEvents: this.eventSystem.getActiveEvents(),
        systemHealth
      };
      
    } catch (error) {
      console.error('Simulation update error:', error);
      // Return safe fallback state
      return {
        buildings: gameState.buildings,
        resources: gameState.resources,
        gameTime: gameState.gameTime,
        simulatedBuildings: [],
        citizens: [],
        workers: [],
        activeEvents: [],
        systemHealth: {
          economicHealth: 50,
          publicSafety: 50,
          socialCohesion: 50
        }
      };
    }
  }
  
  // Generate visual indicators for the UI
  generateVisualIndicators(gameState: EnhancedGameState): VisualIndicator[] {
    return this.visualFeedback.generateIndicators(gameState);
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
  }, gameState: EnhancedGameState): { success: boolean; message: string; effects?: unknown } {
    switch (action.type) {
      case 'respond_to_event':
        return this.eventSystem.respondToEvent(
          action.params.eventId,
          action.params.responseId,
          { resources: gameState.resources }
        );
        
      case 'hire_worker':
        const citizenId = this.generateCitizen('New Worker', 25);
        const success = this.createWorker(citizenId, action.params.roleId || 'general');
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
          this.eventSystem.triggerEvent('festival', gameState.gameTime);
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
    return this.eventSystem.getSystemHealth();
  }
  
  // Helper methods
  private calculateThreatLevel(gameState: { resources: SimResources }): number {
    const resourceScore = Object.values(gameState.resources).reduce(
      (sum: number, val: number) => sum + (val || 0),
      0
    ) / 100;
    return Math.max(0, Math.min(100, 50 - resourceScore));
  }
  
  private calculateSystemHealth(gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }) {
    const buildingHealth = gameState.buildings.length > 0 
      ? gameState.buildings.reduce((sum, b) => sum + this.getConditionValue(b.condition), 0) / gameState.buildings.length
      : 50;
    
    const communityMood = this.citizenSystem.getCommunityMood();
    const socialCohesion = communityMood.happiness;
    
    const resourceHealth = Object.values(gameState.resources).reduce(
      (sum: number, val: number) => sum + (val || 0),
      0
    ) / 4;
    
    return {
      economicHealth: Math.min(100, resourceHealth),
      publicSafety: Math.min(100, buildingHealth),
      socialCohesion: Math.min(100, socialCohesion)
    };
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
  
  // Getters for accessing simulation data
  getCitizens(): Citizen[] {
    return this.citizenSystem.getAllCitizens();
  }
  
  getWorkers(): WorkerProfile[] {
    return this.workerSystem.getAllWorkers();
  }
  
  getActiveEvents(): ActiveEvent[] {
    return this.eventSystem.getActiveEvents();
  }
  
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceTracker.getMetrics();
  }
}

// Export a default instance for easy use
export const simulationSystem = new SimulationIntegrationSystem();
