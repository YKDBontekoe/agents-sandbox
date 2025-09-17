import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildingSimulation';
import type { Citizen } from '../citizens/citizen';
import type { WorkerProfile } from '../workers/types';

export interface VisualEffectsGameState {
  buildings: SimulatedBuilding[];
  citizens: Citizen[];
  workers: WorkerProfile[];
  resources: SimResources;
}

export interface TrafficFlow {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  intensity: number;
  type: 'pedestrian' | 'goods' | 'construction' | 'emergency';
  color: string;
  speed: number;
  particles: number;
  duration: number;
}

export interface ConstructionAnimation {
  id: string;
  buildingId: string;
  position: { x: number; y: number };
  type: 'building' | 'upgrading' | 'repairing' | 'demolishing';
  progress: number;
  effects: {
    dust: boolean;
    sparks: boolean;
    machinery: boolean;
    workers: number;
  };
  duration: number;
  startTime: number;
}

export interface ActivityIndicator {
  id: string;
  position: { x: number; y: number };
  type: 'productivity' | 'happiness' | 'trade' | 'growth' | 'maintenance';
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  color: string;
  icon: string;
  animation: 'pulse' | 'bounce' | 'glow' | 'float' | 'spin';
  intensity: number;
  duration: number;
}

export interface WeatherEffect {
  id: string;
  type: 'rain' | 'snow' | 'fog' | 'wind' | 'sunshine' | 'storm';
  intensity: number;
  coverage: { x: number; y: number; width: number; height: number };
  particles: number;
  color: string;
  duration: number;
  effects: {
    visibility: number;
    movement: number;
    mood: number;
  };
}

export interface TrafficEffectsConfig {
  enabled: boolean;
  maxFlows: number;
}

export interface ConstructionEffectsConfig {
  enabled: boolean;
  maxAnimations: number;
}

export interface ActivityEffectsConfig {
  enabled: boolean;
  maxIndicators: number;
}

export interface WeatherEffectsConfig {
  enabled: boolean;
  maxConcurrent: number;
}
