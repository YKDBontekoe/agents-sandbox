import React from 'react';
import { BuildingsLayer } from '../../../../apps/web/features/buildings';
import type { LayerBuilding, TileSelection } from './types';

interface ConnectedBuildingsLayerProps {
  buildings: LayerBuilding[];
  storeConnectedIds: string[];
  selectedTile: TileSelection | null;
}

const ConnectedBuildingsLayer: React.FC<ConnectedBuildingsLayerProps> = ({
  buildings,
  storeConnectedIds,
  selectedTile,
}) => (
  <BuildingsLayer
    buildings={buildings}
    storeConnectedIds={storeConnectedIds}
    selected={selectedTile ? { x: selectedTile.x, y: selectedTile.y } : null}
  />
);

export default ConnectedBuildingsLayer;
