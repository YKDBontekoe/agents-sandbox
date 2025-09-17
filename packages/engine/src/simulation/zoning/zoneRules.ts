import type { ZoneType } from './types';

export interface GridSize {
  width: number;
  height: number;
}

const zoneLandValueModifiers: Record<ZoneType, number> = {
  residential: 1.0,
  commercial: 1.2,
  industrial: 0.8,
  office: 1.3,
  mixed: 1.1,
  special: 1.5,
  unzoned: 0.5
};

export function areZonesCompatible(existing: ZoneType, target: ZoneType): boolean {
  if (existing === target) return true;
  if (existing === 'unzoned' || target === 'unzoned') return true;
  if (existing === 'mixed' || target === 'mixed') return true;

  const isIndustrialResidentialPair =
    (existing === 'industrial' && target === 'residential') ||
    (existing === 'residential' && target === 'industrial');

  if (isIndustrialResidentialPair) {
    return false;
  }

  return true;
}

export function calculateInitialLandValue(
  x: number,
  y: number,
  zoneType: ZoneType,
  gridSize: GridSize
): number {
  const centerX = gridSize.width / 2;
  const centerY = gridSize.height / 2;
  const distanceFromCenter = Math.sqrt(
    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
  );
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
  const centerBonus = maxDistance === 0 ? 0 : (1 - distanceFromCenter / maxDistance) * 200;

  const baseValue = 100 + centerBonus;
  const modifier = zoneLandValueModifiers[zoneType];
  const value = baseValue * modifier;

  return Math.max(10, Math.min(1000, value));
}

export function inferZoneTypeFromBuilding(buildingTypeId: string): ZoneType {
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
