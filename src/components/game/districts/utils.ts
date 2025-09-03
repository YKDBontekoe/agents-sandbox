import * as PIXI from "pixi.js";
import { gridToWorld } from "@/lib/isometric";
import {
  District,
  DistrictState,
  DistrictTier,
  DistrictType,
  DistrictSprite,
} from "./types";

export const getDistrictColors = (type: DistrictType) => {
  switch (type) {
    case DistrictType.FARM:
      return { primary: 0x4ade80, secondary: 0x22c55e };
    case DistrictType.FORGE:
      return { primary: 0xf97316, secondary: 0xea580c };
    case DistrictType.SANCTUM:
      return { primary: 0x8b5cf6, secondary: 0x7c3aed };
    case DistrictType.MARKET:
      return { primary: 0xeab308, secondary: 0xca8a04 };
    case DistrictType.WELL:
      return { primary: 0x06b6d4, secondary: 0x0891b2 };
    case DistrictType.WATCHTOWER:
      return { primary: 0xef4444, secondary: 0xdc2626 };
    default:
      return { primary: 0x64748b, secondary: 0x475569 };
  }
};

export const createDistrictIcon = (type: DistrictType, size: number) => {
  const icon = new PIXI.Graphics();
  const colors = getDistrictColors(type);

  switch (type) {
    case DistrictType.FARM:
      icon.fill(colors.primary);
      icon.rect(-size / 3, -size / 4, (size * 2) / 3, size / 2);
      icon.poly([-size / 3, -size / 4, 0, -size / 2, size / 3, -size / 4]);
      icon.fill();
      break;
    case DistrictType.FORGE:
      icon.fill(colors.primary);
      icon.rect(-size / 4, -size / 6, size / 2, size / 4);
      icon.rect(-size / 3, size / 6, (size * 2) / 3, size / 8);
      icon.fill();
      break;
    case DistrictType.SANCTUM:
      icon.fill(colors.primary);
      icon.poly([
        0,
        -size / 2,
        size / 3,
        -size / 6,
        size / 3,
        size / 6,
        0,
        size / 2,
        -size / 3,
        size / 6,
        -size / 3,
        -size / 6,
      ]);
      icon.fill();
      break;
    case DistrictType.MARKET:
      icon.fill(colors.primary);
      icon.poly([
        -size / 3,
        size / 4,
        -size / 6,
        -size / 4,
        size / 6,
        -size / 4,
        size / 3,
        size / 4,
      ]);
      icon.fill();
      break;
    case DistrictType.WELL:
      icon.fill(colors.primary);
      icon.circle(0, 0, size / 3);
      icon.fill();
      icon.fill(0x1a1a2e);
      icon.circle(0, 0, size / 6);
      icon.fill();
      break;
    case DistrictType.WATCHTOWER:
      icon.fill(colors.primary);
      icon.rect(-size / 6, -size / 2, size / 3, size);
      icon.rect(-size / 4, -size / 2, size / 2, size / 4);
      icon.fill();
      break;
  }

  return icon;
};

export const createTierIndicator = (tier: DistrictTier, size: number) => {
  const indicator = new PIXI.Graphics();
  for (let i = 0; i < tier; i++) {
    indicator.fill(0xfbbf24);
    indicator.circle(-size / 3 + i * (size / 6), size / 3, size / 12);
    indicator.fill();
  }
  return indicator;
};

export const createStateOverlay = (state: DistrictState, size: number) => {
  const overlay = new PIXI.Graphics();
  switch (state) {
    case DistrictState.DISABLED:
      overlay.fill({ color: 0x000000, alpha: 0.5 });
      overlay.rect(-size / 2, -size / 2, size, size);
      overlay.fill();
      overlay.setStrokeStyle({ width: 3, color: 0xef4444 });
      overlay.moveTo(-size / 4, -size / 4);
      overlay.lineTo(size / 4, size / 4);
      overlay.moveTo(size / 4, -size / 4);
      overlay.lineTo(-size / 4, size / 4);
      overlay.stroke();
      break;
    case DistrictState.EMPOWERED:
      overlay.fill({ color: 0xfbbf24, alpha: 0.3 });
      overlay.circle(0, 0, size / 2 + 5);
      overlay.fill();
      break;
  }
  return overlay;
};

export const createDistrictSprite = (
  district: District,
  tileWidth: number,
  tileHeight: number,
  tileTypes: string[][],
  onDistrictHover?: (
    district: District | null,
    tileType?: string,
    event?: PIXI.FederatedPointerEvent,
  ) => void,
  onDistrictClick?: (district: District) => void,
): DistrictSprite => {
  const container = new PIXI.Container();
  const { worldX, worldY } = gridToWorld(
    district.gridX,
    district.gridY,
    tileWidth,
    tileHeight,
  );
  container.x = worldX;
  container.y = worldY;
  // Enable pointer events on PIXI v8
  // @ts-expect-error pixi v8 eventMode
  (container as any).eventMode = 'static';
  container.cursor = "pointer";

  const background = new PIXI.Graphics();
  background.fill({ color: 0x374151, alpha: 0.8 });
  background.setStrokeStyle({ width: 1, color: 0x6b7280 });
  background.ellipse(0, tileHeight / 4, tileWidth / 3, tileHeight / 6);
  background.fill();
  background.stroke();

  const icon = createDistrictIcon(district.type, 24);
  const tierIndicator = createTierIndicator(district.tier, 24);
  const stateOverlay = createStateOverlay(district.state, 32);

  container.addChild(background);
  container.addChild(icon);
  container.addChild(tierIndicator);
  container.addChild(stateOverlay);

  container.on("pointerover", (event: PIXI.FederatedPointerEvent) => {
    container.scale.set(1.1);
    const tileType = tileTypes[district.gridY]?.[district.gridX];
    onDistrictHover?.(district, tileType, event);
  });

  container.on("pointerout", (event: PIXI.FederatedPointerEvent) => {
    container.scale.set(1.0);
    onDistrictHover?.(null, undefined, event);
  });

  container.on("pointerdown", () => {
    onDistrictClick?.(district);
  });

  return {
    district,
    sprite: container,
    background,
    icon,
    tierIndicator,
    stateOverlay,
  };
};
