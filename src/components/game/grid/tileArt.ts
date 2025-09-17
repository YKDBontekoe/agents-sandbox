import * as PIXI from "pixi.js";

import { TILE_COLORS } from "@/lib/isometric";

const TILE_TYPE_LIST = Object.freeze(Object.keys(TILE_COLORS));

function shade(hex: number, factor: number): number {
  const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((hex & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

export function getAvailableTileTypes(): string[] {
  return TILE_TYPE_LIST;
}

export function createTileGraphics(tileType: string, tileWidth: number, tileHeight: number): PIXI.Container {
  const container = new PIXI.Container();

  const baseGraphic = new PIXI.Graphics();
  baseGraphic.position.set(tileWidth / 2, tileHeight / 2);

  const baseColor = TILE_COLORS[tileType] ?? TILE_COLORS.unknown;
  const lighter = shade(baseColor, 1.08);
  const darker = shade(baseColor, 0.85);

  baseGraphic.fill({ color: baseColor, alpha: 0.96 });
  baseGraphic.moveTo(0, -tileHeight / 2);
  baseGraphic.lineTo(tileWidth / 2, 0);
  baseGraphic.lineTo(0, tileHeight / 2);
  baseGraphic.lineTo(-tileWidth / 2, 0);
  baseGraphic.closePath();
  baseGraphic.fill();

  baseGraphic.fill({ color: lighter, alpha: 0.12 });
  baseGraphic.moveTo(0, -tileHeight * 0.36);
  baseGraphic.lineTo(tileWidth * 0.36, 0);
  baseGraphic.lineTo(0, tileHeight * 0.36);
  baseGraphic.lineTo(-tileWidth * 0.36, 0);
  baseGraphic.closePath();
  baseGraphic.fill();

  baseGraphic.setStrokeStyle({ width: 1.5, color: darker, alpha: 0.55 });
  baseGraphic.moveTo(0, tileHeight / 2);
  baseGraphic.lineTo(tileWidth / 2, 0);
  baseGraphic.lineTo(0, -tileHeight / 2);
  baseGraphic.stroke();

  baseGraphic.setStrokeStyle({ width: 1, color: 0x334155, alpha: 0.35 });
  baseGraphic.moveTo(0, -tileHeight / 2);
  baseGraphic.lineTo(tileWidth / 2, 0);
  baseGraphic.lineTo(0, tileHeight / 2);
  baseGraphic.lineTo(-tileWidth / 2, 0);
  baseGraphic.lineTo(0, -tileHeight / 2);
  baseGraphic.stroke();

  container.addChild(baseGraphic);

  const detailGraphic = new PIXI.Graphics();
  detailGraphic.position.set(tileWidth / 2, tileHeight / 2);
  (detailGraphic as unknown as { eventMode: string }).eventMode = "none";

  let hasDetail = false;

  if (tileType === "water" || tileType === "river") {
    detailGraphic.setStrokeStyle({ width: 1, color: 0x93c5fd, alpha: 0.35 });
    const y0 = -tileHeight * 0.12;
    const y1 = 0;
    const y2 = tileHeight * 0.12;
    detailGraphic.moveTo(-tileWidth * 0.25, y0);
    detailGraphic.quadraticCurveTo(0, y0 + 2, tileWidth * 0.25, y0);
    detailGraphic.moveTo(-tileWidth * 0.3, y1);
    detailGraphic.quadraticCurveTo(0, y1 + 2, tileWidth * 0.3, y1);
    detailGraphic.moveTo(-tileWidth * 0.2, y2);
    detailGraphic.quadraticCurveTo(0, y2 + 2, tileWidth * 0.2, y2);
    detailGraphic.stroke();
    hasDetail = true;
  } else if (tileType === "forest") {
    detailGraphic.fill({ color: 0x166534, alpha: 0.12 });
    const s = Math.max(2, Math.floor(tileHeight * 0.08));
    detailGraphic.drawPolygon([-s, 0, 0, -s, s, 0, -s, 0]);
    detailGraphic.endFill();
    hasDetail = true;
  } else if (tileType === "mountain") {
    detailGraphic.setStrokeStyle({ width: 1, color: 0x64748b, alpha: 0.35 });
    detailGraphic.moveTo(-tileWidth * 0.2, tileHeight * 0.05);
    detailGraphic.lineTo(0, -tileHeight * 0.15);
    detailGraphic.lineTo(tileWidth * 0.2, tileHeight * 0.05);
    detailGraphic.stroke();
    hasDetail = true;
  } else if (tileType === "grass") {
    detailGraphic.setStrokeStyle({ width: 1, color: 0x16a34a, alpha: 0.15 });
    detailGraphic.moveTo(-tileWidth * 0.1, tileHeight * 0.04);
    detailGraphic.lineTo(-tileWidth * 0.02, tileHeight * 0.01);
    detailGraphic.moveTo(tileWidth * 0.1, -tileHeight * 0.04);
    detailGraphic.lineTo(tileWidth * 0.02, -tileHeight * 0.01);
    detailGraphic.stroke();
    hasDetail = true;
  }

  if (hasDetail) {
    container.addChild(detailGraphic);
  } else {
    detailGraphic.destroy();
  }

  return container;
}
