import * as PIXI from "pixi.js";

export enum DistrictType {
  FARM = "farm",
  FORGE = "forge",
  SANCTUM = "sanctum",
  MARKET = "market",
  WELL = "well",
  WATCHTOWER = "watchtower",
}

export enum DistrictTier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
}

export enum DistrictState {
  NORMAL = "normal",
  DISABLED = "disabled",
  EMPOWERED = "empowered",
}

export interface District {
  id: string;
  type: DistrictType;
  tier: DistrictTier;
  state: DistrictState;
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
}

export interface DistrictSprite {
  district: District;
  sprite: PIXI.Container;
  background: PIXI.Graphics;
  icon: PIXI.Graphics;
  tierIndicator: PIXI.Graphics;
  stateOverlay: PIXI.Graphics;
}

export interface DistrictSpritesProps {
  districts: District[];
  tileWidth?: number;
  tileHeight?: number;
  tileTypes?: string[][];
  onDistrictClick?: (district: District) => void;
  onDistrictHover?: (
    district: District | null,
    tileType?: string,
    event?: PIXI.FederatedPointerEvent,
  ) => void;
}
