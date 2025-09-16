import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../grid/TileRenderer", () => {
  return {
    createTileSprite: vi.fn((gridX: number, gridY: number) => {
      const dispose = vi.fn();
      const sprite = {
        visible: true,
        alpha: 1,
        tint: 0xffffff,
        parent: null as unknown,
        position: { set: vi.fn() },
        destroy: vi.fn(),
      };

      return {
        x: gridX,
        y: gridY,
        worldX: gridX,
        worldY: gridY,
        tileType: "grass",
        sprite,
        dispose,
      };
    }),
  };
});

const overlayDestroy = vi.fn();

vi.mock("../grid/TileOverlay", () => ({
  TileOverlay: vi.fn().mockImplementation(() => ({
    hoverOverlay: { visible: false },
    selectOverlay: { visible: false, alpha: 0 },
    destroy: overlayDestroy,
  })),
}));

vi.mock("pixi.js", () => {
  class Container {
    children: unknown[] = [];
    name = "";
    sortableChildren = false;
    zIndex = 0;
    parent: Container | null = null;

    addChild(child: any) {
      this.children.push(child);
      child.parent = this;
      return child;
    }

    removeChild(child: any) {
      this.children = this.children.filter((entry) => entry !== child);
      child.parent = null;
      return child;
    }

    destroy() {
      this.children = [];
    }
  }

  class Renderer {
    render() {}
  }

  class Graphics extends Container {
    fill() {}
    moveTo() {}
    lineTo() {}
    closePath() {}
    clear() {}
    setStrokeStyle() {}
    stroke() {}
  }

  class Polygon {}

  const RenderTexture = {
    create: vi.fn(() => ({})),
  };

  class Sprite {
    visible = true;
    alpha = 1;
    tint = 0xffffff;
    destroyed = false;
    parent: Container | null = null;
    position = { set: vi.fn() };

    destroy() {
      this.destroyed = true;
    }
  }

  return { Container, Renderer, Graphics, Polygon, RenderTexture, Sprite };
});

import * as PIXI from "pixi.js";
import { createChunkRenderer } from "./ChunkRenderer";
import { getChunkKey, type ChunkCacheEntry, type ChunkPayload } from "@engine/chunks";

const telemetryStub = () => ({
  stats: {
    loads: 0,
    releases: 0,
    tilesLoaded: 0,
    tilesReleased: 0,
    lastCacheSize: 0,
    renderCreates: 0,
    renderDisposes: 0,
  },
  logLoadStart: vi.fn(),
  logLoadSuccess: vi.fn(),
  logLoadError: vi.fn(),
  logRelease: vi.fn(),
  logRenderCreate: vi.fn(),
  logRenderDispose: vi.fn(),
  scheduleCleanup: vi.fn(() => () => undefined),
  dispose: vi.fn(),
});

const createPayload = (chunkX: number, chunkY: number): ChunkPayload => ({
  chunkX,
  chunkY,
  chunkSize: 2,
  seed: 1,
  tiles: [
    ["grass", "grass"],
    ["grass", "grass"],
  ],
});

const toCacheEntry = (payload: ChunkPayload): ChunkCacheEntry => ({
  key: getChunkKey(payload.chunkX, payload.chunkY),
  data: {
    chunkX: payload.chunkX,
    chunkY: payload.chunkY,
    chunkSize: payload.chunkSize,
    tiles: payload.tiles,
  },
  tileCount: payload.tiles.length * payload.tiles[0].length,
  lastAccessed: Date.now(),
});

describe("ChunkRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates and disposes rendered chunks", () => {
    const payload = createPayload(0, 0);
    const cache = new Map([[payload.chunkX + "," + payload.chunkY, toCacheEntry(payload)]]);
    const viewport: any = {
      addChild: vi.fn(),
      removeChild: vi.fn(),
      setZoom: vi.fn(),
      moveCenter: vi.fn(),
      getVisibleBounds: vi.fn(() => ({ x: 0, y: 0, width: 256, height: 256 })),
      scale: { x: 1, y: 1 },
    };
    const ticker = { add: vi.fn(), remove: vi.fn() };
    const telemetry = telemetryStub();

    const renderer = createChunkRenderer({
      viewport,
      renderer: new PIXI.Renderer(),
      ticker,
      chunkSize: payload.chunkSize,
      tileWidth: 64,
      tileHeight: 32,
      chunkCache: cache,
      telemetry,
    });

    const chunkKey = getChunkKey(payload.chunkX, payload.chunkY);
    const rendered = renderer.renderChunk(chunkKey, payload);
    expect(rendered).not.toBeNull();
    expect(rendered?.tiles.size).toBe(4);
    expect(telemetry.logRenderCreate).toHaveBeenCalledWith(chunkKey, expect.objectContaining({ tileCount: 4 }));

    const tiles = rendered ? Array.from(rendered.tiles.values()) : [];
    renderer.destroyChunk(chunkKey);
    tiles.forEach((tile) => expect(tile.dispose).toHaveBeenCalled());
    expect(telemetry.logRenderDispose).toHaveBeenCalledWith(chunkKey, expect.objectContaining({ tileCount: 4 }));

    renderer.destroy();
    expect(ticker.remove).toHaveBeenCalled();
    expect(overlayDestroy).toHaveBeenCalled();
  });
});

