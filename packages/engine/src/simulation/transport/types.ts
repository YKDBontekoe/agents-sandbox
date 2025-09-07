import { Position } from '../cityServices';

export interface TransportStop {
  id: string;
  position: Position;
  type: TransportType;
  name: string;
  capacity: number;
  currentPassengers: number;
  waitingPassengers: Passenger[];
  connections: string[]; // IDs of connected stops
  accessibility: boolean;
  maintenanceCost: number;
  constructionCost: number;
}

export interface TransportRoute {
  id: string;
  name: string;
  type: TransportType;
  stops: string[]; // Stop IDs in order
  vehicles: TransportVehicle[];
  frequency: number; // minutes between vehicles
  operatingHours: { start: number; end: number };
  fare: number;
  capacity: number;
  currentLoad: number;
  efficiency: number;
  profitability: number;
  maintenanceCost: number;
}

export interface TransportVehicle {
  id: string;
  type: TransportType;
  routeId: string;
  currentStopIndex: number;
  nextStopIndex: number;
  position: Position;
  passengers: Passenger[];
  capacity: number;
  speed: number;
  fuel: number;
  maxFuel: number;
  condition: number; // 0-100, affects efficiency
  lastMaintenance: number;
}

export interface Passenger {
  id: string;
  citizenId: string;
  origin: string; // stop ID
  destination: string; // stop ID
  boardTime: number;
  patience: number; // decreases while waiting
  preferredRoute?: string;
  ticketType: 'single' | 'day' | 'weekly' | 'monthly';
}

export enum TransportType {
  BUS = 'bus',
  METRO = 'metro',
  TRAM = 'tram',
  TRAIN = 'train',
  FERRY = 'ferry'
}

export interface TransportDemand {
  origin: string;
  destination: string;
  timeOfDay: number;
  passengers: number;
  averageWaitTime: number;
}

export interface TransportStats {
  totalPassengers: number;
  averageWaitTime: number;
  systemEfficiency: number;
  revenue: number;
  operatingCost: number;
  profit: number;
  coverage: number; // percentage of city covered
}
