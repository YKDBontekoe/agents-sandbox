export type AnimatedCitizenType = 'worker' | 'trader' | 'citizen';
export type AnimatedVehicleType = 'cart' | 'wagon' | 'boat';
export type VehicleCargo = 'wood' | 'stone' | 'food' | 'goods' | 'tools';

export interface VisualBuilding {
  id: string;
  typeId: string;
  x: number;
  y: number;
  workers: number;
  level: number;
}

export interface AnimatedCitizen {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  type: AnimatedCitizenType;
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
  type: AnimatedVehicleType;
  cargo?: VehicleCargo;
  path?: { x: number; y: number }[];
  pathIndex?: number;
  direction?: number;
  lastDelivery?: number;
}

export interface GenerateAnimatedPopulationOptions {
  buildings: VisualBuilding[];
  citizensCount: number;
  enableTraffic?: boolean;
  maxVisibleWorkersPerBuilding?: number;
  maxRoamingCitizens?: number;
  trafficBuildingTypes?: ReadonlyArray<string>;
  now?: number;
  random?: () => number;
}

export interface AnimatedPopulation {
  citizens: AnimatedCitizen[];
  vehicles: AnimatedVehicle[];
}

const DEFAULT_MAX_VISIBLE_WORKERS = 3;
const DEFAULT_MAX_ROAMING_CITIZENS = 15;
const DEFAULT_TRAFFIC_BUILDINGS = ['trade_post', 'storehouse'];
const DEFAULT_CARGO: VehicleCargo[] = ['wood', 'stone', 'food', 'goods', 'tools'];

function getRandomIndex(length: number, random: () => number): number {
  if (length <= 0) {
    return -1;
  }

  const value = random();
  return Math.max(0, Math.min(length - 1, Math.floor(value * length)));
}

function pickRandomBuilding(
  buildings: VisualBuilding[],
  random: () => number
): VisualBuilding | undefined {
  const index = getRandomIndex(buildings.length, random);
  if (index === -1) {
    return undefined;
  }
  return buildings[index];
}

function resolveRandom(random?: () => number): () => number {
  return typeof random === 'function' ? random : Math.random;
}

function resolveNow(now?: number): number {
  return typeof now === 'number' ? now : Date.now();
}

export function generateAnimatedCitizens(
  options: GenerateAnimatedPopulationOptions
): AnimatedCitizen[] {
  const {
    buildings,
    citizensCount,
    maxVisibleWorkersPerBuilding = DEFAULT_MAX_VISIBLE_WORKERS,
    maxRoamingCitizens = DEFAULT_MAX_ROAMING_CITIZENS,
  } = options;

  if (!buildings.length) {
    return [];
  }

  const now = resolveNow(options.now);
  const random = resolveRandom(options.random);
  const citizens: AnimatedCitizen[] = [];

  buildings.forEach(building => {
    const workerCount = Math.min(Math.max(0, building.workers ?? 0), maxVisibleWorkersPerBuilding);

    for (let i = 0; i < workerCount; i += 1) {
      citizens.push({
        id: `${building.id}-worker-${i}`,
        x: building.x,
        y: building.y,
        targetX: building.x,
        targetY: building.y,
        speed: 0.015 + random() * 0.01,
        type: 'worker',
        buildingId: building.id,
        lastActivity: now + random() * 5000,
        direction: random() * Math.PI * 2,
      });
    }
  });

  const roamingCount = Math.min(Math.max(0, citizensCount), maxRoamingCitizens);

  for (let i = 0; i < roamingCount; i += 1) {
    const origin = pickRandomBuilding(buildings, random);
    if (!origin) {
      break;
    }

    citizens.push({
      id: `roaming-${i}`,
      x: origin.x,
      y: origin.y,
      targetX: origin.x,
      targetY: origin.y,
      speed: 0.01 + random() * 0.015,
      type: random() > 0.7 ? 'trader' : 'citizen',
      lastActivity: now + random() * 8000,
      direction: random() * Math.PI * 2,
    });
  }

  return citizens;
}

export function generateAnimatedVehicles(
  options: GenerateAnimatedPopulationOptions
): AnimatedVehicle[] {
  const {
    buildings,
    trafficBuildingTypes = DEFAULT_TRAFFIC_BUILDINGS,
  } = options;

  if (!options.enableTraffic) {
    return [];
  }

  const random = resolveRandom(options.random);
  const now = resolveNow(options.now);
  const vehicles: AnimatedVehicle[] = [];
  const trafficTargets = buildings.filter(building =>
    trafficBuildingTypes.includes(building.typeId)
  );

  trafficTargets.forEach((building, index) => {
    const typeIndex = index % 3;
    const vehicleType: AnimatedVehicleType = typeIndex === 0 ? 'cart' : typeIndex === 1 ? 'wagon' : 'boat';
    const cargo = DEFAULT_CARGO[getRandomIndex(DEFAULT_CARGO.length, random)];

    vehicles.push({
      id: `vehicle-${building.id}`,
      x: building.x,
      y: building.y,
      targetX: building.x,
      targetY: building.y,
      speed: 0.02 + random() * 0.015,
      type: vehicleType,
      cargo,
      lastDelivery: now + random() * 10000,
      direction: random() * Math.PI * 2,
    });
  });

  return vehicles;
}

export function generateAnimatedPopulation(
  options: GenerateAnimatedPopulationOptions
): AnimatedPopulation {
  if (!options.buildings.length) {
    return { citizens: [], vehicles: [] };
  }

  const citizens = generateAnimatedCitizens(options);
  const vehicles = generateAnimatedVehicles(options);

  return { citizens, vehicles };
}
