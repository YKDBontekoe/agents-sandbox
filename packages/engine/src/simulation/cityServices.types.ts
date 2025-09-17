export interface Position {
  x: number;
  y: number;
}

export interface Building {
  id: string;
  typeId: string;
  position: Position;
  x: number;
  y: number;
}

export enum ServiceType {
  POLICE = 'police',
  FIRE = 'fire',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  WATER = 'water',
  POWER = 'power',
  WASTE = 'waste',
  PARKS = 'parks'
}

export interface ServiceBuilding extends Building {
  serviceType: ServiceType;
  capacity: number;
  currentLoad: number;
  efficiency: number;
  coverage: number;
  maintenanceCost: number;
  staffing: number;
  maxStaffing: number;
}

export interface ServiceCoverage {
  position: Position;
  radius: number;
  effectiveness: number;
  serviceType: ServiceType;
}

export interface ServiceDemand {
  police: number;
  fire: number;
  healthcare: number;
  education: number;
  water: number;
  power: number;
  waste: number;
  parks: number;
}

export interface ServiceStats {
  coverage: number;
  satisfaction: number;
  efficiency: number;
  cost: number;
}

export interface EmergencyEvent {
  id: string;
  type: 'fire' | 'crime' | 'medical' | 'accident';
  position: Position;
  severity: number;
  startTime: number;
  duration: number;
  resolved: boolean;
}
