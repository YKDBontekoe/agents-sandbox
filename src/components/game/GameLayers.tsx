import React, { useMemo } from 'react';
import PreviewLayer from './PreviewLayer';
import DistrictSprites, { type District } from './districts';
import { LeylineSystem, type Leyline } from '../../../apps/web/features/leylines';
import HeatLayer from './HeatLayer';
import { BuildingsLayer } from '../../../apps/web/features/buildings';
import { RoutesLayer } from '../../../apps/web/features/routes';
import RoadsLayer from './RoadsLayer';
import AnimatedCitizensLayer from './AnimatedCitizensLayer';
import AssignmentLinesLayer, { type AssignLine } from './AssignmentLinesLayer';
import PathHintsLayer, { type PathHint } from './PathHintsLayer';
import BuildingPulseLayer, { type Pulse } from './BuildingPulseLayer';
import { EffectsLayer } from '../../../apps/web/features/effects';
import AmbientLayer from './AmbientLayer';
import SeasonalLayer from './SeasonalLayer';
import MarkersLayer from './MarkersLayer';
import EnhancedVisualEffectsLayer from './EnhancedVisualEffectsLayer';
import { SIM_BUILDINGS, BUILDABLE_TILES } from './simCatalog';
import { canAfford, type SimResources } from './resourceUtils';
import type { GameResources } from './hud/types';

import type { BuildTypeId } from './panels/TileInfoPanel';

interface StoredBuilding {
  id: string;
  typeId: keyof typeof SIM_BUILDINGS;
  x: number;
  y: number;
  level: number;
  workers: number;
}

interface TradeRoute {
  id: string;
  fromId: string;
  toId: string;
}

interface Marker { id: string; x: number; y: number; label?: string }

interface CivilizationClaim {
  chunkX: number;
  chunkY: number;
  size: number;
  ownerId: string | null;
  ownerName: string | null;
  color: string;
  temperament: string;
  influence: number;
  relationship: { status: string; attitude: number; trend: string } | null;
}

export interface GameLayersProps {
  tileTypes: string[][];
  hoverTile: { x: number; y: number; tileType?: string } | null;
  selectedTile: { x: number; y: number; tileType?: string } | null;
  placedBuildings: StoredBuilding[];
  previewTypeId: BuildTypeId | null;
  tutorialFree: Partial<Record<BuildTypeId, number>>;
  simResources: SimResources | null;
  routes: TradeRoute[];
  routeDraftFrom: string | null;
  routeHoverToId: string | null;
  assignLines: AssignLine[];
  pathHints: PathHint[];
  pulses: Pulse[];
  showRoads: boolean;
  roads: Array<{ x: number; y: number }>;
  showCitizens: boolean;
  citizensCount: number;
  acceptedNotice: { delta: Record<string, number> } | null;
  acceptedNoticeKey: string | null;
  clickEffectKey: string | null;
  markers: Marker[];
  civilizationClaims?: CivilizationClaim[];
  districts: District[];
  leylines: Leyline[];
  selectedLeyline: Leyline | null;
  setSelectedLeyline: (l: Leyline | null) => void;
  resources: GameResources;
  cycle: number;
  constructionEvents: Array<{
    id: string;
    buildingId: string;
    position: { x: number; y: number };
    type: 'building' | 'upgrading' | 'demolishing';
    timestamp: number;
  }>;
}

const GameLayers: React.FC<GameLayersProps> = ({
  tileTypes,
  hoverTile,
  selectedTile,
  placedBuildings,
  previewTypeId,
  tutorialFree,
  simResources,
  routes,
  routeDraftFrom,
  routeHoverToId,
  assignLines,
  pathHints,
  pulses,
  showRoads,
  roads,
  showCitizens,
  citizensCount,
  acceptedNotice,
  acceptedNoticeKey,
  clickEffectKey,
  markers,
  districts,
  leylines,
  selectedLeyline,
  setSelectedLeyline,
  resources,
  cycle,
  constructionEvents,
  civilizationClaims = [],
}) => {
  const buildHint = useMemo(() => {
    if (!previewTypeId) return undefined;
    const tile = hoverTile || selectedTile;
    if (!tile) return undefined;
    const occupied = placedBuildings.some(b => b.x === tile.x && b.y === tile.y);
    if (occupied) return { valid: false, reason: 'Occupied' } as const;
      const allowed = (BUILDABLE_TILES as Record<string, string[]>)[previewTypeId];
    if (allowed && tile.tileType && !allowed.includes(tile.tileType)) return { valid: false, reason: 'Invalid terrain' } as const;
    const needsCouncil = (previewTypeId === 'trade_post' || previewTypeId === 'automation_workshop');
    const hasCouncil = placedBuildings.some(b => b.typeId === 'council_hall');
    if (needsCouncil && !hasCouncil) return { valid: false, reason: 'Requires Council Hall' } as const;
    const hasFree = (tutorialFree[previewTypeId] || 0) > 0;
    if (!hasFree && simResources) {
      const cost = SIM_BUILDINGS[previewTypeId].cost as Record<string, number>;
      const lack: string[] = [];
      (Object.keys(cost) as Array<keyof typeof cost>).forEach((k) => {
        const need = cost[k] || 0;
        const cur = simResources[k as keyof SimResources] || 0;
        if (need > cur) lack.push(`${String(k)} ${need - cur}`);
      });
      if (lack.length > 0) return { valid: false, reason: `Insufficient: ${lack.slice(0,3).join(', ')}` } as const;
    }
    return { valid: true } as const;
  }, [previewTypeId, hoverTile, selectedTile, placedBuildings, tutorialFree, simResources]);

  const buildingsForLayer = useMemo(() => placedBuildings.map(b => ({ id: b.id, typeId: b.typeId, x: b.x, y: b.y, workers: b.workers, level: b.level })), [placedBuildings]);

  const civilizationMarkers = useMemo(() => {
    return (civilizationClaims ?? []).map((claim) => {
      const centerX = claim.chunkX * claim.size + Math.floor(claim.size / 2);
      const centerY = claim.chunkY * claim.size + Math.floor(claim.size / 2);
      const hex = typeof claim.color === 'string' ? claim.color.replace('#', '') : '';
      const parsedColor = Number.parseInt(hex, 16);
      const color = Number.isNaN(parsedColor) ? 0x2563eb : parsedColor;
      const relationship = claim.relationship;
      const statusRaw = relationship?.status ?? 'unknown';
      const statusLabel = statusRaw === 'self'
        ? 'Dominion'
        : statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
      const trendSymbol = relationship
        ? relationship.trend === 'improving'
          ? '↑'
          : relationship.trend === 'declining'
            ? '↓'
            : '→'
        : '•';
      const influencePct = Number.isFinite(claim.influence)
        ? Math.max(0, Math.round(claim.influence * 100))
        : 0;
      const labelBase = claim.ownerName ?? 'Unclaimed Territory';
      const label = `${labelBase} • ${statusLabel} ${trendSymbol} ${influencePct}%`;
      return {
        id: `civ-${claim.chunkX}-${claim.chunkY}`,
        gridX: centerX,
        gridY: centerY,
        color,
        label,
      };
    });
  }, [civilizationClaims]);

  const combinedMarkers = useMemo(() => {
    const base = markers.map(m => ({ id: m.id, gridX: m.x, gridY: m.y, label: m.label }));
    return [...base, ...civilizationMarkers];
  }, [markers, civilizationMarkers]);

  return (
    <>
      <PreviewLayer
        hoverTile={hoverTile}
        selectedTile={selectedTile}
        tileTypes={tileTypes}
        buildings={buildingsForLayer}
        previewTypeId={previewTypeId}
        buildHint={buildHint}
        highlightAllPlaceable={!!previewTypeId}
        hasCouncil={placedBuildings.some(b => b.typeId === 'council_hall')}
        affordable={previewTypeId ? ((tutorialFree[previewTypeId] || 0) > 0 || (simResources ? canAfford(SIM_BUILDINGS[previewTypeId].cost, simResources) : false)) : false}
      />
      <DistrictSprites districts={districts} tileTypes={tileTypes} onDistrictHover={() => {}} />
      <LeylineSystem leylines={leylines} onLeylineCreate={() => {}} onLeylineSelect={setSelectedLeyline} selectedLeyline={selectedLeyline} isDrawingMode={false} />
      <HeatLayer gridSize={Math.max(tileTypes.length, tileTypes[0]?.length ?? 0)} tileWidth={64} tileHeight={32} unrest={resources.unrest} threat={resources.threat} />
      {(() => {
        const connected = new Set<string>();
        (routes || []).forEach(r => {
          const a = placedBuildings.find(b => b.id === r.fromId);
          const b = placedBuildings.find(b => b.id === r.toId);
          if (!a || !b) return;
          if (a.typeId === 'storehouse' && b.id) connected.add(b.id);
          if (b.typeId === 'storehouse' && a.id) connected.add(a.id);
        });
        return (
          <BuildingsLayer
            buildings={buildingsForLayer}
            storeConnectedIds={Array.from(connected)}
            selected={selectedTile ? { x: selectedTile.x, y: selectedTile.y } : null}
          />
        );
      })()}
      <RoutesLayer
        routes={(routes || []).map(r => ({ id: r.id, fromId: r.fromId, toId: r.toId }))}
        buildings={placedBuildings.map(b => ({ id: b.id, x: b.x, y: b.y }))}
        draftFromId={routeDraftFrom}
        draftToId={routeHoverToId}
      />
      <AssignmentLinesLayer lines={assignLines} />
      <PathHintsLayer hints={pathHints} />
      <BuildingPulseLayer pulses={pulses} />
      {showRoads && <RoadsLayer roads={roads} />}
      {showCitizens && (
        <AnimatedCitizensLayer
          buildings={buildingsForLayer}
          roads={roads}
          tileTypes={tileTypes}
          citizensCount={citizensCount}
          enableTraffic={true}
        />
      )}
      {acceptedNotice && (
        <EffectsLayer trigger={{ eventKey: acceptedNoticeKey || 'accept', deltas: acceptedNotice.delta || {}, gridX: selectedTile?.x ?? 10, gridY: selectedTile?.y ?? 10 }} />
      )}
      {clickEffectKey && selectedTile && (
        <EffectsLayer trigger={{ eventKey: clickEffectKey, deltas: {}, gridX: selectedTile.x, gridY: selectedTile.y }} />
      )}
      <AmbientLayer tileTypes={tileTypes} />
      <SeasonalLayer season={((cycle % 4 === 0 ? 'spring' : (cycle % 4 === 1 ? 'summer' : (cycle % 4 === 2 ? 'autumn' : 'winter'))))} />
      <MarkersLayer markers={combinedMarkers} />
      <EnhancedVisualEffectsLayer
        buildings={buildingsForLayer}
        citizens={placedBuildings.filter(b => b.workers > 0).map(b => ({ id: b.id, x: b.x, y: b.y, activity: 'working', speed: 1.0 }))}
        roads={roads}
        gameTime={{ hour: Math.floor((Date.now() / 60000) % 24), minute: Math.floor((Date.now() / 1000) % 60), day: Math.floor(Date.now() / 86400000) }}
        cityMetrics={{ population: citizensCount, happiness: 75, pollution: 20, traffic: roads.length * 10 }}
        constructionEvents={constructionEvents}
      />
    </>
  );
};

export default GameLayers;

