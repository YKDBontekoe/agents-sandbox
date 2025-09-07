import { SIM_BUILDINGS, type SimBuildingType } from '@engine';
export { SIM_BUILDINGS };
export type { SimBuildingType };

export const BUILDABLE_TILES: Record<keyof typeof SIM_BUILDINGS, string[]> = {
  council_hall: ['grass', 'mountain'],
  trade_post: ['grass'],
  automation_workshop: ['grass'],
  farm: ['grass'],
  house: ['grass'],
  shrine: ['grass'],
  lumber_camp: ['forest'],
  sawmill: ['grass'],
  storehouse: ['grass'],
};
