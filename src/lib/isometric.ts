export const TILE_COLORS: Record<string, number> = {
  grass: 0x4ade80,
  water: 0x60a5fa,
  mountain: 0x9ca3af,
  forest: 0x16a34a,
  unknown: 0x475569,
  // Enhanced terrain types
  coast: 0xfcd34d,
  river: 0x3b82f6,
  desert: 0xfbbf24,
  tundra: 0xe5e7eb,
  swamp: 0x059669,
  savanna: 0xeab308,
  snow: 0xf1f5f9,
  badlands: 0xb45309,
  village: 0x92400e,
  ruins: 0x6b7280,
  deep_water: 0x1e40af,
  hills: 0xa3a3a3,
  plains: 0x65a30d,
  iron_ore: 0x78716c,
  gold_ore: 0xf59e0b,
  crystal: 0x8b5cf6,
  ancient_tree: 0x166534,
  hot_spring: 0x06b6d4,
  sacred_grove: 0x7c3aed,
};

export function gridToWorld(
  gridX: number,
  gridY: number,
  tileWidth: number,
  tileHeight: number,
) {
  const worldX = (gridX - gridY) * (tileWidth / 2);
  const worldY = (gridX + gridY) * (tileHeight / 2);
  return { worldX, worldY };
}

// Inverse transform of gridToWorld: convert isometric world coords back to grid indices (fractional)
export function worldToGrid(
  worldX: number,
  worldY: number,
  tileWidth: number,
  tileHeight: number,
) {
  // Solve for gridX/gridY from:
  // worldX = (gx - gy) * (tileWidth/2)
  // worldY = (gx + gy) * (tileHeight/2)
  const a = worldX / (tileWidth / 2);
  const b = worldY / (tileHeight / 2);
  const gridX = (a + b) / 2;
  const gridY = (b - a) / 2;
  return { gridX, gridY };
}
