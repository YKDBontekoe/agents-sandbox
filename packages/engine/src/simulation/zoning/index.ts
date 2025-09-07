import type { GameTime } from '../../types/gameTime';
import type { SimulatedBuilding } from '../buildingSimulation';
import { ZoneGrid } from './grid';
import type { ZoneCell, ZoneDemand, ZoneStats, ZoneType } from './types';
import { initializeDemand, updateDemand, type GlobalFactors } from './demand';

export class ZoningSystem {
  private grid: ZoneGrid;
  private demand: ZoneDemand;
  private globalFactors: GlobalFactors;

  constructor(width: number, height: number) {
    this.grid = new ZoneGrid(width, height);
    this.demand = initializeDemand();
    this.globalFactors = {
      population: 0,
      employment: 0,
      economy: 100,
      pollution: 0,
      happiness: 50
    };
  }

  zoneArea(
    x1: number, y1: number,
    x2: number, y2: number,
    zoneType: ZoneType,
    density: ZoneCell['density'] = 'low'
  ): boolean {
    return this.grid.zoneArea(x1, y1, x2, y2, zoneType, density);
  }

  unzoneArea(x1: number, y1: number, x2: number, y2: number): void {
    this.grid.unzoneArea(x1, y1, x2, y2);
  }

  update(gameTime: GameTime, buildings: SimulatedBuilding[]): void {
    this.updateGlobalFactors(buildings);
    this.demand = updateDemand(this.demand, this.globalFactors);
    this.grid.updateZones(gameTime, buildings, this.demand);
    this.grid.updateLandValues();
  }

  private updateGlobalFactors(buildings: SimulatedBuilding[]): void {
    const zones = this.grid.getAllZones();
    this.globalFactors.population = buildings
      .filter(b => this.getBuildingZoneType(b.typeId) === 'residential')
      .reduce((sum, b) => sum + (b.workers || 0) * 2, 0);

    this.globalFactors.employment = buildings
      .filter(b => ['commercial', 'industrial', 'office'].includes(this.getBuildingZoneType(b.typeId)))
      .reduce((sum, b) => sum + (b.workers || 0), 0);

    this.globalFactors.pollution = zones.reduce((sum, z) => sum + z.pollution, 0) / (zones.length || 1);
    this.globalFactors.happiness = zones.reduce((sum, z) => sum + z.happiness, 0) / (zones.length || 1);

    const employmentRate = this.globalFactors.population > 0
      ? this.globalFactors.employment / this.globalFactors.population : 0;
    this.globalFactors.economy = Math.max(0, Math.min(100, employmentRate * 100 + 20));
  }

  private getBuildingZoneType(buildingTypeId: string): ZoneType {
    if (buildingTypeId.includes('house') || buildingTypeId.includes('apartment')) {
      return 'residential';
    }
    if (buildingTypeId.includes('shop') || buildingTypeId.includes('store') || buildingTypeId.includes('mall')) {
      return 'commercial';
    }
    if (buildingTypeId.includes('factory') || buildingTypeId.includes('warehouse') || buildingTypeId.includes('plant')) {
      return 'industrial';
    }
    if (buildingTypeId.includes('office') || buildingTypeId.includes('tower')) {
      return 'office';
    }
    return 'unzoned';
  }

  getZoneAt(x: number, y: number): ZoneCell | null {
    return this.grid.getZoneAt(x, y);
  }

  getAllZones(): ZoneCell[] {
    return this.grid.getAllZones();
  }

  getZonesByType(zoneType: ZoneType): ZoneCell[] {
    return this.grid.getZonesByType(zoneType);
  }

  getDemand(): ZoneDemand {
    return { ...this.demand };
  }

  getZoneStats(): ZoneStats {
    return this.grid.getZoneStats();
  }

  getGlobalFactors() {
    return { ...this.globalFactors };
  }
}

export const zoningSystem = new ZoningSystem(200, 200);

export type { ZoneType, ZoneCell, ZoneDemand, ZoneStats, ZoneRequirements } from './types';
