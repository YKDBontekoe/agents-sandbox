import * as PIXI from "pixi.js";

export interface TrafficFlow {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  intensity: number; // 0-1
  type: 'pedestrian' | 'goods' | 'construction' | 'emergency';
  color: number;
  speed: number;
  particles: PIXI.Graphics[];
  duration: number;
  startTime: number;
}

export interface ConstructionAnimation {
  id: string;
  buildingId: string;
  position: { x: number; y: number };
  type: 'building' | 'upgrading' | 'repairing' | 'demolishing';
  progress: number; // 0-1
  effects: {
    dust: PIXI.Graphics[];
    sparks: PIXI.Graphics[];
    machinery: PIXI.Graphics | null;
    workers: PIXI.Graphics[];
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
  color: number;
  icon: PIXI.Graphics;
  animation: 'pulse' | 'bounce' | 'glow' | 'float' | 'spin';
  intensity: number; // 0-1
  duration: number;
  startTime: number;
}

export interface DayNightCycle {
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  hour: number;
  minute: number;
  lightingIntensity: number; // 0-1
  ambientColor: number;
  shadowLength: number;
}
