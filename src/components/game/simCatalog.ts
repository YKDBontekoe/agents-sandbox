import { SimResources } from './resourceUtils';

export interface SimBuildingType {
  id: string;
  name: string;
  cost: Partial<SimResources>;
  inputs: Partial<SimResources>;
  outputs: Partial<SimResources>;
}

export const SIM_BUILDINGS: Record<string, SimBuildingType> = {
  farm: { id: 'farm', name: 'Farm', cost: { coin: 20, grain: 0 }, inputs: { coin: 1 }, outputs: { grain: 10 } },
  house: { id: 'house', name: 'House', cost: { coin: 30, grain: 10 }, inputs: { grain: 1 }, outputs: { population: 5 } },
  shrine: { id: 'shrine', name: 'Shrine', cost: { coin: 25, mana: 5 }, inputs: { mana: 1 }, outputs: { favor: 2 } },
};

export const BUILDABLE_TILES: Record<keyof typeof SIM_BUILDINGS, string[]> = {
  farm: ['grass'],
  house: ['grass'],
  shrine: ['grass'],
};
