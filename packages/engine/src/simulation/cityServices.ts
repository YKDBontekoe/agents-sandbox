// Position and Building interfaces
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

export class CityServicesSystem {
  private serviceBuildings: Map<string, ServiceBuilding> = new Map();
  private serviceCoverage: ServiceCoverage[] = [];
  private emergencyEvents: EmergencyEvent[] = [];
  private serviceDemand: ServiceDemand = {
    police: 0,
    fire: 0,
    healthcare: 0,
    education: 0,
    water: 0,
    power: 0,
    waste: 0,
    parks: 0
  };
  private gridWidth: number;
  private gridHeight: number;
  private coverageGrid: Map<ServiceType, number[][]> = new Map();

  constructor(gridWidth: number, gridHeight: number) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.initializeCoverageGrids();
  }

  private initializeCoverageGrids(): void {
    Object.values(ServiceType).forEach(serviceType => {
      const grid = Array(this.gridHeight).fill(null).map(() => 
        Array(this.gridWidth).fill(0)
      );
      this.coverageGrid.set(serviceType, grid);
    });
  }

  addServiceBuilding(building: ServiceBuilding): void {
    this.serviceBuildings.set(building.id, building);
    this.updateServiceCoverage(building);
  }

  removeServiceBuilding(buildingId: string): void {
    const building = this.serviceBuildings.get(buildingId);
    if (building) {
      this.serviceBuildings.delete(buildingId);
      this.recalculateAllCoverage();
    }
  }

  private updateServiceCoverage(building: ServiceBuilding): void {
    const coverage: ServiceCoverage = {
      position: building.position,
      radius: building.coverage,
      effectiveness: building.efficiency * (building.staffing / building.maxStaffing),
      serviceType: building.serviceType
    };

    this.serviceCoverage.push(coverage);
    this.updateCoverageGrid(coverage);
  }

  private updateCoverageGrid(coverage: ServiceCoverage): void {
    const grid = this.coverageGrid.get(coverage.serviceType);
    if (!grid) return;

    const centerX = Math.floor(coverage.position.x);
    const centerY = Math.floor(coverage.position.y);
    const radius = coverage.radius;

    for (let y = Math.max(0, centerY - radius); y < Math.min(this.gridHeight, centerY + radius + 1); y++) {
      for (let x = Math.max(0, centerX - radius); x < Math.min(this.gridWidth, centerX + radius + 1); x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius) {
          const effectiveness = coverage.effectiveness * (1 - distance / radius);
          grid[y][x] = Math.max(grid[y][x], effectiveness);
        }
      }
    }
  }

  private recalculateAllCoverage(): void {
    // Reset all grids
    this.initializeCoverageGrids();
    this.serviceCoverage = [];

    // Recalculate coverage for all buildings
    this.serviceBuildings.forEach(building => {
      this.updateServiceCoverage(building);
    });
  }

  getCoverageAt(position: Position, serviceType: ServiceType): number {
    const grid = this.coverageGrid.get(serviceType);
    if (!grid) return 0;

    const x = Math.floor(position.x);
    const y = Math.floor(position.y);

    if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
      return grid[y][x];
    }
    return 0;
  }

  updateDemand(buildings: Building[], population: number): void {
    // Calculate service demand based on population and buildings
    this.serviceDemand = {
      police: Math.floor(population * 0.002), // 2 per 1000 people
      fire: Math.floor(population * 0.001), // 1 per 1000 people
      healthcare: Math.floor(population * 0.003), // 3 per 1000 people
      education: Math.floor(population * 0.005), // 5 per 1000 people
      water: Math.floor(population * 1.2), // 120% of population
      power: Math.floor(population * 1.5), // 150% of population
      waste: Math.floor(population * 0.8), // 80% of population
      parks: Math.floor(population * 0.001) // 1 per 1000 people
    };

    // Adjust demand based on building types
    buildings.forEach(building => {
      if (building.typeId === 'commercial') {
        this.serviceDemand.police += 2;
        this.serviceDemand.waste += 5;
      } else if (building.typeId === 'industrial') {
        this.serviceDemand.fire += 3;
        this.serviceDemand.power += 10;
        this.serviceDemand.waste += 8;
      }
    });
  }

  spawnEmergencyEvent(type: EmergencyEvent['type'], position: Position, severity: number): void {
    const event: EmergencyEvent = {
      id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      severity,
      startTime: Date.now(),
      duration: severity * 30000, // 30 seconds per severity level
      resolved: false
    };

    this.emergencyEvents.push(event);
    this.respondToEmergency(event);
  }

  private respondToEmergency(event: EmergencyEvent): void {
    const serviceType = this.getServiceTypeForEmergency(event.type);
    const coverage = this.getCoverageAt(event.position, serviceType);
    
    // Response effectiveness based on coverage
    const responseTime = Math.max(1000, 10000 - (coverage * 8000)); // 1-10 seconds
    const effectiveness = Math.min(1, coverage * 1.2);

    setTimeout(() => {
      event.resolved = true;
      event.duration = Math.floor(event.duration * (1 - effectiveness));
    }, responseTime);
  }

  private getServiceTypeForEmergency(emergencyType: EmergencyEvent['type']): ServiceType {
    switch (emergencyType) {
      case 'fire': return ServiceType.FIRE;
      case 'crime': return ServiceType.POLICE;
      case 'medical': return ServiceType.HEALTHCARE;
      case 'accident': return ServiceType.POLICE;
      default: return ServiceType.POLICE;
    }
  }

  update(deltaTime: number): void {
    // Update service buildings
    this.serviceBuildings.forEach(building => {
      // Simulate service usage
      const demandAtLocation = this.getDemandAtLocation(building.position, building.serviceType);
      building.currentLoad = Math.min(building.capacity, demandAtLocation);
      
      // Efficiency decreases with overload
      if (building.currentLoad > building.capacity * 0.8) {
        building.efficiency = Math.max(0.5, building.efficiency - 0.001);
      } else {
        building.efficiency = Math.min(1, building.efficiency + 0.0005);
      }
    });

    // Update emergency events
    const currentTime = Date.now();
    this.emergencyEvents = this.emergencyEvents.filter(event => {
      if (event.resolved || currentTime - event.startTime > event.duration) {
        return false;
      }
      return true;
    });

    // Randomly spawn emergency events
    if (Math.random() < 0.001) { // 0.1% chance per update
      const eventTypes: EmergencyEvent['type'][] = ['fire', 'crime', 'medical', 'accident'];
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const randomPosition: Position = {
        x: Math.random() * this.gridWidth,
        y: Math.random() * this.gridHeight
      };
      const randomSeverity = Math.floor(Math.random() * 5) + 1;
      
      this.spawnEmergencyEvent(randomType, randomPosition, randomSeverity);
    }
  }

  private getDemandAtLocation(position: Position, serviceType: ServiceType): number {
    // Simple demand calculation based on service type
    const baseDemand = this.serviceDemand[serviceType] || 0;
    return Math.floor(baseDemand / Math.max(1, this.serviceBuildings.size));
  }

  getServiceStats(serviceType: ServiceType): ServiceStats {
    const buildings = Array.from(this.serviceBuildings.values())
      .filter(b => b.serviceType === serviceType);
    
    if (buildings.length === 0) {
      return { coverage: 0, satisfaction: 0, efficiency: 0, cost: 0 };
    }

    const totalCapacity = buildings.reduce((sum, b) => sum + b.capacity, 0);
    const totalDemand = this.serviceDemand[serviceType] || 0;
    const totalCost = buildings.reduce((sum, b) => sum + b.maintenanceCost, 0);
    const avgEfficiency = buildings.reduce((sum, b) => sum + b.efficiency, 0) / buildings.length;
    
    const coverage = Math.min(1, totalCapacity / Math.max(1, totalDemand));
    const satisfaction = coverage * avgEfficiency;

    return {
      coverage,
      satisfaction,
      efficiency: avgEfficiency,
      cost: totalCost
    };
  }

  getAllServiceStats(): Record<ServiceType, ServiceStats> {
    const stats: Record<ServiceType, ServiceStats> = {} as Record<ServiceType, ServiceStats>;
    
    Object.values(ServiceType).forEach(serviceType => {
      stats[serviceType] = this.getServiceStats(serviceType);
    });

    return stats;
  }

  getActiveEmergencies(): EmergencyEvent[] {
    return this.emergencyEvents.filter(event => !event.resolved);
  }

  getServiceBuildings(serviceType?: ServiceType): ServiceBuilding[] {
    const buildings = Array.from(this.serviceBuildings.values());
    return serviceType ? buildings.filter(b => b.serviceType === serviceType) : buildings;
  }
}