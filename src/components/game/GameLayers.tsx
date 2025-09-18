import React from 'react';
import PreviewLayer from './PreviewLayer';
import DistrictSprites, { type District } from './districts';
import { LeylineSystem, type Leyline } from '../../../apps/web/features/leylines';
import HeatLayer from './HeatLayer';
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
import VisualIndicatorLayer from './VisualIndicatorLayer';
import { type SimResources } from './resourceUtils';
import type { GameResources } from './hud/types';

import type { VisualIndicator } from '@engine';

import type { BuildTypeId, BuildingAvailability } from './simCatalog';

import ConnectedBuildingsLayer from './layers/ConnectedBuildingsLayer';
import { useLayerDatasets } from './layers/useLayerDatasets';
import type { Marker, StoredBuilding, TileSelection, TradeRoute, BuildPlacementHintsResult } from './layers/types';

export interface GameLayersProps {
  tileTypes: string[][];
  hoverTile: TileSelection | null;
  selectedTile: TileSelection | null;
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
  visualIndicators: VisualIndicator[];
  districts: District[];
  leylines: Leyline[];
  selectedLeyline: Leyline | null;
  setSelectedLeyline: (l: Leyline | null) => void;
  isLeylineDrawing?: boolean;
  onLeylineCreate?: (fromX: number, fromY: number, toX: number, toY: number) => void;
  onLeylineRemove?: (leylineId: string) => void;
  resources: GameResources;
  cycle: number;
  constructionEvents: Array<{
    id: string;
    buildingId: string;
    position: { x: number; y: number };
    type: 'building' | 'upgrading' | 'demolishing';
    timestamp: number;
  }>;
  buildingAvailability: Record<BuildTypeId, BuildingAvailability>;
  placementHints: BuildPlacementHintsResult;
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
  visualIndicators,
  districts,
  leylines,
  selectedLeyline,
  setSelectedLeyline,
  isLeylineDrawing = false,
  onLeylineCreate,
  onLeylineRemove,
  resources,
  cycle,
  constructionEvents,
  buildingAvailability,
  placementHints,
}) => {

  const { buildings, storeConnectedIds, routeDefs, routeBuildings, workingCitizens } = useLayerDatasets({
    placedBuildings,
    routes,
  });

  return (
    <>
      <PreviewLayer
        hoverTile={hoverTile}
        selectedTile={selectedTile}
        tileTypes={tileTypes}
        buildings={buildings}
        previewTypeId={previewTypeId}
        buildHint={placementHints.buildHint}
        highlightAllPlaceable={placementHints.highlightAllPlaceable}
        hasCouncil={placementHints.hasCouncil}
        affordable={placementHints.affordable}
      />
      <DistrictSprites districts={districts} tileTypes={tileTypes} onDistrictHover={() => {}} />
      <LeylineSystem
        leylines={leylines}
        onLeylineCreate={onLeylineCreate}
        onLeylineSelect={setSelectedLeyline}
        selectedLeyline={selectedLeyline}
        isDrawingMode={isLeylineDrawing}
        onLeylineRemove={onLeylineRemove}
      />
      <HeatLayer gridSize={Math.max(tileTypes.length, tileTypes[0]?.length ?? 0)} tileWidth={64} tileHeight={32} unrest={resources.unrest} threat={resources.threat} />
      <ConnectedBuildingsLayer
        buildings={buildings}
        storeConnectedIds={storeConnectedIds}
        selectedTile={selectedTile}
      />
      <RoutesLayer
        routes={routeDefs}
        buildings={routeBuildings}
        draftFromId={routeDraftFrom}
        draftToId={routeHoverToId}
      />
      <AssignmentLinesLayer lines={assignLines} />
      <PathHintsLayer hints={pathHints} />
      <BuildingPulseLayer pulses={pulses} />
      {showRoads && <RoadsLayer roads={roads} />}
      {showCitizens && (
        <AnimatedCitizensLayer
          buildings={buildings}
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
      <VisualIndicatorLayer indicators={visualIndicators} />
      <MarkersLayer markers={markers.map(m => ({ id: m.id, gridX: m.x, gridY: m.y, label: m.label }))} />
      <EnhancedVisualEffectsLayer
        buildings={buildings}
        citizens={workingCitizens}
        roads={roads}
        gameTime={{ hour: Math.floor((Date.now() / 60000) % 24), minute: Math.floor((Date.now() / 1000) % 60), day: Math.floor(Date.now() / 86400000) }}
        cityMetrics={{ population: citizensCount, happiness: 75, pollution: 20, traffic: roads.length * 10 }}
        constructionEvents={constructionEvents}
      />
    </>
  );
};

export default GameLayers;

