"use client";

import CitizensRenderer from "./citizens/CitizensRenderer";
import type {
  BuildingRef,
  CitizensLayerProps,
  RoadTile,
} from "./citizens/types";
import useCitizensSimulation from "./citizens/useCitizensSimulation";

export default function CitizensLayer(props: CitizensLayerProps) {
  const { citizens, toWorld } = useCitizensSimulation(props);
  return <CitizensRenderer citizens={citizens} toWorld={toWorld} />;
}

export type { CitizensLayerProps, RoadTile, BuildingRef };
