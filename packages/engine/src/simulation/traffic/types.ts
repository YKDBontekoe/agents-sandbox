export interface Vehicle {
  id: string;
  type: 'car' | 'truck' | 'bus' | 'emergency' | 'service';
  position: { x: number; y: number };
  destination: { x: number; y: number };
  currentPath: Array<{ x: number; y: number }>;
  pathIndex: number;
  speed: number; // current speed (0-1)
  maxSpeed: number; // maximum speed for this vehicle type
  acceleration: number;
  size: { width: number; height: number };
  priority: number; // 0-100, higher = more important (emergency vehicles)
  waitTime: number;
  fuel: number; // 0-1
  passengers: number;
  cargo: number; // 0-1
  state: 'moving' | 'waiting' | 'parked' | 'loading' | 'emergency';
  lastUpdate: number;
}

export interface Pedestrian {
  id: string;
  position: { x: number; y: number };
  destination: { x: number; y: number };
  currentPath: Array<{ x: number; y: number }>;
  pathIndex: number;
  speed: number; // current speed (0-1)
  maxSpeed: number;
  age: 'child' | 'adult' | 'elderly';
  mobility: 'walking' | 'wheelchair' | 'bicycle';
  purpose: 'work' | 'shopping' | 'leisure' | 'school' | 'home';
  waitTime: number;
  state: 'moving' | 'waiting' | 'crossing' | 'shopping';
  lastUpdate: number;
}

export interface TrafficLight {
  intersectionId: string;
  position: { x: number; y: number };
  currentState: 'red' | 'yellow' | 'green';
  timeInState: number;
  cycle: {
    red: number;
    yellow: number;
    green: number;
  };
  direction: 'north-south' | 'east-west';
}

export interface TrafficStats {
  totalVehicles: number;
  totalPedestrians: number;
  averageSpeed: number;
  congestionLevel: 'none' | 'light' | 'moderate' | 'heavy' | 'gridlock';
  averageWaitTime: number;
  accidents: number;
  emergencyResponseTime: number;
  publicTransportUsage: number;
}
