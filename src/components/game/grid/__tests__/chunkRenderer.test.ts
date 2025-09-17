import { describe, expect, it, beforeEach, vi } from "vitest";
import * as PIXI from "pixi.js";
import { createChunkContainer, disposeChunkTiles, type LoadedChunk } from "../chunkRenderer";
import type { GridTile } from "../TileRenderer";

const { createTileSpriteMock } = vi.hoisted(() => {
  return {
    createTileSpriteMock: vi.fn((gridX: number, gridY: number) => {
      const sprite = new PIXI.Sprite();
      const dispose = vi.fn(() => {
        sprite.destroy();
      });

      return {
        x: gridX,
        y: gridY,
        worldX: gridX,
        worldY: gridY,
        tileType: "placeholder",
        sprite,
        dispose,
      } as unknown as GridTile;
    }),
  };
});

vi.mock("../TileRenderer", () => ({
  createTileSprite: createTileSpriteMock,
}));

describe("chunkRenderer", () => {
  beforeEach(() => {
    createTileSpriteMock.mockClear();
  });

  it("creates PIXI containers and tiles for each chunk cell", () => {
    const chunkData = {
      chunkX: 0,
      chunkY: 1,
      chunkSize: 2,
      seed: 42,
      tiles: [
        ["grass", "water"],
        ["mountain", "forest"],
      ],
      fields: {
        height: [
          [0.1, 0],
          [0.2, 0.3],
        ],
        temperature: [
          [0.5, 0.5],
          [0.5, 0.5],
        ],
        moisture: [
          [0.2, 0.2],
          [0.2, 0.2],
        ],
        climate: [
          ["temperate", "temperate"],
          ["temperate", "temperate"],
        ],
        isRiver: [
          [false, false],
          [false, false],
        ],
        isWater: [
          [false, true],
          [false, false],
        ],
      },
    };

    const { container, tiles } = createChunkContainer(chunkData, {
      renderer: {} as PIXI.Renderer,
      tileWidth: 64,
      tileHeight: 32,
    });

    expect(container.name).toBe("chunk-0-1");
    expect(tiles.size).toBe(4);
    expect(createTileSpriteMock).toHaveBeenCalledTimes(4);

    expect(tiles.get("0,2")?.tileType).toBe("grass");
    expect(tiles.get("1,2")?.tileType).toBe("water");
    expect(tiles.get("0,3")?.tileType).toBe("mountain");
    expect(tiles.get("1,3")?.tileType).toBe("forest");
  });

  it("disposes all tile sprites when releasing a chunk", () => {
    const tileA: GridTile = {
      x: 0,
      y: 0,
      worldX: 0,
      worldY: 0,
      tileType: "grass",
      sprite: new PIXI.Sprite(),
      dispose: vi.fn(),
      textureCacheKey: null,
    };
    const tileB: GridTile = {
      x: 1,
      y: 0,
      worldX: 1,
      worldY: 0,
      tileType: "water",
      sprite: new PIXI.Sprite(),
      dispose: vi.fn(),
      textureCacheKey: null,
    };

    const loadedChunk: LoadedChunk = {
      data: {
        chunkX: 0,
        chunkY: 0,
        chunkSize: 1,
        tiles: [["grass"]],
      },
      container: new PIXI.Container(),
      tiles: new Map<string, GridTile>([
        ["0,0", tileA],
        ["1,0", tileB],
      ]),
      lastAccessed: Date.now(),
    };

    const disposed = disposeChunkTiles(loadedChunk);

    expect(disposed).toBe(2);
    expect(tileA.dispose).toHaveBeenCalledTimes(1);
    expect(tileB.dispose).toHaveBeenCalledTimes(1);
    expect(loadedChunk.tiles.size).toBe(0);
  });
});
