import { useMemo } from 'react';
import { BUILDABLE_TILES, SIM_BUILDINGS } from '../simCatalog';
import { canAfford } from '../resourceUtils';
import type { BuildPlacementHintsResult, BuildPlacementInput, BuildPlacementHint } from './types';
import type { BuildingAvailability } from '../simCatalog';

function buildInsufficientReason(previewTypeId: keyof typeof SIM_BUILDINGS, simResources: BuildPlacementInput['simResources']) {
  if (!simResources) return undefined;
  const cost = SIM_BUILDINGS[previewTypeId]?.cost as Record<string, number> | undefined;
  if (!cost) return undefined;

  const lacking: string[] = [];
  (Object.keys(cost) as Array<keyof typeof cost>).forEach(key => {
    const required = cost[key] ?? 0;
    const current = simResources[key as keyof typeof simResources] ?? 0;
    if (required > current) {
      const shortfall = required - current;
      lacking.push(`${String(key)} ${shortfall}`);
    }
  });
  if (lacking.length === 0) return undefined;
  return `Insufficient: ${lacking.slice(0, 3).join(', ')}`;
}

function fallbackPrerequisiteReason(status: BuildingAvailability['status'], uniqueLocked: boolean): string {
  if (uniqueLocked) {
    return 'Already constructed';
  }
  const parts: string[] = [];
  if (status.missingSkills.length > 0) {
    parts.push(`Skills: ${status.missingSkills.join(', ')}`);
  }
  if (status.missingQuests.length > 0) {
    parts.push(`Quests: ${status.missingQuests.join(', ')}`);
  }
  if (status.missingEra) {
    parts.push(`Era: ${status.missingEra}`);
  }
  if (parts.length === 0) {
    return 'Locked';
  }
  return `Requires ${parts.join(' • ')}`;
}

export function useBuildPlacementHints({
  previewTypeId,
  hoverTile,
  selectedTile,
  placedBuildings,
  tutorialFree,
  simResources,
  buildingAvailability,
}: BuildPlacementInput): BuildPlacementHintsResult {
  return useMemo<BuildPlacementHintsResult>(() => {
    const highlightAllPlaceable = Boolean(
      previewTypeId && (buildingAvailability[previewTypeId]?.meetsPrerequisites ?? true),
    );
    const hasCouncil = placedBuildings.some(b => b.typeId === 'council_hall');
    const buildHint: BuildPlacementHint | undefined = (() => {
      if (!previewTypeId) return undefined;
      const tile = hoverTile || selectedTile;
      if (!tile) return undefined;

      const occupied = placedBuildings.some(b => b.x === tile.x && b.y === tile.y);
      if (occupied) return { valid: false, reason: 'Occupied' };

      const allowed = BUILDABLE_TILES[previewTypeId];
      if (allowed && tile.tileType && !allowed.includes(tile.tileType)) {
        return { valid: false, reason: 'Invalid terrain' };
      }

      const availability = buildingAvailability[previewTypeId];
      if (availability && !availability.meetsPrerequisites) {
        const reason = availability.reasons[0]
          ?? fallbackPrerequisiteReason(availability.status, availability.uniqueLocked);
        return { valid: false, reason };
      }

      const needsCouncil = previewTypeId === 'trade_post' || previewTypeId === 'automation_workshop';
      if (needsCouncil && !hasCouncil) {
        return { valid: false, reason: 'Requires Council Hall' };
      }

      const hasFree = (tutorialFree[previewTypeId] || 0) > 0;
      if (!hasFree) {
        const reason = buildInsufficientReason(previewTypeId, simResources);
        if (reason) {
          return { valid: false, reason };
        }
      }

      return { valid: true };
    })();

    const isFreeBuild = previewTypeId ? (tutorialFree[previewTypeId] || 0) > 0 : false;
    const meetsRequirements = previewTypeId ? (buildingAvailability[previewTypeId]?.meetsPrerequisites ?? true) : true;
    const affordable = previewTypeId
      ? meetsRequirements && (isFreeBuild || (simResources ? canAfford(SIM_BUILDINGS[previewTypeId].cost, simResources) : false))
      : false;

    return {
      buildHint,
      highlightAllPlaceable,
      hasCouncil,
      isFreeBuild,
      affordable,
    };
  }, [
    hoverTile,
    placedBuildings,
    previewTypeId,
    selectedTile,
    simResources,
    tutorialFree,
    buildingAvailability,
  ]);
}

export type { BuildPlacementHint } from './types';
