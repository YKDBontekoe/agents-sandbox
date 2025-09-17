import { useEffect, useMemo, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { generateAnimatedPopulation } from '@engine/visuals/citizens';
import { useGameContext } from './GameContext';
import type { Building, Road } from './citizens/types';
import { gridToIso } from './citizens/citizenPathfinding';
import { renderCitizen } from './citizens/CitizenRenderer';
import { renderVehicle } from './citizens/VehicleRenderer';
import { useSpritePool } from './pixi/useSpritePool';

interface AnimatedCitizensLayerProps {
  buildings: Building[];
  roads: Road[];
  tileTypes: string[][];
  citizensCount: number;
  enableTraffic?: boolean;
}


export default function AnimatedCitizensLayer({
  buildings,
  citizensCount,
  enableTraffic = true
}: AnimatedCitizensLayerProps) {
  const { app } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const [container, setContainer] = useState<PIXI.Container | null>(null);

  useEffect(() => {
    if (!app) {
      return;
    }

    const pixiContainer = new PIXI.Container();
    containerRef.current = pixiContainer;
    app.stage.addChild(pixiContainer);
    setContainer(pixiContainer);

    return () => {
      if (containerRef.current === pixiContainer) {
        containerRef.current = null;
      }
      if (pixiContainer.parent === app.stage) {
        app.stage.removeChild(pixiContainer);
      }
      pixiContainer.destroy({ children: true });
      setContainer(current => (current === pixiContainer ? null : current));
    };
  }, [app]);

  const population = useMemo(
    () =>
      generateAnimatedPopulation({
        buildings,
        citizensCount,
        enableTraffic
      }),
    [buildings, citizensCount, enableTraffic]
  );

  const { citizens, vehicles } = population;

  const citizenLayer = useMemo(
    () => ({
      items: citizens,
      getId: (citizen: typeof citizens[number]) => `citizen-${citizen.id}`,
      create: renderCitizen,
      update: (sprite: unknown, citizen: typeof citizens[number]) => {
        const graphics = sprite as PIXI.Graphics;
        const isoPosition = gridToIso(citizen.x, citizen.y);
        graphics.position.set(isoPosition.x, isoPosition.y);
        if (citizen.direction !== undefined) {
          graphics.rotation = citizen.direction;
        }
      }
    }),
    [citizens]
  );

  const vehicleLayer = useMemo(
    () => ({
      items: vehicles,
      enabled: enableTraffic,
      getId: (vehicle: typeof vehicles[number]) => `vehicle-${vehicle.id}`,
      create: renderVehicle,
      update: (sprite: unknown, vehicle: typeof vehicles[number]) => {
        const graphics = sprite as PIXI.Graphics;
        const isoPosition = gridToIso(vehicle.x, vehicle.y);
        graphics.position.set(isoPosition.x, isoPosition.y);
        if (vehicle.direction !== undefined) {
          graphics.rotation = vehicle.direction;
        }
      }
    }),
    [vehicles, enableTraffic]
  );

  useSpritePool({
    app: app ?? null,
    container,
    layers: [citizenLayer, vehicleLayer]
  });

  return null;
}
