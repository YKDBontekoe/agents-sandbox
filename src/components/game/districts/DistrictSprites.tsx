"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "../GameContext";
import {
  DistrictSprite,
  DistrictSpritesProps,
} from "./types";
import { createDistrictSprite } from "./utils";
import { gridToWorld } from "@/lib/isometric";

export default function DistrictSprites({
  districts,
  tileWidth = 64,
  tileHeight = 32,
  tileTypes = [],
  onDistrictClick,
  onDistrictHover,
}: DistrictSpritesProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const spritesRef = useRef<Map<string, DistrictSprite>>(new Map());

  // Initialize districts
  useEffect(() => {
    if (!viewport) return;

    const container = new PIXI.Container();
    container.name = 'districts';
    container.sortableChildren = true;
    viewport.addChild(container);
    containerRef.current = container;
    const sprites = spritesRef.current;

    return () => {
      if (container.parent) {
        container.parent.removeChild(container);
      }
      container.destroy({ children: true });
      sprites.clear();
    };
  }, [viewport]);

  // Update districts when data changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const sprites = spritesRef.current;

    // Remove districts that no longer exist
    const currentIds = new Set(districts.map(d => d.id));
    sprites.forEach((sprite, id) => {
      if (!currentIds.has(id)) {
        container.removeChild(sprite.sprite);
        sprite.sprite.destroy({ children: true });
        sprites.delete(id);
      }
    });

    // Add or update districts
    districts.forEach(district => {
      const existing = sprites.get(district.id);

      if (existing) {
        // Update existing district
        const { worldX, worldY } = gridToWorld(
          district.gridX,
          district.gridY,
          tileWidth,
          tileHeight,
        );
        existing.sprite.x = worldX;
        existing.sprite.y = worldY;

        if (
          existing.district.type !== district.type ||
          existing.district.tier !== district.tier ||
          existing.district.state !== district.state
        ) {
          existing.sprite.removeChild(existing.icon);
          existing.sprite.removeChild(existing.tierIndicator);
          existing.sprite.removeChild(existing.stateOverlay);

          const newSprite = createDistrictSprite(
            district,
            tileWidth,
            tileHeight,
            tileTypes,
            onDistrictHover,
            onDistrictClick,
          );

          existing.sprite.addChild(newSprite.icon);
          existing.sprite.addChild(newSprite.tierIndicator);
          existing.sprite.addChild(newSprite.stateOverlay);
          existing.icon = newSprite.icon;
          existing.tierIndicator = newSprite.tierIndicator;
          existing.stateOverlay = newSprite.stateOverlay;
        }

        existing.district = district;
      } else {
        const sprite = createDistrictSprite(
          district,
          tileWidth,
          tileHeight,
          tileTypes,
          onDistrictHover,
          onDistrictClick,
        );
        sprite.sprite.zIndex = 100;
        container.addChild(sprite.sprite);
        sprites.set(district.id, sprite);
      }
    });
  }, [districts, tileWidth, tileHeight, tileTypes, onDistrictHover, onDistrictClick]);

  return null;
}

export type { DistrictSpritesProps, DistrictSprite };