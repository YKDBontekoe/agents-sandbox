import { beforeEach, describe, expect, it, vi } from "vitest";
import * as PIXI from "pixi.js";

import { updateGridTileTexture } from "../useIsometricGridSetup";
import type { GridTile } from "../TileRenderer";

const { getTileTextureMock } = vi.hoisted(() => ({
  getTileTextureMock: vi.fn(),
}));

vi.mock("../TileRenderer", () => ({
  getTileTexture: getTileTextureMock,
  createTileSprite: vi.fn(),
}));

vi.mock("../TileOverlay", () => ({
  TileOverlay: class {
    destroy = vi.fn();
  },
}));

describe("useIsometricGridSetup", () => {
  beforeEach(() => {
    getTileTextureMock.mockReset();
  });

  it("updates the sprite texture and tile type when the renderer is available", () => {
    const sprite = {
      texture: { updateUvs: vi.fn() },
      destroyed: false,
      visible: true,
    } as unknown as PIXI.Sprite;

    const gridTile: GridTile = {
      x: 2,
      y: 3,
      worldX: 0,
      worldY: 0,
      tileType: "grass",
      sprite,
      dispose: vi.fn(),
    };

    const nextTexture = { updateUvs: vi.fn() } as unknown as PIXI.RenderTexture;
    getTileTextureMock.mockReturnValue(nextTexture);

    const renderer = {} as PIXI.Renderer;

    const updated = updateGridTileTexture({
      gridTile,
      nextType: "water",
      tileWidth: 64,
      tileHeight: 32,
      renderer,
    });

    expect(updated).toBe(true);
    expect(getTileTextureMock).toHaveBeenCalledWith(
      "water",
      64,
      32,
      renderer,
      "2,3",
    );
    expect(gridTile.sprite.texture).toBe(nextTexture);
    expect(gridTile.tileType).toBe("water");
  });

  it("returns false when attempting to update a destroyed sprite", () => {
    const sprite = {
      texture: { updateUvs: vi.fn() },
      destroyed: true,
      visible: true,
    } as unknown as PIXI.Sprite;

    const gridTile: GridTile = {
      x: 0,
      y: 0,
      worldX: 0,
      worldY: 0,
      tileType: "grass",
      sprite,
      dispose: vi.fn(),
    };

    const updated = updateGridTileTexture({
      gridTile,
      nextType: "forest",
      tileWidth: 64,
      tileHeight: 32,
      renderer: {} as PIXI.Renderer,
    });

    expect(updated).toBe(false);
    expect(gridTile.tileType).toBe("grass");
  });
});
