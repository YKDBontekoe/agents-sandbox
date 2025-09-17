"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Ticker } from "pixi.js";
import { useGameContext } from "../GameContext";
import { gridToWorld } from "@/lib/isometric";
import {
  advanceDayCycle,
  buildProducerWeightMap,
  createCitizenRng,
  spawnCitizens,
} from "@engine/simulation/citizens/citizenSimulation";
import {
  pathfind,
  setPathTo,
  stepAlong,
  updateActivityForHour,
} from "./pathfinding";
import type { BuildingRef, Citizen, CitizensLayerProps } from "./types";

interface CitizensSimulationResult {
  citizens: Citizen[];
  toWorld: (gx: number, gy: number) => { worldX: number; worldY: number };
}

const PRODUCER_TYPES = [
  "farm",
  "lumber_camp",
  "sawmill",
  "trade_post",
  "automation_workshop",
  "shrine",
];

const LEISURE_TYPES = ["trade_post", "shrine", "council_hall"];

const resetCarried = () => ({ wood: 0, planks: 0, grain: 0 });

type CarriedResources = ReturnType<typeof resetCarried>;

type CitizenSelection = (b: BuildingRef) => boolean;

const filterBuildings = (buildings: BuildingRef[], predicate: CitizenSelection) =>
  buildings.filter(predicate);

const isTypeIn = (types: string[]) => (building: BuildingRef) =>
  types.includes(building.typeId);

export const useCitizensSimulation = ({
  buildings,
  roads,
  tileTypes,
  onProposeRoads,
  citizensCount,
  seed,
  tileWidth = 64,
  tileHeight = 32,
  dayLengthSeconds = 60,
}: CitizensLayerProps): CitizensSimulationResult => {
  const { app, viewport } = useGameContext();

  const citizensRef = useRef<Citizen[]>([]);
  const carriedRef = useRef<CarriedResources>(resetCarried());
  const dayClockRef = useRef(0);
  const randRef = useRef<() => number>(() => Math.random());

  const roadSet = useMemo(
    () => new Set(roads.map((road) => `${road.x},${road.y}`)),
    [roads]
  );

  const toWorld = useCallback(
    (gx: number, gy: number) => gridToWorld(gx, gy, tileWidth, tileHeight),
    [tileWidth, tileHeight]
  );

  const houses = useMemo(
    () => filterBuildings(buildings, (b) => b.typeId === "house"),
    [buildings]
  );

  const storehouses = useMemo(
    () => filterBuildings(buildings, (b) => b.typeId === "storehouse"),
    [buildings]
  );

  const producers = useMemo(
    () => filterBuildings(buildings, isTypeIn(PRODUCER_TYPES)),
    [buildings]
  );

  const leisureSpots = useMemo(
    () => filterBuildings(buildings, isTypeIn(LEISURE_TYPES)),
    [buildings]
  );

  const producerWeights = useMemo(
    () => buildProducerWeightMap(producers),
    [producers]
  );

  useEffect(() => {
    if (!app || !viewport) return;

    const rng = createCitizenRng(seed);
    randRef.current = rng;
    carriedRef.current = resetCarried();
    dayClockRef.current = 0;

    const spawned = spawnCitizens({
      houses,
      storehouses,
      producers,
      leisureSpots,
      rng,
      citizensCount,
      producerWeights,
    }).map<Citizen>((citizen) => ({ ...citizen, sprite: null }));

    const citizens = citizensRef.current;
    citizens.splice(0, citizens.length, ...spawned);

    return () => {
      citizens.length = 0;
    };
  }, [
    app,
    viewport,
    houses,
    storehouses,
    producers,
    leisureSpots,
    producerWeights,
    seed,
    citizensCount,
  ]);

  useEffect(() => {
    if (!app) return;

    const tick = (ticker: Ticker) => {
      const dtMs = ticker.deltaMS;
      const { clockSeconds, hourOfDay } = advanceDayCycle(
        dayClockRef.current,
        dtMs,
        dayLengthSeconds
      );
      dayClockRef.current = clockSeconds;

      const hourBucket = Math.floor(hourOfDay * 2) / 2;
      const dt = dtMs / 16.6667;

      citizensRef.current.forEach((citizen) => {
        if (citizen.nextDecisionHour !== hourBucket) {
          citizen.nextDecisionHour = hourBucket;
          updateActivityForHour(citizen, hourOfDay, (c, x, y) =>
            setPathTo(c, x, y, roadSet, tileTypes)
          );
        }

        if (citizen.wanderCooldown > 0)
          citizen.wanderCooldown -= dtMs / 1000;
        if (citizen.repathCooldown > 0)
          citizen.repathCooldown -= dtMs / 1000;

        if (!citizen.path.length) {
          if (citizen.activity === "Work")
            setPathTo(citizen, citizen.workX, citizen.workY, roadSet, tileTypes);
          else if (citizen.activity === "Shop")
            setPathTo(citizen, citizen.shopX, citizen.shopY, roadSet, tileTypes);
          else if (citizen.activity === "Sleep")
            setPathTo(citizen, citizen.homeX, citizen.homeY, roadSet, tileTypes);
        }

        stepAlong(
          citizen,
          dt,
          roadSet,
          tileTypes,
          toWorld,
          storehouses,
          producers,
          randRef.current
        );

        if (citizen.delivered) {
          const resource = citizen.delivered;
          carriedRef.current[resource] =
            (carriedRef.current[resource] || 0) + 1;
          citizen.delivered = undefined;
        }
      });

      const carried = carriedRef.current;
      if (
        (carried.wood >= 10 && carried.planks >= 10) ||
        carried.planks >= 20
      ) {
        const storehouse = storehouses[0];
        const target =
          producers.find((producer) => producer.typeId === "farm") ||
          producers[0];
        if (storehouse && target) {
          const tiles = pathfind(
            storehouse.x,
            storehouse.y,
            target.x,
            target.y,
            roadSet,
            tileTypes
          );
          if (tiles.length) {
            const newRoads = tiles
              .filter((_, index) => index % 2 === 0)
              .map((tile) => ({ x: tile.x, y: tile.y }));
            onProposeRoads(newRoads);
            carriedRef.current = resetCarried();
          }
        }
      }
    };

    app.ticker.add(tick);
    return () => {
      app.ticker.remove(tick);
    };
  }, [
    app,
    roadSet,
    tileTypes,
    storehouses,
    producers,
    dayLengthSeconds,
    toWorld,
    onProposeRoads,
  ]);

  return { citizens: citizensRef.current, toWorld };
};

export default useCitizensSimulation;
