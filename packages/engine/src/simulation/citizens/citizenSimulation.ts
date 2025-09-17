export type CitizenActivity =
  | "CommuteToWork"
  | "Work"
  | "CommuteToShop"
  | "Shop"
  | "CommuteHome"
  | "Sleep";

export interface CitizenBuildingRef {
  id: string;
  typeId: string;
  x: number;
  y: number;
  workers?: number;
}

export interface SimulationCitizen {
  x: number;
  y: number;
  tx: number;
  ty: number;
  path: Array<{ x: number; y: number }>;
  carrying: string | null;
  speed: number;
  name: string;
  role: "Hauler" | "Builder";
  homeX: number;
  homeY: number;
  workX: number;
  workY: number;
  workId?: string;
  shopX: number;
  shopY: number;
  activity: CitizenActivity;
  nextDecisionHour: number;
  baseWorldY: number;
  wanderCooldown: number;
  lastDist: number;
  stuckFor: number;
  repathCooldown: number;
  delivered?: "wood" | "planks" | "grain";
}

export interface CitizenSpawnOptions {
  houses: CitizenBuildingRef[];
  storehouses: CitizenBuildingRef[];
  producers: CitizenBuildingRef[];
  leisureSpots: CitizenBuildingRef[];
  rng: () => number;
  citizensCount?: number;
  producerWeights?: Map<string, number>;
  names?: string[];
  globalHomeFallback?: CitizenBuildingRef;
}

export interface DayCycleResult {
  clockSeconds: number;
  hourOfDay: number;
}

export const DEFAULT_GLOBAL_HOME: CitizenBuildingRef = {
  id: "global",
  typeId: "none",
  x: 10,
  y: 10,
};

export const DEFAULT_CITIZEN_NAMES = [
  "Ava",
  "Bran",
  "Caro",
  "Dane",
  "Eira",
  "Finn",
  "Gale",
  "Hale",
  "Iris",
  "Joss",
  "Kade",
  "Lena",
  "Milo",
  "Nora",
  "Oren",
  "Pia",
  "Quin",
  "Rhea",
  "Seth",
  "Tara",
];

const MAX_CITIZENS = 20;
const MIN_CITIZENS = 2;
const RNG_MODULUS = 2147483647;
const RNG_MULTIPLIER = 48271;

export const createCitizenRng = (seed?: number) => {
  const normalizedSeed =
    Math.abs(Number(seed ?? 1337)) % RNG_MODULUS || 1337;
  let state = normalizedSeed;
  return () => {
    state = (state * RNG_MULTIPLIER) % RNG_MODULUS;
    return state / RNG_MODULUS;
  };
};

export const buildProducerWeightMap = (
  producers: CitizenBuildingRef[]
) => {
  const map = new Map<string, number>();
  producers.forEach((producer) => {
    const weight = 0.5 + Math.max(0, producer.workers ?? 0);
    map.set(producer.id, weight);
  });
  return map;
};

export const selectWorkDestination = (
  producers: CitizenBuildingRef[],
  producerWeights: Map<string, number>,
  rand: () => number,
  fallback: CitizenBuildingRef
): CitizenBuildingRef => {
  if (producers.length === 0) return fallback;
  const totalWeight = producers.reduce((sum, producer) => {
    return sum + (producerWeights.get(producer.id) ?? 1);
  }, 0);
  let roll = rand() * (totalWeight || 1);
  for (const producer of producers) {
    roll -= producerWeights.get(producer.id) ?? 1;
    if (roll <= 0) return producer;
  }
  return producers[0];
};

export const selectLeisureDestination = (
  leisureSpots: CitizenBuildingRef[],
  producers: CitizenBuildingRef[],
  fallback: CitizenBuildingRef
): CitizenBuildingRef => {
  return (
    leisureSpots[0] ||
    producers.find((producer) => producer.typeId === "trade_post") ||
    fallback
  );
};

const resolveGlobalHome = (
  houses: CitizenBuildingRef[],
  storehouses: CitizenBuildingRef[],
  producers: CitizenBuildingRef[],
  fallback: CitizenBuildingRef
) => {
  return houses[0] || storehouses[0] || producers[0] || fallback;
};

const resolveCitizenCount = (
  houses: CitizenBuildingRef[],
  explicitCount?: number
) => {
  if (typeof explicitCount === "number") {
    return Math.min(MAX_CITIZENS, Math.max(MIN_CITIZENS, Math.floor(explicitCount)));
  }
  const inferred = houses.length * 2 || 6;
  return Math.min(
    MAX_CITIZENS,
    Math.max(MIN_CITIZENS, Math.floor(inferred))
  );
};

export const advanceDayCycle = (
  currentClockSeconds: number,
  deltaMs: number,
  dayLengthSeconds: number
): DayCycleResult => {
  const normalizedLength = Math.max(1, dayLengthSeconds);
  const nextClock =
    (currentClockSeconds + deltaMs / 1000) % normalizedLength;
  const hourOfDay = (nextClock / normalizedLength) * 24.0;
  return { clockSeconds: nextClock, hourOfDay };
};

export const spawnCitizens = ({
  houses,
  storehouses,
  producers,
  leisureSpots,
  rng,
  citizensCount,
  producerWeights,
  names = DEFAULT_CITIZEN_NAMES,
  globalHomeFallback = DEFAULT_GLOBAL_HOME,
}: CitizenSpawnOptions): SimulationCitizen[] => {
  const weights = producerWeights ?? buildProducerWeightMap(producers);
  const globalHome = resolveGlobalHome(
    houses,
    storehouses,
    producers,
    globalHomeFallback
  );
  const count = resolveCitizenCount(houses, citizensCount);
  const out: SimulationCitizen[] = [];
  const houseCount = Math.max(1, houses.length);

  for (let i = 0; i < count; i += 1) {
    const home = houses[i % houseCount] ?? globalHome;
    const work = selectWorkDestination(producers, weights, rng, globalHome);
    const shop = selectLeisureDestination(leisureSpots, producers, globalHome);
    const nameRoot = names[Math.floor(rng() * names.length)] ?? names[0];
    const citizenName = `${nameRoot}-${Math.floor(10 + rng() * 89)}`;

    out.push({
      x: home.x,
      y: home.y,
      tx: home.x,
      ty: home.y,
      path: [],
      carrying: null,
      speed: 0.014 + rng() * 0.012,
      name: citizenName,
      role: "Hauler",
      homeX: home.x,
      homeY: home.y,
      workX: work.x,
      workY: work.y,
      workId: work.id,
      shopX: shop.x,
      shopY: shop.y,
      activity: "Sleep",
      nextDecisionHour: -1,
      baseWorldY: 0,
      wanderCooldown: 0,
      lastDist: Infinity,
      stuckFor: 0,
      repathCooldown: 0,
    });
  }

  return out;
};
