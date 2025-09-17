import { ServiceType, type Position, type ServiceBuilding } from './cityServices.types';

export class ServiceCoverageMap {
  private coverageGrid: Map<ServiceType, number[][]> = new Map();

  constructor(private readonly gridWidth: number, private readonly gridHeight: number) {
    this.reset();
  }

  reset(): void {
    Object.values(ServiceType).forEach(serviceType => {
      const grid = Array.from({ length: this.gridHeight }, () => Array(this.gridWidth).fill(0));
      this.coverageGrid.set(serviceType, grid);
    });
  }

  updateForBuilding(building: ServiceBuilding): void {
    const effectiveness = building.efficiency * (building.maxStaffing > 0 ? building.staffing / building.maxStaffing : 0);
    this.applyCoverage({
      position: building.position,
      radius: building.coverage,
      effectiveness,
      serviceType: building.serviceType
    });
  }

  rebuild(buildings: Iterable<ServiceBuilding>): void {
    this.reset();
    for (const building of buildings) {
      this.updateForBuilding(building);
    }
  }

  getCoverageAt(position: Position, serviceType: ServiceType): number {
    const grid = this.coverageGrid.get(serviceType);
    if (!grid) {
      return 0;
    }

    const x = Math.floor(position.x);
    const y = Math.floor(position.y);

    if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
      return grid[y][x];
    }

    return 0;
  }

  private applyCoverage({ position, radius, effectiveness, serviceType }: {
    position: Position;
    radius: number;
    effectiveness: number;
    serviceType: ServiceType;
  }): void {
    const grid = this.coverageGrid.get(serviceType);
    if (!grid) {
      return;
    }

    const centerX = Math.floor(position.x);
    const centerY = Math.floor(position.y);

    for (let y = Math.max(0, centerY - radius); y < Math.min(this.gridHeight, centerY + radius + 1); y++) {
      for (let x = Math.max(0, centerX - radius); x < Math.min(this.gridWidth, centerX + radius + 1); x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius) {
          const cellEffectiveness = effectiveness * (radius > 0 ? 1 - distance / radius : 0);
          grid[y][x] = Math.max(grid[y][x], cellEffectiveness);
        }
      }
    }
  }
}
