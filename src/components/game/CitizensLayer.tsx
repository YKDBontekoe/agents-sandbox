"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";
import CitizensRenderer from "./citizens/CitizensRenderer";
import {
  BuildingRef,
  CitizensLayerProps,
  Citizen,
  RoadTile,
} from "./citizens/types";
import {
  pathfind,
  setPathTo,
  updateActivityForHour,
  stepAlong,
} from "./citizens/pathfinding";

export default function CitizensLayer({
  buildings,
  roads,
  tileTypes,
  onProposeRoads,
  citizensCount,
  seed,
  tileWidth = 64,
  tileHeight = 32,
  dayLengthSeconds = 60,
}: CitizensLayerProps) {
  const { app, viewport } = useGameContext();
  const citizensRef = useRef<Citizen[]>([]);
  const carriedRef = useRef<{ wood: number; planks: number; grain: number }>({
    wood: 0,
    planks: 0,
    grain: 0,
  });
  const dayClockRef = useRef<number>(0);
  const randRef = useRef<() => number>(() => Math.random());

  const roadSet = useMemo(
    () => new Set(roads.map((r) => `${r.x},${r.y}`)),
    [roads]
  );
  const toWorld = useCallback(
    (gx: number, gy: number) => gridToWorld(gx, gy, tileWidth, tileHeight),
    [tileWidth, tileHeight]
  );

  const houses = useMemo(
    () => buildings.filter((b) => b.typeId === "house"),
    [buildings]
  );
  const storehouses = useMemo(
    () => buildings.filter((b) => b.typeId === "storehouse"),
    [buildings]
  );
  const producers = useMemo(
    () =>
      buildings.filter((b) =>
        [
          "farm",
          "lumber_camp",
          "sawmill",
          "trade_post",
          "automation_workshop",
          "shrine",
        ].includes(b.typeId)
      ),
    [buildings]
  );
  const leisureSpots = useMemo(
    () =>
      buildings.filter((b) =>
        ["trade_post", "shrine", "council_hall"].includes(b.typeId)
      ),
    [buildings]
  );
  const producerWeights = useMemo(() => {
    const map = new Map<string, number>();
    producers.forEach((p) => {
      const w = 0.5 + Math.max(0, p.workers || 0);
      map.set(p.id, w);
    });
    return map;
  }, [producers]);

  useEffect(() => {
    if (!app || !viewport) return;
    citizensRef.current = [];
    carriedRef.current = { wood: 0, planks: 0, grain: 0 };

    const rngSeed = Math.abs(Number(seed ?? 1337)) % 2147483647 || 1337;
    let rng = rngSeed;
    const rand = () => (rng = (rng * 48271) % 2147483647) / 2147483647;
    randRef.current = rand;
    const count = Math.min(
      20,
      Math.max(2, Math.floor(citizensCount ?? (houses.length * 2 || 6)))
    );
    const globalHome: BuildingRef =
      houses[0] ||
      storehouses[0] ||
      producers[0] ||
      { id: "global", typeId: "none", x: 10, y: 10 };
    const names = [
      "Ava",
      "Bran",
      "Caro",
      "Dane",
      "Eira",
      "Finn",
      "Gale",
      "Hale",
      "Iris",
      "Joss",
      "Kade",
      "Lena",
      "Milo",
      "Nora",
      "Oren",
      "Pia",
      "Quin",
      "Rhea",
      "Seth",
      "Tara",
    ];

    const chooseWeightedProducer = () => {
      if (producers.length === 0) return globalHome;
      const total = producers.reduce(
        (s, p) => s + (producerWeights.get(p.id) || 1),
        0
      );
      let r = rand() * (total || 1);
      for (const p of producers) {
        r -= producerWeights.get(p.id) || 1;
        if (r <= 0) return p;
      }
      return producers[0];
    };

    const chooseLeisure = () =>
      leisureSpots[0] ||
      producers.find((p) => p.typeId === "trade_post") ||
      globalHome;

    for (let i = 0; i < count; i++) {
      const home = houses[i % Math.max(1, houses.length)] || globalHome;
      const work = chooseWeightedProducer();
      const shop = chooseLeisure();
      const name =
        names[Math.floor(rand() * names.length)] +
        "-" +
        Math.floor(10 + rand() * 89);
      citizensRef.current.push({
        x: home.x,
        y: home.y,
        tx: home.x,
        ty: home.y,
        path: [],
        carrying: null,
        sprite: null,
        speed: 0.014 + rand() * 0.012,
        name,
        role: "Hauler",
        homeX: home.x,
        homeY: home.y,
        workX: work.x,
        workY: work.y,
        workId: work.id,
        shopX: shop.x,
        shopY: shop.y,
        activity: "Sleep",
        nextDecisionHour: -1,
        baseWorldY: 0,
        wanderCooldown: 0,
        lastDist: Infinity,
        stuckFor: 0,
        repathCooldown: 0,
      });
    }

    return () => {
      citizensRef.current = [];
    };
    }, [
      app,
      viewport,
      buildings,
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
    const tick = (ticker: PIXI.Ticker) => {
      const dtMs = ticker.deltaMS;
      const dt = dtMs / 16.6667;

      dayClockRef.current =
        (dayClockRef.current + dtMs / 1000) % Math.max(1, dayLengthSeconds);
      const hourOfDay =
        (dayClockRef.current / Math.max(1, dayLengthSeconds)) * 24.0;

      citizensRef.current.forEach((c) => {
        const hourBucket = Math.floor(hourOfDay * 2) / 2;
        if (c.nextDecisionHour !== hourBucket) {
          c.nextDecisionHour = hourBucket;
          updateActivityForHour(c, hourOfDay, (cit, x, y) =>
            setPathTo(cit, x, y, roadSet, tileTypes)
          );
        }
        if (c.wanderCooldown > 0) c.wanderCooldown -= dtMs / 1000;
        if (c.repathCooldown > 0) c.repathCooldown -= dtMs / 1000;

        if (!c.path.length) {
          if (c.activity === "Work")
            setPathTo(c, c.workX, c.workY, roadSet, tileTypes);
          else if (c.activity === "Shop")
            setPathTo(c, c.shopX, c.shopY, roadSet, tileTypes);
          else if (c.activity === "Sleep")
            setPathTo(c, c.homeX, c.homeY, roadSet, tileTypes);
        }

        stepAlong(
          c,
          dt,
          roadSet,
          tileTypes,
          toWorld,
          storehouses,
          producers,
          randRef.current
        );

        if (c.delivered) {
          const k = c.delivered;
          carriedRef.current[k] = (carriedRef.current[k] || 0) + 1;
          c.delivered = undefined;
        }
      });

      const carried = carriedRef.current;
      if (
        (carried.wood >= 10 && carried.planks >= 10) ||
        carried.planks >= 20
      ) {
        const st = storehouses[0];
        const target =
          producers.find((p) => p.typeId === "farm") || producers[0];
        if (st && target) {
          const tiles = pathfind(st.x, st.y, target.x, target.y, roadSet, tileTypes);
          if (tiles.length) {
            const newRoads = tiles
              .filter((_, i) => i % 2 === 0)
              .map((t) => ({ x: t.x, y: t.y }));
            onProposeRoads(newRoads);
            carriedRef.current = { wood: 0, planks: 0, grain: 0 };
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

  return <CitizensRenderer citizens={citizensRef.current} toWorld={toWorld} />;
}

export type { CitizensLayerProps, RoadTile, BuildingRef };
