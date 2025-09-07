import type { GameTime } from '../../types/gameTime';
import type { SimulatedBuilding } from '../buildingSimulation';
import type { ZoneCell, ZoneDemand, ZoneStats, ZoneType } from './types';
import { calculateInitialDemand, updateZoneDemand } from './demand';

export class ZoneGrid {
  private zones: Map<string, ZoneCell> = new Map();
  private zoneGrid: (ZoneCell | null)[][] = [];

  constructor(private gridWidth: number, private gridHeight: number) {
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.zoneGrid = [];
    for (let x = 0; x < this.gridWidth; x++) {
      this.zoneGrid[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        this.zoneGrid[x][y] = null;
      }
    }
  }

  zoneArea(
    x1: number, y1: number,
    x2: number, y2: number,
    zoneType: ZoneType,
    density: ZoneCell['density'] = 'low'
  ): boolean {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);

    if (!this.isValidZoneArea(startX, startY, endX, endY, zoneType)) {
      return false;
    }

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        this.createZoneCell(x, y, zoneType, density);
      }
    }

    return true;
  }

  private isValidZoneArea(
    x1: number, y1: number,
    x2: number, y2: number,
    zoneType: ZoneType
  ): boolean {
    if (x1 < 0 || y1 < 0 || x2 >= this.gridWidth || y2 >= this.gridHeight) {
      return false;
    }

    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        const existingZone = this.zoneGrid[x][y];
        if (existingZone && !this.areZonesCompatible(existingZone.type, zoneType)) {
          return false;
        }
      }
    }

    return true;
  }

  private areZonesCompatible(existing: ZoneType, newType: ZoneType): boolean {
    if (existing === newType) return true;
    if (existing === 'unzoned' || newType === 'unzoned') return true;
    if (existing === 'mixed' || newType === 'mixed') return true;

    if ((existing === 'industrial' && newType === 'residential') ||
        (existing === 'residential' && newType === 'industrial')) {
      return false;
    }

    return true;
  }

  private createZoneCell(x: number, y: number, zoneType: ZoneType, density: ZoneCell['density']): void {
    const zoneId = `${x},${y}`;

    const zone: ZoneCell = {
      x,
      y,
      type: zoneType,
      density,
      level: 1,
      demand: calculateInitialDemand(zoneType, density),
      pollution: 0,
      landValue: this.calculateInitialLandValue(x, y, zoneType),
      services: {
        power: false,
        water: false,
        sewage: false,
        garbage: false,
        fire: false,
        police: false,
        healthcare: false,
        education: false
      },
      happiness: 50,
      lastUpdate: Date.now()
    };

    this.zones.set(zoneId, zone);
    this.zoneGrid[x][y] = zone;
  }

  private calculateInitialLandValue(x: number, y: number, zoneType: ZoneType): number {
    let value = 100;
    const centerX = this.gridWidth / 2;
    const centerY = this.gridHeight / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    const centerBonus = (1 - distanceFromCenter / maxDistance) * 200;

    value += centerBonus;

    const zoneModifiers = {
      residential: 1.0,
      commercial: 1.2,
      industrial: 0.8,
      office: 1.3,
      mixed: 1.1,
      special: 1.5,
      unzoned: 0.5
    } as Record<ZoneType, number>;

    value *= zoneModifiers[zoneType];

    return Math.max(10, Math.min(1000, value));
  }

  unzoneArea(x1: number, y1: number, x2: number, y2: number): void {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const zoneId = `${x},${y}`;
        this.zones.delete(zoneId);
        this.zoneGrid[x][y] = null;
      }
    }
  }

  updateZones(gameTime: GameTime, buildings: SimulatedBuilding[], demand: ZoneDemand): void {
    for (const zone of this.zones.values()) {
      this.updateZoneServices(zone, buildings);
      this.updateZonePollution(zone, buildings);
      this.updateZoneHappiness(zone);
      updateZoneDemand(zone, demand);
      this.updateZoneLevel(zone, buildings);
      zone.lastUpdate = Date.now();
    }
  }

  private updateZoneServices(zone: ZoneCell, buildings: SimulatedBuilding[]): void {
    const serviceRange = 10;

    const nearbyBuildings = buildings.filter(building => {
      const distance = Math.sqrt(
        Math.pow(building.x - zone.x, 2) + Math.pow(building.y - zone.y, 2)
      );
      return distance <= serviceRange;
    });

    Object.keys(zone.services).forEach(service => {
      zone.services[service as keyof ZoneCell['services']] = false;
    });

    for (const building of nearbyBuildings) {
      if (building.typeId.includes('power')) zone.services.power = true;
      if (building.typeId.includes('water')) zone.services.water = true;
      if (building.typeId.includes('sewage')) zone.services.sewage = true;
      if (building.typeId.includes('garbage')) zone.services.garbage = true;
      if (building.typeId.includes('fire')) zone.services.fire = true;
      if (building.typeId.includes('police')) zone.services.police = true;
      if (building.typeId.includes('hospital') || building.typeId.includes('clinic')) zone.services.healthcare = true;
      if (building.typeId.includes('school') || building.typeId.includes('university')) zone.services.education = true;
    }
  }

  private updateZonePollution(zone: ZoneCell, buildings: SimulatedBuilding[]): void {
    let pollution = 0;
    const pollutionRange = 15;

    const nearbyBuildings = buildings.filter(building => {
      const distance = Math.sqrt(
        Math.pow(building.x - zone.x, 2) + Math.pow(building.y - zone.y, 2)
      );
      return distance <= pollutionRange;
    });

    for (const building of nearbyBuildings) {
      if (this.getBuildingZoneType(building.typeId) === 'industrial') {
        const distance = Math.sqrt(
          Math.pow(building.x - zone.x, 2) + Math.pow(building.y - zone.y, 2)
        );
        const pollutionAmount = Math.max(0, 50 - distance * 3);
        pollution += pollutionAmount;
      }
    }

    zone.pollution = Math.min(100, pollution);
  }

  private updateZoneHappiness(zone: ZoneCell): void {
    let happiness = 50;
    const serviceCount = Object.values(zone.services).filter(Boolean).length;
    happiness += serviceCount * 5;
    happiness -= zone.pollution * 0.3;
    happiness += (zone.landValue / 1000) * 20;

    if (zone.type === 'residential') {
      happiness += zone.services.education ? 10 : -5;
      happiness += zone.services.healthcare ? 8 : -3;
    } else if (zone.type === 'commercial') {
      happiness += zone.services.police ? 5 : 0;
    } else if (zone.type === 'industrial') {
      happiness -= 10;
    }

    zone.happiness = Math.max(0, Math.min(100, happiness));
  }

  private updateZoneLevel(zone: ZoneCell, buildings: SimulatedBuilding[]): void {
    const buildingsInZone = buildings.filter(b =>
      Math.floor(b.x) === zone.x && Math.floor(b.y) === zone.y
    );

    if (buildingsInZone.length === 0) {
      zone.level = 1;
      return;
    }

    const avgBuildingLevel = buildingsInZone.reduce((sum, b) => sum + (b.level || 1), 0) / buildingsInZone.length;
    let targetLevel = Math.floor(avgBuildingLevel);

    if (zone.happiness > 80) targetLevel += 1;
    if (zone.demand > 50) targetLevel += 1;
    if (zone.pollution > 50) targetLevel -= 1;

    const serviceCount = Object.values(zone.services).filter(Boolean).length;
    if (serviceCount >= 6) targetLevel += 1;

    zone.level = Math.max(1, Math.min(5, targetLevel));
  }

  updateLandValues(): void {
    for (const zone of this.zones.values()) {
      let value = zone.landValue;

      const nearbyZones = this.getNearbyZones(zone.x, zone.y, 5);
      const avgNearbyValue = nearbyZones.reduce((sum, z) => sum + z.landValue, 0) / (nearbyZones.length || 1);

      value += (zone.happiness - 50) * 0.5;
      value -= zone.pollution * 0.4;
      value = (value * 0.8) + (avgNearbyValue * 0.2);

      zone.landValue = Math.max(10, Math.min(1000, value));
    }
  }

  private getNearbyZones(x: number, y: number, radius: number): ZoneCell[] {
    const nearbyZones: ZoneCell[] = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const checkX = x + dx;
        const checkY = y + dy;

        if (checkX >= 0 && checkX < this.gridWidth &&
            checkY >= 0 && checkY < this.gridHeight) {
          const zone = this.zoneGrid[checkX][checkY];
          if (zone && (dx !== 0 || dy !== 0)) {
            nearbyZones.push(zone);
          }
        }
      }
    }

    return nearbyZones;
  }

  getZoneAt(x: number, y: number): ZoneCell | null {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return null;
    }
    return this.zoneGrid[x][y];
  }

  getAllZones(): ZoneCell[] {
    return Array.from(this.zones.values());
  }

  getZonesByType(zoneType: ZoneType): ZoneCell[] {
    return Array.from(this.zones.values()).filter(zone => zone.type === zoneType);
  }

  getZoneStats(): ZoneStats {
    const zones = Array.from(this.zones.values());

    const byType: Record<ZoneType, number> = {
      residential: 0,
      commercial: 0,
      industrial: 0,
      office: 0,
      mixed: 0,
      special: 0,
      unzoned: 0
    };

    const byDensity: Record<ZoneCell['density'], number> = {
      low: 0,
      medium: 0,
      high: 0
    };

    const servicesCoverage: Record<keyof ZoneCell['services'], number> = {
      power: 0,
      water: 0,
      sewage: 0,
      garbage: 0,
      fire: 0,
      police: 0,
      healthcare: 0,
      education: 0
    };

    let totalLandValue = 0;
    let totalHappiness = 0;
    let totalPollution = 0;
    let totalLevel = 0;

    for (const zone of zones) {
      byType[zone.type]++;
      byDensity[zone.density]++;
      totalLandValue += zone.landValue;
      totalHappiness += zone.happiness;
      totalPollution += zone.pollution;
      totalLevel += zone.level;

      Object.keys(zone.services).forEach(service => {
        if (zone.services[service as keyof ZoneCell['services']]) {
          servicesCoverage[service as keyof ZoneCell['services']]++;
        }
      });
    }

    const zoneCount = zones.length;

    Object.keys(servicesCoverage).forEach(service => {
      servicesCoverage[service as keyof ZoneCell['services']] =
        zoneCount > 0 ? (servicesCoverage[service as keyof ZoneCell['services']] / zoneCount) * 100 : 0;
    });

    return {
      totalZoned: zoneCount,
      byType,
      byDensity,
      averageLandValue: zoneCount > 0 ? totalLandValue / zoneCount : 0,
      averageHappiness: zoneCount > 0 ? totalHappiness / zoneCount : 0,
      averagePollution: zoneCount > 0 ? totalPollution / zoneCount : 0,
      developmentLevel: zoneCount > 0 ? totalLevel / zoneCount : 0,
      servicesCoverage
    };
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
}
