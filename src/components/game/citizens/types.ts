export interface AnimatedCitizen {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  type: 'worker' | 'trader' | 'citizen';
  buildingId?: string;
  path?: { x: number; y: number }[];
  pathIndex?: number;
  lastActivity?: number;
  direction?: number;
}

export interface AnimatedVehicle {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  type: 'cart' | 'wagon' | 'boat';
  cargo?: string;
  path?: { x: number; y: number }[];
  pathIndex?: number;
  direction?: number;
  lastDelivery?: number;
}

export interface Building {
  id: string;
  typeId: string;
  x: number;
  y: number;
  workers: number;
  level: number;
}

export interface Road {
  x: number;
  y: number;
}
