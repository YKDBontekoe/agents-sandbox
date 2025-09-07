import type { SimResources } from '../index';
import type { SimulatedBuilding } from './buildingSimulation';
import type { Citizen } from './citizenBehavior';
import type { WorkerProfile } from './workerSimulation';

// Event types and their impacts
export type EventType = 
  | 'natural_disaster' 
  | 'economic_boom' 
  | 'resource_discovery' 
  | 'plague_outbreak'
  | 'trade_opportunity'
  | 'technological_breakthrough'
  | 'social_unrest'
  | 'festival'
  | 'weather_change'
  | 'migration_wave'
  | 'construction_boom'
  | 'market_day'
  | 'cultural_event'
  | 'infrastructure_upgrade';

// Event severity levels
export type EventSeverity = 'minor' | 'moderate' | 'major' | 'critical';

// Event impact categories
export interface EventImpact {
  resources: Partial<SimResources>;
  citizenMood: {
    happiness: number;
    stress: number;
    motivation: number;
  };
  buildingEffects: {
    conditionChange: number;
    efficiencyMultiplier: number;
    maintenanceCostMultiplier: number;
  };
  economicEffects: {
    wageMultiplier: number;
    tradeMultiplier: number;
    growthRate: number;
  };
  duration: number; // cycles the effect lasts
  probability: number; // chance of occurring per cycle
}

// Active event instance
export interface ActiveEvent {
  id: string;
  type: EventType;
  severity: EventSeverity;
  title: string;
  description: string;
  impact: EventImpact;
  startCycle: number;
  endCycle: number;
  isActive: boolean;
  
  // Visual and UI properties
  iconType: 'warning' | 'positive' | 'neutral' | 'critical';
  color: string;
  animationType: 'pulse' | 'shake' | 'glow' | 'bounce';
  
  // Player response options
  responses?: Array<{
    id: string;
    label: string;
    cost: Partial<SimResources>;
    effect: Partial<EventImpact>;
    description: string;
  }>;
  
  // Interconnected effects
  triggers?: Array<{
    condition: string;
    eventType: EventType;
    probability: number;
  }>;
}

// System interconnection tracking
export interface SystemState {
  population: number;
  happiness: number;
  economicHealth: number;
  infrastructure: number;
  resources: number;
  stability: number;
}

// Visual feedback indicators
export interface VisualIndicator {
  id: string;
  type: 'building_status' | 'citizen_mood' | 'resource_flow' | 'event_impact' | 'system_health';
  position: { x: number; y: number };
  value: number;
  change: number;
  color: string;
  icon: string;
  animation: string;
  duration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Event definitions with interconnected effects
const EVENT_DEFINITIONS: Record<EventType, Omit<ActiveEvent, 'id' | 'startCycle' | 'endCycle' | 'isActive'>> = {
  natural_disaster: {
    type: 'natural_disaster',
    severity: 'major',
    title: 'Natural Disaster',
    description: 'A severe storm has damaged buildings and disrupted the city.',
    impact: {
      resources: { coin: -50, planks: -20, grain: -30 },
      citizenMood: { happiness: -20, stress: 15, motivation: -10 },
      buildingEffects: { conditionChange: -2, efficiencyMultiplier: 0.7, maintenanceCostMultiplier: 1.5 },
      economicEffects: { wageMultiplier: 0.9, tradeMultiplier: 0.8, growthRate: -10 },
      duration: 10,
      probability: 0.015
    },
    iconType: 'critical',
    color: '#ff4444',
    animationType: 'shake',
    responses: [
      {
        id: 'emergency_response',
        label: 'Emergency Response',
        cost: { coin: 30, mana: 10 },
        effect: {
          citizenMood: { stress: -5, happiness: 5, motivation: 0 },
          buildingEffects: { conditionChange: 1, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 }
        },
        description: 'Deploy emergency services to minimize damage'
      },
      {
        id: 'rebuild_immediately',
        label: 'Immediate Rebuild',
        cost: { coin: 80, planks: 40 },
        effect: {
          buildingEffects: { conditionChange: 3, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 1.0 },
          economicEffects: { growthRate: 5, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
        },
        description: 'Invest heavily in rapid reconstruction'
      }
    ],
    triggers: [
      {
        condition: 'low_infrastructure',
        eventType: 'social_unrest',
        probability: 0.3
      }
    ]
  },
  
  economic_boom: {
    type: 'economic_boom',
    severity: 'moderate',
    title: 'Economic Boom',
    description: 'Trade routes flourish and prosperity spreads throughout the city.',
    impact: {
      resources: { coin: 100, mana: 20 },
      citizenMood: { happiness: 15, stress: -5, motivation: 10 },
      buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.2, maintenanceCostMultiplier: 0.9 },
      economicEffects: { wageMultiplier: 1.15, tradeMultiplier: 1.3, growthRate: 15 },
      duration: 15,
      probability: 0.008
    },
    iconType: 'positive',
    color: '#44ff44',
    animationType: 'glow',
    responses: [
      {
        id: 'invest_growth',
        label: 'Invest in Growth',
        cost: { coin: 50 },
        effect: {
          economicEffects: { growthRate: 10, wageMultiplier: 1.0, tradeMultiplier: 1.0 },
          duration: 10
        },
        description: 'Reinvest profits to sustain the boom'
      }
    ],
    triggers: [
      {
        condition: 'high_trade',
        eventType: 'trade_opportunity',
        probability: 0.4
      }
    ]
  },
  
  resource_discovery: {
    type: 'resource_discovery',
    severity: 'moderate',
    title: 'Resource Discovery',
    description: 'Explorers have found a rich deposit of valuable resources nearby.',
    impact: {
      resources: { coin: 30, planks: 50, grain: 40, mana: 15 },
      citizenMood: { happiness: 10, stress: 0, motivation: 8 },
      buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 1.0 },
      economicEffects: { wageMultiplier: 1.05, tradeMultiplier: 1.1, growthRate: 8 },
      duration: 20,
      probability: 0.018
    },
    iconType: 'positive',
    color: '#ffaa44',
    animationType: 'bounce',
    responses: [
      {
        id: 'exploit_immediately',
        label: 'Immediate Exploitation',
        cost: { coin: 20, mana: 5 },
        effect: {
          resources: { coin: 50, planks: 30 },
          duration: -5,
          citizenMood: { happiness: 0, stress: 0, motivation: 0 },
          buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
          economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 1.0, growthRate: 0 }
        },
        description: 'Extract resources quickly but unsustainably'
      },
      {
        id: 'sustainable_extraction',
        label: 'Sustainable Extraction',
        cost: { coin: 40, mana: 10 },
        effect: {
          resources: { coin: 20, planks: 20 },
          duration: 15,
          citizenMood: { happiness: 0, stress: 0, motivation: 0 },
          buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
          economicEffects: { growthRate: 5, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
        },
        description: 'Develop the resource site for long-term benefit'
      }
    ]
  },
  
  plague_outbreak: {
    type: 'plague_outbreak',
    severity: 'critical',
    title: 'Plague Outbreak',
    description: 'A contagious disease spreads through the population, affecting productivity.',
    impact: {
      resources: { coin: -30, grain: -40 },
      citizenMood: { happiness: -25, stress: 20, motivation: -15 },
      buildingEffects: { conditionChange: -1, efficiencyMultiplier: 0.6, maintenanceCostMultiplier: 1.2 },
      economicEffects: { wageMultiplier: 0.8, tradeMultiplier: 0.7, growthRate: -15 },
      duration: 12,
      probability: 0.020
    },
    iconType: 'critical',
    color: '#aa44aa',
    animationType: 'pulse',
    responses: [
      {
        id: 'quarantine',
        label: 'Implement Quarantine',
        cost: { coin: 25, mana: 15 },
        effect: {
          citizenMood: { stress: 5, happiness: -5, motivation: 0 },
          buildingEffects: { efficiencyMultiplier: 0.8, conditionChange: 0, maintenanceCostMultiplier: 1.0 },
          duration: -3
        },
        description: 'Strict isolation to contain the spread'
      },
      {
        id: 'medical_research',
        label: 'Medical Research',
        cost: { coin: 60, mana: 30 },
        effect: {
          citizenMood: { happiness: 10, stress: -10, motivation: 0 },
          buildingEffects: { efficiencyMultiplier: 0.9, conditionChange: 0, maintenanceCostMultiplier: 1.0 },
          duration: -5
        },
        description: 'Invest in finding a cure'
      }
    ],
    triggers: [
      {
        condition: 'high_population_density',
        eventType: 'social_unrest',
        probability: 0.25
      }
    ]
  },
  
  trade_opportunity: {
    type: 'trade_opportunity',
    severity: 'moderate',
    title: 'Trade Opportunity',
    description: 'Foreign merchants offer lucrative trade deals for your goods.',
    impact: {
      resources: { coin: 60 },
      citizenMood: { happiness: 8, stress: 0, motivation: 5 },
      buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 1.0 },
      economicEffects: { wageMultiplier: 1.1, tradeMultiplier: 1.25, growthRate: 10 },
      duration: 8,
      probability: 0.01
    },
    iconType: 'positive',
    color: '#4444ff',
    animationType: 'glow',
    responses: [
      {
        id: 'accept_deal',
        label: 'Accept Trade Deal',
        cost: { planks: 20, grain: 30 },
        effect: {
          resources: { coin: 80 },
          citizenMood: { happiness: 0, stress: 0, motivation: 0 },
          buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
          economicEffects: { tradeMultiplier: 1.1, wageMultiplier: 1.0, growthRate: 0 }
        },
        description: 'Trade resources for immediate profit'
      }
    ]
  },
  
  technological_breakthrough: {
    type: 'technological_breakthrough',
    severity: 'major',
    title: 'Technological Breakthrough',
    description: 'Researchers have made a significant discovery that improves efficiency.',
    impact: {
      resources: { mana: 40 },
      citizenMood: { happiness: 12, stress: 0, motivation: 15 },
      buildingEffects: { conditionChange: 1, efficiencyMultiplier: 1.25, maintenanceCostMultiplier: 0.8 },
      economicEffects: { wageMultiplier: 1.1, tradeMultiplier: 1.15, growthRate: 20 },
      duration: 25,
      probability: 0.012
    },
    iconType: 'positive',
    color: '#44ffff',
    animationType: 'glow',
    responses: [
      {
        id: 'implement_widely',
        label: 'Implement City-wide',
        cost: { coin: 100, mana: 50 },
        effect: {
          citizenMood: { happiness: 0, stress: 0, motivation: 0 },
          buildingEffects: { efficiencyMultiplier: 1.15, conditionChange: 0, maintenanceCostMultiplier: 1.0 },
          economicEffects: { growthRate: 15, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
        },
        description: 'Deploy the technology across all buildings'
      }
    ]
  },
  
  social_unrest: {
    type: 'social_unrest',
    severity: 'major',
    title: 'Social Unrest',
    description: 'Citizens are unhappy with current conditions and demand change.',
    impact: {
      resources: { coin: -40 },
      citizenMood: { happiness: -18, stress: 25, motivation: -12 },
      buildingEffects: { conditionChange: -1, efficiencyMultiplier: 0.75, maintenanceCostMultiplier: 1.3 },
      economicEffects: { wageMultiplier: 0.85, tradeMultiplier: 0.9, growthRate: -12 },
      duration: 8,
      probability: 0.015
    },
    iconType: 'warning',
    color: '#ff8844',
    animationType: 'shake',
    responses: [
      {
        id: 'address_concerns',
        label: 'Address Concerns',
        cost: { coin: 50, mana: 20 },
        effect: {
          citizenMood: { happiness: 15, stress: -10, motivation: 0 },
          buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
          economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 1.0, growthRate: 0 },
          duration: -3
        },
        description: 'Listen to citizens and implement reforms'
      },
      {
        id: 'increase_security',
        label: 'Increase Security',
        cost: { coin: 30 },
        effect: {
          citizenMood: { stress: 5, happiness: -5, motivation: 0 },
          buildingEffects: { efficiencyMultiplier: 0.9, conditionChange: 0, maintenanceCostMultiplier: 1.0 },
          economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 1.0, growthRate: 0 }
        },
        description: 'Maintain order through enforcement'
      }
    ]
  },
  
  festival: {
    type: 'festival',
    severity: 'minor',
    title: 'City Festival',
    description: 'Citizens organize a celebration that boosts morale and community spirit.',
    impact: {
      resources: { coin: -15, grain: -20 },
      citizenMood: { happiness: 20, stress: -10, motivation: 8 },
      buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.05, maintenanceCostMultiplier: 1.0 },
      economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 1.05, growthRate: 3 },
      duration: 3,
      probability: 0.015
    },
    iconType: 'positive',
    color: '#ffff44',
    animationType: 'bounce',
    responses: [
      {
        id: 'sponsor_festival',
        label: 'Sponsor Festival',
        cost: { coin: 25, grain: 15 },
        effect: {
          citizenMood: { happiness: 10, stress: 0, motivation: 0 },
          buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
          economicEffects: { growthRate: 5, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
        },
        description: 'Invest in making the festival even better'
      }
    ]
  },
  
  weather_change: {
    type: 'weather_change',
    severity: 'minor',
    title: 'Weather Change',
    description: 'Unusual weather patterns affect agricultural and construction activities.',
    impact: {
      resources: { grain: -15, planks: -10 },
      citizenMood: { happiness: -5, stress: 5, motivation: 0 },
      buildingEffects: { conditionChange: 0, efficiencyMultiplier: 0.9, maintenanceCostMultiplier: 1.1 },
      economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 0.95, growthRate: -2 },
      duration: 5,
      probability: 0.02
    },
    iconType: 'neutral',
    color: '#888888',
    animationType: 'pulse'
  },
  
  migration_wave: {
    type: 'migration_wave',
    severity: 'moderate',
    title: 'Migration Wave',
    description: 'New settlers arrive seeking opportunities, increasing population and demand.',
    impact: {
      resources: { coin: 20, grain: -25 },
      citizenMood: { happiness: 5, stress: 8, motivation: 5 },
      buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 1.1 },
      economicEffects: { wageMultiplier: 0.95, tradeMultiplier: 1.1, growthRate: 8 },
      duration: 12,
      probability: 0.008
    },
    iconType: 'neutral',
    color: '#44aa88',
    animationType: 'bounce',
    responses: [
      {
        id: 'welcome_migrants',
        label: 'Welcome Migrants',
        cost: { coin: 30, grain: 20 },
        effect: {
          citizenMood: { happiness: 8, stress: 0, motivation: 0 },
          buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
          economicEffects: { growthRate: 5, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
        },
        description: 'Provide support for new arrivals'
      },
      {
        id: 'restrict_immigration',
        label: 'Restrict Immigration',
        cost: { coin: 15 },
        effect: {
          citizenMood: { happiness: -3, stress: -5, motivation: 0 },
          buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
          economicEffects: { growthRate: -3, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
        },
        description: 'Limit new arrivals to reduce strain'
      }
    ]
  },

  construction_boom: {
    type: 'construction_boom',
    severity: 'moderate',
    title: 'Construction Boom',
    description: 'A surge in construction activity accelerates city development.',
    impact: {
      resources: { coin: -30, planks: -40 },
      citizenMood: { happiness: 8, stress: 5, motivation: 12 },
      buildingEffects: { conditionChange: 2, efficiencyMultiplier: 1.15, maintenanceCostMultiplier: 0.85 },
      economicEffects: { wageMultiplier: 1.1, tradeMultiplier: 1.05, growthRate: 25 },
      duration: 8,
      probability: 0.025
    },
    iconType: 'positive',
    color: '#ff8800',
    animationType: 'bounce',
    responses: [
      {
        id: 'accelerate_construction',
        label: 'Accelerate Construction',
        cost: { coin: 50, planks: 30 },
        effect: {
          buildingEffects: { conditionChange: 1, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 1.0 },
          economicEffects: { growthRate: 15, wageMultiplier: 1.0, tradeMultiplier: 1.0 },
          duration: 5
        },
        description: 'Invest more resources to speed up construction'
      }
    ]
  },

  market_day: {
    type: 'market_day',
    severity: 'minor',
    title: 'Market Day',
    description: 'Weekly market brings increased trade and citizen activity.',
    impact: {
      resources: { coin: 25, grain: -10 },
      citizenMood: { happiness: 12, stress: -3, motivation: 6 },
      buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.08, maintenanceCostMultiplier: 1.0 },
      economicEffects: { wageMultiplier: 1.05, tradeMultiplier: 1.2, growthRate: 5 },
      duration: 2,
      probability: 0.050
    },
    iconType: 'positive',
    color: '#00aa44',
    animationType: 'glow',
    responses: [
      {
        id: 'expand_market',
        label: 'Expand Market',
        cost: { coin: 20, planks: 15 },
        effect: {
          citizenMood: { happiness: 5, stress: 0, motivation: 0 },
          economicEffects: { tradeMultiplier: 1.1, wageMultiplier: 1.0, growthRate: 3 },
          duration: 3
        },
        description: 'Invest in market infrastructure for lasting benefits'
      }
    ]
  },

  cultural_event: {
    type: 'cultural_event',
    severity: 'minor',
    title: 'Cultural Event',
    description: 'Artists and performers create vibrant cultural activities.',
    impact: {
      resources: { coin: -5, mana: 10 },
      citizenMood: { happiness: 18, stress: -8, motivation: 10 },
      buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.05, maintenanceCostMultiplier: 1.0 },
      economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 1.08, growthRate: 4 },
      duration: 4,
      probability: 0.035
    },
    iconType: 'positive',
    color: '#aa44ff',
    animationType: 'pulse',
    responses: [
      {
        id: 'support_arts',
        label: 'Support Arts',
        cost: { coin: 15, mana: 5 },
        effect: {
          citizenMood: { happiness: 8, stress: 0, motivation: 5 },
          buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
          duration: 6
        },
        description: 'Fund cultural programs for extended benefits'
      }
    ]
  },

  infrastructure_upgrade: {
    type: 'infrastructure_upgrade',
    severity: 'moderate',
    title: 'Infrastructure Upgrade',
    description: 'City systems receive improvements that boost overall efficiency.',
    impact: {
      resources: { coin: -40, mana: -15 },
      citizenMood: { happiness: 10, stress: -5, motivation: 8 },
      buildingEffects: { conditionChange: 1, efficiencyMultiplier: 1.2, maintenanceCostMultiplier: 0.9 },
      economicEffects: { wageMultiplier: 1.05, tradeMultiplier: 1.1, growthRate: 12 },
      duration: 20,
      probability: 0.015
    },
    iconType: 'positive',
    color: '#4488ff',
    animationType: 'glow',
    responses: [
      {
        id: 'comprehensive_upgrade',
        label: 'Comprehensive Upgrade',
        cost: { coin: 80, mana: 30 },
        effect: {
          buildingEffects: { conditionChange: 2, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 0.95 },
          economicEffects: { growthRate: 8, wageMultiplier: 1.0, tradeMultiplier: 1.0 },
          duration: 15
        },
        description: 'Invest heavily in city-wide improvements'
      }
    ]
  }
};

// Gameplay events system};  

// Local GameTime interface to avoid import issues
interface GameTime {
  totalMinutes: number;
  day: number;
  hour: number;
  minute: number;
  season: string;
}

export class GameplayEventsSystem {
  private activeEvents: Map<string, ActiveEvent> = new Map();
  private eventHistory: ActiveEvent[] = [];
  private visualIndicators: Map<string, VisualIndicator> = new Map();
  private systemState: SystemState = {
    population: 0,
    happiness: 50,
    economicHealth: 50,
    infrastructure: 50,
    resources: 50,
    stability: 50
  };
  private eventIdCounter = 0;

  // Update events system each cycle
  updateEvents(gameTime: GameTime, gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }): void {
    // Convert GameTime to cycle for internal use
    const currentCycle = Math.floor(gameTime.totalMinutes / 60); // 1 cycle per hour
    
    // Update system state
    this.updateSystemState(gameState);
    
    // Process active events
    this.processActiveEvents(gameTime);
    
    // Check for new events
    this.checkForNewEvents(gameTime, gameState);
  
  // Update visual indicators
  this.updateVisualIndicators(gameTime);
  
    // Check for interconnected effects
    this.processInterconnectedEffects(gameTime);
  }

  // Update system state based on game conditions
  private updateSystemState(gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }): void {
    // Population
    this.systemState.population = gameState.citizens.length;
    
    // Happiness (average citizen mood)
    const totalHappiness = gameState.citizens.reduce((sum, c) => sum + c.mood.happiness, 0);
    this.systemState.happiness = gameState.citizens.length > 0 ? totalHappiness / gameState.citizens.length : 50;
    
    // Economic health (based on resources and worker satisfaction)
    const resourceScore = Math.min(100, (gameState.resources.coin || 0) / 2);
    const workerSatisfaction = gameState.workers.length > 0 ? 
      gameState.workers.reduce((sum, w) => sum + w.jobSatisfaction, 0) / gameState.workers.length : 50;
    this.systemState.economicHealth = (resourceScore + workerSatisfaction) / 2;
    
    // Infrastructure (average building condition)
    const conditionValues = { excellent: 100, good: 80, fair: 60, poor: 40, critical: 20 };
    const avgCondition = gameState.buildings.length > 0 ?
      gameState.buildings.reduce((sum, b) => sum + conditionValues[b.condition], 0) / gameState.buildings.length : 50;
    this.systemState.infrastructure = avgCondition;
    
    // Resources (normalized resource availability)
    const totalResources = (gameState.resources.coin || 0) + 
                          (gameState.resources.grain || 0) + 
                          (gameState.resources.planks || 0) + 
                          (gameState.resources.mana || 0);
    this.systemState.resources = Math.min(100, totalResources / 5);
    
    // Stability (inverse of stress and unrest)
    const avgStress = gameState.citizens.length > 0 ?
      gameState.citizens.reduce((sum, c) => sum + c.mood.stress, 0) / gameState.citizens.length : 30;
    this.systemState.stability = Math.max(0, 100 - avgStress);
  }

  // Process currently active events
  private processActiveEvents(gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    for (const [eventId, event] of this.activeEvents) {
      if (currentCycle >= event.endCycle) {
        // Event has ended
        event.isActive = false;
        this.eventHistory.push(event);
        this.activeEvents.delete(eventId);
        
        // Create visual indicator for event end
        this.createVisualIndicator({
          type: 'event_impact',
          position: { x: 0, y: 0 },
          value: 0,
          change: -1,
          color: event.color,
          icon: 'event_end',
          animation: 'fade_out',
          duration: 3,
          priority: 'medium'
        });
      }
    }
  }

  // Check for new random events
  private checkForNewEvents(gameTime: GameTime, gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }): void {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    for (const [eventType, eventDef] of Object.entries(EVENT_DEFINITIONS)) {
      // Adjust probability based on system state
      let adjustedProbability = eventDef.impact.probability;
      
      // System state influences event probability
      switch (eventType as EventType) {
        case 'social_unrest':
          if (this.systemState.happiness < 40) adjustedProbability *= 2;
          if (this.systemState.stability < 30) adjustedProbability *= 1.5;
          break;
        case 'plague_outbreak':
          if (this.systemState.population > 50) adjustedProbability *= 1.3;
          if (this.systemState.infrastructure < 40) adjustedProbability *= 1.2;
          break;
        case 'economic_boom':
          if (this.systemState.economicHealth > 70) adjustedProbability *= 1.5;
          break;
        case 'technological_breakthrough':
          if (this.systemState.resources > 60) adjustedProbability *= 1.2;
          break;
      }
      
      // Check if event should trigger
      if (Math.random() < adjustedProbability) {
        this.triggerEvent(eventType as EventType, gameTime);
      }
    }
  }

  // Trigger a specific event
  triggerEvent(eventType: EventType, gameTime: GameTime): string {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60); // Convert GameTime to cycle
    const eventDef = EVENT_DEFINITIONS[eventType];
    const eventId = `event_${this.eventIdCounter++}`;
    
    const event: ActiveEvent = {
      id: eventId,
      ...eventDef,
      startCycle: currentCycle,
      endCycle: currentCycle + eventDef.impact.duration,
      isActive: true
    };
    
    this.activeEvents.set(eventId, event);
    
    // Create visual indicator
    this.createVisualIndicator({
      type: 'event_impact',
      position: { x: 0, y: 0 },
      value: this.getEventImpactScore(event),
      change: 1,
      color: event.color,
      icon: event.type,
      animation: event.animationType,
      duration: 5,
      priority: event.severity === 'critical' ? 'critical' : 
               event.severity === 'major' ? 'high' : 'medium'
    });
    
    return eventId;
  }

  // Process interconnected effects between systems
  private processInterconnectedEffects(gameTime: GameTime): void {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    for (const event of this.activeEvents.values()) {
      if (event.triggers) {
        for (const trigger of event.triggers) {
          if (this.checkTriggerCondition(trigger.condition) && 
              Math.random() < trigger.probability) {
            this.triggerEvent(trigger.eventType, gameTime);
          }
        }
      }
    }
  }

  // Check if trigger condition is met
  private checkTriggerCondition(condition: string): boolean {
    switch (condition) {
      case 'low_infrastructure':
        return this.systemState.infrastructure < 40;
      case 'high_trade':
        return this.systemState.economicHealth > 70;
      case 'high_population_density':
        return this.systemState.population > 40;
      default:
        return false;
    }
  }

  // Update visual indicators
  private updateVisualIndicators(gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    const toRemove: string[] = [];
    
    for (const [id, indicator] of this.visualIndicators) {
      indicator.duration--;
      if (indicator.duration <= 0) {
        toRemove.push(id);
      }
    }
    
    toRemove.forEach(id => this.visualIndicators.delete(id));
  }

  // Create visual indicator
  private createVisualIndicator(params: Omit<VisualIndicator, 'id'>): string {
    const id = `indicator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const indicator: VisualIndicator = { id, ...params };
    this.visualIndicators.set(id, indicator);
    return id;
  }

  // Calculate event impact score for visual feedback
  private getEventImpactScore(event: ActiveEvent): number {
    const resourceImpact = Object.values(event.impact.resources).reduce((sum, val) => sum + Math.abs(val || 0), 0);
    const moodImpact = Math.abs(event.impact.citizenMood.happiness) + 
                      Math.abs(event.impact.citizenMood.stress) + 
                      Math.abs(event.impact.citizenMood.motivation);
    const economicImpact = Math.abs((event.impact.economicEffects.growthRate || 0) * 2);
    
    return Math.min(100, (resourceImpact / 10) + moodImpact + economicImpact);
  }

  // Apply event effects to game state
  applyEventEffects(gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }): {
    resourceChanges: Partial<SimResources>;
    buildingEffects: Array<{ buildingId: string; effects: any }>;
    citizenEffects: Array<{ citizenId: string; effects: any }>;
  } {
    const resourceChanges: Partial<SimResources> = {};
    const buildingEffects: Array<{ buildingId: string; effects: any }> = [];
    const citizenEffects: Array<{ citizenId: string; effects: any }> = [];
    
    for (const event of this.activeEvents.values()) {
      // Apply resource changes
      for (const [resource, amount] of Object.entries(event.impact.resources)) {
        resourceChanges[resource as keyof SimResources] = 
          (resourceChanges[resource as keyof SimResources] || 0) + (amount || 0);
      }
      
      // Apply building effects
      for (const building of gameState.buildings) {
        buildingEffects.push({
          buildingId: building.id,
          effects: {
            conditionChange: event.impact.buildingEffects.conditionChange,
            efficiencyMultiplier: event.impact.buildingEffects.efficiencyMultiplier,
            maintenanceCostMultiplier: event.impact.buildingEffects.maintenanceCostMultiplier
          }
        });
      }
      
      // Apply citizen mood effects
      for (const citizen of gameState.citizens) {
        citizenEffects.push({
          citizenId: citizen.id,
          effects: {
            happinessChange: event.impact.citizenMood.happiness,
            stressChange: event.impact.citizenMood.stress,
            motivationChange: event.impact.citizenMood.motivation
          }
        });
      }
    }
    
    return { resourceChanges, buildingEffects, citizenEffects };
  }

  // Handle player response to event
  respondToEvent(eventId: string, responseId: string, gameState: {
    resources: SimResources;
  }): { success: boolean; message: string; effects?: any } {
    const event = this.activeEvents.get(eventId);
    if (!event || !event.responses) {
      return { success: false, message: 'Event not found or no responses available' };
    }
    
    const response = event.responses.find(r => r.id === responseId);
    if (!response) {
      return { success: false, message: 'Response option not found' };
    }
    
    // Check if player can afford the response
    for (const [resource, cost] of Object.entries(response.cost)) {
      if ((gameState.resources[resource as keyof SimResources] || 0) < (cost || 0)) {
        return { success: false, message: `Insufficient ${resource}` };
      }
    }
    
    // Apply response effects
    if (response.effect) {
      // Modify the event's impact
      if (response.effect.citizenMood) {
        event.impact.citizenMood.happiness += response.effect.citizenMood.happiness || 0;
        event.impact.citizenMood.stress += response.effect.citizenMood.stress || 0;
        event.impact.citizenMood.motivation += response.effect.citizenMood.motivation || 0;
      }
      
      if (response.effect.buildingEffects) {
        event.impact.buildingEffects.conditionChange += response.effect.buildingEffects.conditionChange || 0;
        event.impact.buildingEffects.efficiencyMultiplier *= response.effect.buildingEffects.efficiencyMultiplier || 1;
      }
      
      if (response.effect.duration) {
        event.endCycle += response.effect.duration;
      }
    }
    
    return {
      success: true,
      message: `Response applied: ${response.description}`,
      effects: response.effect
    };
  }

  // Get current system health for UI display
  getSystemHealth(): SystemState & {
    overallHealth: number;
    criticalIssues: string[];
    recommendations: string[];
  } {
    const overallHealth = (
      this.systemState.happiness +
      this.systemState.economicHealth +
      this.systemState.infrastructure +
      this.systemState.stability
    ) / 4;
    
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    
    if (this.systemState.happiness < 30) {
      criticalIssues.push('Low citizen happiness');
      recommendations.push('Address citizen needs and concerns');
    }
    
    if (this.systemState.infrastructure < 40) {
      criticalIssues.push('Poor infrastructure condition');
      recommendations.push('Invest in building maintenance and upgrades');
    }
    
    if (this.systemState.economicHealth < 35) {
      criticalIssues.push('Economic instability');
      recommendations.push('Focus on resource generation and trade');
    }
    
    if (this.systemState.stability < 40) {
      criticalIssues.push('Social instability');
      recommendations.push('Reduce citizen stress and improve living conditions');
    }
    
    return {
      ...this.systemState,
      overallHealth,
      criticalIssues,
      recommendations
    };
  }

  // Public getters
  getActiveEvents(): ActiveEvent[] {
    return Array.from(this.activeEvents.values());
  }

  getEventHistory(): ActiveEvent[] {
    return [...this.eventHistory];
  }

  getVisualIndicators(): VisualIndicator[] {
    return Array.from(this.visualIndicators.values());
  }

  getSystemState(): SystemState {
    return { ...this.systemState };
  }
}