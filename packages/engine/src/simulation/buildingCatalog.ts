export interface SimResources {
  grain: number;
  coin: number;
  mana: number;
  favor: number;
  workers: number;
  wood: number;
  planks: number;
}

export interface SimBuildingType {
  id: string;
  name: string;
  cost: Partial<SimResources>;
  inputs: Partial<SimResources>;
  outputs: Partial<SimResources>;
  /** Maximum number of workers this building can employ */
  workCapacity?: number;
  /** Maximum upgrade level (>=1). Default 3. */
  maxLevel?: number;
}

export const SIM_BUILDINGS: Record<string, SimBuildingType> = {
  council_hall: {
    id: 'council_hall',
    name: 'Council Hall',
    cost: { coin: 100, mana: 10 },
    // Base provides small favor each cycle; operates without workers
    inputs: {},
    outputs: { favor: 1 },
    workCapacity: 0,
    maxLevel: 3,
  },
  trade_post: {
    id: 'trade_post',
    name: 'Trade Post',
    cost: { coin: 60, grain: 10 },
    // Converts grain into coin passively to represent a basic trade route
    inputs: { grain: 2 },
    outputs: { coin: 8 },
    workCapacity: 0,
    maxLevel: 3,
  },
  automation_workshop: {
    id: 'automation_workshop',
    name: 'Automation Workshop',
    cost: { coin: 80, mana: 15 },
    // Spends a bit of mana to steadily generate coin (arcane mechanization)
    inputs: { mana: 1 },
    outputs: { coin: 6 },
    workCapacity: 0,
    maxLevel: 3,
  },
  farm: {
    id: 'farm',
    name: 'Farm',
    cost: { coin: 20, grain: 0 },
    inputs: { coin: 1 },
    outputs: { grain: 10 },
    workCapacity: 5,
    maxLevel: 3,
  },
  lumber_camp: {
    id: 'lumber_camp',
    name: 'Lumber Camp',
    cost: { coin: 15 },
    inputs: {},
    outputs: { wood: 8 },
    workCapacity: 4,
    maxLevel: 3,
  },
  sawmill: {
    id: 'sawmill',
    name: 'Sawmill',
    cost: { coin: 25, wood: 10 },
    inputs: { wood: 3, coin: 1 },
    outputs: { planks: 6 },
    workCapacity: 4,
    maxLevel: 3,
  },
  storehouse: {
    id: 'storehouse',
    name: 'Storehouse',
    cost: { coin: 30, planks: 10 },
    inputs: {},
    outputs: {},
    workCapacity: 0,
    maxLevel: 1,
  },
  house: {
    id: 'house',
    name: 'House',
    cost: { coin: 30, grain: 10 },
    inputs: { grain: 1 },
    outputs: { workers: 5 },
    workCapacity: 0,
    maxLevel: 3,
  },
  shrine: {
    id: 'shrine',
    name: 'Shrine',
    cost: { coin: 25, mana: 5 },
    inputs: { mana: 1 },
    outputs: { favor: 2 },
    workCapacity: 2,
    maxLevel: 3,
  },
};
