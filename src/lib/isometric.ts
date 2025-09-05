export const TILE_COLORS: Record<string, number> = {
  grass: 0x4ade80,
  water: 0x60a5fa,
  mountain: 0x9ca3af,
  forest: 0x16a34a,
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
