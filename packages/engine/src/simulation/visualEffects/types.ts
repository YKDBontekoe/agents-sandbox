import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildingSimulation';
import type { Citizen } from '../citizenBehavior';
import type { WorkerProfile } from '../workers/types';

export interface TrafficFlow {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  intensity: number; // 0-1
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
  progress: number; // 0-1
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
  intensity: number; // 0-1
  duration: number;
}

export interface WeatherEffect {
  id: string;
  type: 'rain' | 'snow' | 'fog' | 'wind' | 'sunshine' | 'storm';
  intensity: number; // 0-1
  coverage: { x: number; y: number; width: number; height: number };
  particles: number;
  color: string;
  duration: number;
  effects: {
    visibility: number; // 0-1
    movement: number; // speed modifier
    mood: number; // citizen mood modifier
  };
}

export interface EffectGameState {
  buildings: SimulatedBuilding[];
  citizens: Citizen[];
  workers: WorkerProfile[];
  resources: SimResources;
}
