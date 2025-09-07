import type { GameTime } from '../types/gameTime';
import type { SimulatedBuilding } from './buildingSimulation';

export type ZoneType = 'residential' | 'commercial' | 'industrial' | 'office' | 'mixed' | 'special' | 'unzoned';

export interface ZoneCell {
  x: number;
  y: number;
  type: ZoneType;
  density: 'low' | 'medium' | 'high';
  level: number; // 1-5, represents development level
  demand: number; // -100 to 100, negative = oversupply, positive = demand
  pollution: number; // 0-100
  landValue: number; // 0-1000
  services: {
    power: boolean;
    water: boolean;
    sewage: boolean;
    garbage: boolean;
    fire: boolean;
    police: boolean;
    healthcare: boolean;
    education: boolean;
  };
  happiness: number; // 0-100
  lastUpdate: number;
}

export interface ZoneRequirements {
  minLandValue: number;
  maxPollution: number;
  requiredServices: Array<keyof ZoneCell['services']>;
  roadAccess: boolean;
  minDensity: ZoneCell['density'];
  maxDensity: ZoneCell['density'];
}

export interface ZoneDemand {
  residential: {
    low: number;
    medium: number;
    high: number;
  };
  commercial: {
    low: number;
    medium: number;
    high: number;
  };
  industrial: {
    low: number;
    medium: number;
    high: number;
  };
  office: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface ZoneStats {
  totalZoned: number;
  byType: Record<ZoneType, number>;
  byDensity: Record<ZoneCell['density'], number>;
  averageLandValue: number;
  averageHappiness: number;
  averagePollution: number;
  developmentLevel: number;
  servicesCoverage: Record<keyof ZoneCell['services'], number>;
}

export class ZoningSystem {
  private zones: Map<string, ZoneCell>;
  private zoneGrid: (ZoneCell | null)[][] = [];
  private gridWidth: number;
  private gridHeight: number;
  private demand: ZoneDemand = {
    residential: { low: 0, medium: 0, high: 0 },
    commercial: { low: 0, medium: 0, high: 0 },
    industrial: { low: 0, medium: 0, high: 0 },
    office: { low: 0, medium: 0, high: 0 }
  };
  private globalFactors: {
    population: number;
    employment: number;
    economy: number;
    pollution: number;
    happiness: number;
  };

  constructor(width: number, height: number) {
    this.zones = new Map();
    this.gridWidth = width;
    this.gridHeight = height;
    this.initializeGrid();
    this.initializeDemand();
    this.globalFactors = {
      population: 0,
      employment: 0,
      economy: 100,
      pollution: 0,
      happiness: 50
    };
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

  private initializeDemand(): void {
    this.demand = {
      residential: { low: 50, medium: 30, high: 10 },
      commercial: { low: 40, medium: 25, high: 15 },
      industrial: { low: 35, medium: 20, high: 10 },
      office: { low: 20, medium: 15, high: 5 }
    };
  }

  // Zone an area
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

    // Validate area
    if (!this.isValidZoneArea(startX, startY, endX, endY, zoneType)) {
      return false;
    }

    // Create zones
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
    // Check bounds
    if (x1 < 0 || y1 < 0 || x2 >= this.gridWidth || y2 >= this.gridHeight) {
      return false;
    }

    // Check for existing incompatible zones
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
    
    // Industrial zones are incompatible with residential
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
      demand: this.calculateInitialDemand(zoneType, density),
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

  private calculateInitialDemand(zoneType: ZoneType, density: ZoneCell['density']): number {
    const baseDemand = {
      residential: { low: 60, medium: 40, high: 20 },
      commercial: { low: 50, medium: 35, high: 25 },
      industrial: { low: 45, medium: 30, high: 15 },
      office: { low: 30, medium: 20, high: 10 },
      mixed: { low: 40, medium: 30, high: 20 },
      special: { low: 20, medium: 15, high: 10 },
      unzoned: { low: 0, medium: 0, high: 0 }
    };

    return baseDemand[zoneType][density] || 0;
  }

  private calculateInitialLandValue(x: number, y: number, zoneType: ZoneType): number {
    // Base land value calculation
    let value = 100;
    
    // Distance from city center (assuming center is at gridWidth/2, gridHeight/2)
    const centerX = this.gridWidth / 2;
    const centerY = this.gridHeight / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    const centerBonus = (1 - distanceFromCenter / maxDistance) * 200;
    
    value += centerBonus;
    
    // Zone type modifiers
    const zoneModifiers = {
      residential: 1.0,
      commercial: 1.2,
      industrial: 0.8,
      office: 1.3,
      mixed: 1.1,
      special: 1.5,
      unzoned: 0.5
    };
    
    value *= zoneModifiers[zoneType];
    
    return Math.max(10, Math.min(1000, value));
  }

  // Remove zoning
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

  // Update zoning system
  update(gameTime: GameTime, buildings: SimulatedBuilding[]): void {
    this.updateGlobalFactors(buildings);
    this.updateDemand();
    this.updateZones(gameTime, buildings);
    this.updateLandValues();
  }

  private updateGlobalFactors(buildings: SimulatedBuilding[]): void {
    // Calculate population from residential buildings
    this.globalFactors.population = buildings
      .filter(b => this.getBuildingZoneType(b.typeId) === 'residential')
      .reduce((sum, b) => sum + (b.workers || 0) * 2, 0); // Assume 2 residents per worker

    // Calculate employment from commercial/industrial/office buildings
    this.globalFactors.employment = buildings
      .filter(b => ['commercial', 'industrial', 'office'].includes(this.getBuildingZoneType(b.typeId)))
      .reduce((sum, b) => sum + (b.workers || 0), 0);

    // Calculate average pollution
    this.globalFactors.pollution = Array.from(this.zones.values())
      .reduce((sum, zone) => sum + zone.pollution, 0) / this.zones.size;

    // Calculate average happiness
    this.globalFactors.happiness = Array.from(this.zones.values())
      .reduce((sum, zone) => sum + zone.happiness, 0) / this.zones.size;

    // Economy based on employment rate
    const employmentRate = this.globalFactors.population > 0 ? 
      this.globalFactors.employment / this.globalFactors.population : 0;
    this.globalFactors.economy = Math.max(0, Math.min(100, employmentRate * 100 + 20));
  }

  private getBuildingZoneType(buildingTypeId: string): ZoneType {
    // Map building types to zone types
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

  private updateDemand(): void {
    // Update demand based on global factors
    const populationFactor = Math.min(2, this.globalFactors.population / 1000);
    const economyFactor = this.globalFactors.economy / 100;
    const happinessFactor = this.globalFactors.happiness / 100;

    // Residential demand increases with economy and happiness
    this.demand.residential.low = Math.max(0, 50 + economyFactor * 30 + happinessFactor * 20);
    this.demand.residential.medium = Math.max(0, 30 + economyFactor * 20 + happinessFactor * 15);
    this.demand.residential.high = Math.max(0, 10 + economyFactor * 15 + happinessFactor * 10);

    // Commercial demand increases with population
    this.demand.commercial.low = Math.max(0, 40 + populationFactor * 20);
    this.demand.commercial.medium = Math.max(0, 25 + populationFactor * 15);
    this.demand.commercial.high = Math.max(0, 15 + populationFactor * 10);

    // Industrial demand increases with population but decreases with happiness
    this.demand.industrial.low = Math.max(0, 35 + populationFactor * 15 - (happinessFactor - 0.5) * 20);
    this.demand.industrial.medium = Math.max(0, 20 + populationFactor * 10 - (happinessFactor - 0.5) * 15);
    this.demand.industrial.high = Math.max(0, 10 + populationFactor * 5 - (happinessFactor - 0.5) * 10);

    // Office demand increases with economy and population
    this.demand.office.low = Math.max(0, 20 + economyFactor * 25 + populationFactor * 10);
    this.demand.office.medium = Math.max(0, 15 + economyFactor * 20 + populationFactor * 8);
    this.demand.office.high = Math.max(0, 5 + economyFactor * 15 + populationFactor * 5);
  }

  private updateZones(gameTime: GameTime, buildings: SimulatedBuilding[]): void {
    for (const zone of this.zones.values()) {
      this.updateZoneServices(zone, buildings);
      this.updateZonePollution(zone, buildings);
      this.updateZoneHappiness(zone);
      this.updateZoneDemand(zone);
      this.updateZoneLevel(zone, buildings);
      zone.lastUpdate = Date.now();
    }
  }

  private updateZoneServices(zone: ZoneCell, buildings: SimulatedBuilding[]): void {
    // Check for nearby service buildings
    const serviceRange = 10; // Service coverage radius
    
    const nearbyBuildings = buildings.filter(building => {
      const distance = Math.sqrt(
        Math.pow(building.x - zone.x, 2) + Math.pow(building.y - zone.y, 2)
      );
      return distance <= serviceRange;
    });

    // Reset services
    Object.keys(zone.services).forEach(service => {
      zone.services[service as keyof ZoneCell['services']] = false;
    });

    // Check each nearby building for services
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

    // Check nearby industrial buildings for pollution
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
    let happiness = 50; // Base happiness

    // Service bonuses
    const serviceCount = Object.values(zone.services).filter(Boolean).length;
    happiness += serviceCount * 5;

    // Pollution penalty
    happiness -= zone.pollution * 0.3;

    // Land value bonus
    happiness += (zone.landValue / 1000) * 20;

    // Zone type specific modifiers
    if (zone.type === 'residential') {
      happiness += zone.services.education ? 10 : -5;
      happiness += zone.services.healthcare ? 8 : -3;
    } else if (zone.type === 'commercial') {
      happiness += zone.services.police ? 5 : 0;
    } else if (zone.type === 'industrial') {
      happiness -= 10; // Industrial areas are less happy
    }

    zone.happiness = Math.max(0, Math.min(100, happiness));
  }

  private updateZoneDemand(zone: ZoneCell): void {
    const globalDemand = this.demand[zone.type as keyof ZoneDemand];
    if (!globalDemand) {
      zone.demand = 0;
      return;
    }

    let demand = globalDemand[zone.density] || 0;

    // Modify demand based on zone conditions
    demand += (zone.happiness - 50) * 0.5;
    demand -= zone.pollution * 0.3;
    demand += (zone.landValue / 1000) * 20;

    // Service requirements
    const requiredServices = this.getRequiredServices(zone.type, zone.density);
    const servicesMet = requiredServices.filter(service => zone.services[service]).length;
    const serviceRatio = requiredServices.length > 0 ? servicesMet / requiredServices.length : 1;
    demand *= serviceRatio;

    zone.demand = Math.max(-100, Math.min(100, demand));
  }

  private getRequiredServices(zoneType: ZoneType, density: ZoneCell['density']): Array<keyof ZoneCell['services']> {
    const baseServices: Array<keyof ZoneCell['services']> = ['power', 'water'];
    
    if (density === 'medium' || density === 'high') {
      baseServices.push('sewage', 'garbage');
    }
    
    if (zoneType === 'residential') {
      baseServices.push('fire', 'police');
      if (density === 'high') {
        baseServices.push('healthcare', 'education');
      }
    } else if (zoneType === 'commercial') {
      baseServices.push('police');
    } else if (zoneType === 'industrial') {
      baseServices.push('fire');
    }
    
    return baseServices;
  }

  private updateZoneLevel(zone: ZoneCell, buildings: SimulatedBuilding[]): void {
    // Check if there are buildings in this zone
    const buildingsInZone = buildings.filter(b => 
      Math.floor(b.x) === zone.x && Math.floor(b.y) === zone.y
    );

    if (buildingsInZone.length === 0) {
      zone.level = 1;
      return;
    }

    // Calculate level based on building development and zone conditions
    const avgBuildingLevel = buildingsInZone.reduce((sum, b) => sum + (b.level || 1), 0) / buildingsInZone.length;
    
    let targetLevel = Math.floor(avgBuildingLevel);
    
    // Modify based on zone conditions
    if (zone.happiness > 80) targetLevel += 1;
    if (zone.demand > 50) targetLevel += 1;
    if (zone.pollution > 50) targetLevel -= 1;
    
    const serviceCount = Object.values(zone.services).filter(Boolean).length;
    if (serviceCount >= 6) targetLevel += 1;
    
    zone.level = Math.max(1, Math.min(5, targetLevel));
  }

  private updateLandValues(): void {
    for (const zone of this.zones.values()) {
      let value = zone.landValue;
      
      // Happiness affects land value
      value += (zone.happiness - 50) * 2;
      
      // Pollution decreases land value
      value -= zone.pollution * 3;
      
      // Services increase land value
      const serviceCount = Object.values(zone.services).filter(Boolean).length;
      value += serviceCount * 10;
      
      // Zone level affects land value
      value += (zone.level - 1) * 50;
      
      // Nearby zones affect land value
      const nearbyZones = this.getNearbyZones(zone.x, zone.y, 3);
      const avgNearbyValue = nearbyZones.length > 0 ? 
        nearbyZones.reduce((sum, z) => sum + z.landValue, 0) / nearbyZones.length : value;
      
      value = (value * 0.8) + (avgNearbyValue * 0.2); // Smooth with nearby values
      
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

  // Public methods
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

  getDemand(): ZoneDemand {
    return { ...this.demand };
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
      
      // Count services coverage
      Object.keys(zone.services).forEach(service => {
        if (zone.services[service as keyof ZoneCell['services']]) {
          servicesCoverage[service as keyof ZoneCell['services']]++;
        }
      });
    }
    
    const zoneCount = zones.length;
    
    // Calculate coverage percentages
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

  getGlobalFactors() {
    return { ...this.globalFactors };
  }
}

// Export singleton instance
export const zoningSystem = new ZoningSystem(200, 200);