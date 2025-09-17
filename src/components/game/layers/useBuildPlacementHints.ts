import { useMemo } from 'react';
import { BUILDABLE_TILES, SIM_BUILDINGS } from '../simCatalog';
import { canAfford } from '../resourceUtils';
import type { BuildPlacementHintsResult, BuildPlacementInput, BuildPlacementHint } from './types';

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

export function useBuildPlacementHints({
  previewTypeId,
  hoverTile,
  selectedTile,
  placedBuildings,
  tutorialFree,
  simResources,
}: BuildPlacementInput): BuildPlacementHintsResult {
  return useMemo<BuildPlacementHintsResult>(() => {
    const highlightAllPlaceable = Boolean(previewTypeId);
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
    const affordable = previewTypeId
      ? isFreeBuild || (simResources ? canAfford(SIM_BUILDINGS[previewTypeId].cost, simResources) : false)
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
  ]);
}

export type { BuildPlacementHint } from './types';
