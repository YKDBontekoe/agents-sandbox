"use client";

import * as PIXI from "pixi.js";
import type { Viewport } from "pixi-viewport";
import logger from "@/lib/logger";
import { createTileSprite, type GridTile } from "../grid/TileRenderer";
import { TileOverlay } from "../grid/TileOverlay";
import { getChunkKey, type ChunkCacheEntry, type ChunkPayload } from "@engine/chunks";
import type { ChunkTelemetry } from "./chunkTelemetry";

interface TickerLike {
  add: (fn: (...args: unknown[]) => unknown) => unknown;
  remove: (fn: (...args: unknown[]) => unknown) => unknown;
}

export interface ChunkRendererOptions {
  viewport: Viewport;
  renderer: PIXI.Renderer | null;
  ticker?: TickerLike | null;
  chunkSize: number;
  tileWidth: number;
  tileHeight: number;
  chunkCache: ReadonlyMap<string, ChunkCacheEntry>;
  onTileHover?: (x: number, y: number, tileType?: string) => void;
  onTileClick?: (x: number, y: number, tileType?: string) => void;
  telemetry?: ChunkTelemetry;
}

interface RenderedChunk {
  container: PIXI.Container;
  tiles: Map<string, GridTile>;
  tileCount: number;
}

function buildChunkContainer(
  payload: ChunkPayload,
  renderer: PIXI.Renderer,
  tileWidth: number,
  tileHeight: number,
): RenderedChunk {
  const container = new PIXI.Container();
  container.name = `chunk-${payload.chunkX}-${payload.chunkY}`;
  container.sortableChildren = true;
  (container as unknown as { eventMode?: string }).eventMode = "static";

  const tiles = new Map<string, GridTile>();

  const heightMap = payload.fields?.height;
  const temperatureMap = payload.fields?.temperature;
  const moistureMap = payload.fields?.moisture;
  const climateMap = payload.fields?.climate;

  for (let localY = 0; localY < payload.chunkSize; localY++) {
    for (let localX = 0; localX < payload.chunkSize; localX++) {
      const globalX = payload.chunkX * payload.chunkSize + localX;
      const globalY = payload.chunkY * payload.chunkSize + localY;
      const tileType = payload.tiles[localY]?.[localX] ?? "grass";
      const biome = payload.biomes?.[localY]?.[localX];
      const heightValue = heightMap?.[localY]?.[localX];
      const temperatureValue = temperatureMap?.[localY]?.[localX];
      const moistureValue = moistureMap?.[localY]?.[localX];
      const climateValue = climateMap?.[localY]?.[localX];

      const tile = createTileSprite(
        globalX,
        globalY,
        container,
        tileWidth,
        tileHeight,
        payload.tiles,
        renderer,
        { tileTypeOverride: tileType },
      );

      tile.tileType = tileType;
      tile.biome = biome;
      tile.height = heightValue;
      tile.temperature = temperatureValue;
      tile.moisture = moistureValue;
      tile.climate = climateValue;

      if (
        typeof heightValue === "number" &&
        !["water", "deep_water", "river", "coast"].includes(tileType)
      ) {
        const shade = Math.max(0.65, Math.min(1, 0.72 + heightValue * 0.28));
        const shadeChannel = Math.round(shade * 255);
        const tintHex = (shadeChannel << 16) | (shadeChannel << 8) | shadeChannel;
        tile.sprite.tint = tintHex;
      }

      if (tileType === "river") {
        tile.sprite.alpha = 0.95;
      }

      const key = `${globalX},${globalY}`;
      tiles.set(key, tile);
      container.addChild(tile.sprite);
    }
  }

  return { container, tiles, tileCount: tiles.size };
}

export class ChunkRenderer {
  private readonly viewport: Viewport;
  private readonly renderer: PIXI.Renderer | null;
  private readonly ticker: TickerLike | null;
  private readonly chunkSize: number;
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  private readonly chunkCache: ReadonlyMap<string, ChunkCacheEntry>;
  private readonly telemetry?: ChunkTelemetry;
  private readonly renderedChunks = new Map<string, RenderedChunk>();
  private worldContainer: PIXI.Container;
  private overlay: TileOverlay | null = null;
  private lastVisibilityUpdate = 0;

  constructor(options: ChunkRendererOptions) {
    this.viewport = options.viewport;
    this.renderer = options.renderer;
    this.ticker = options.ticker ?? null;
    this.chunkSize = options.chunkSize;
    this.tileWidth = options.tileWidth;
    this.tileHeight = options.tileHeight;
    this.chunkCache = options.chunkCache;
    this.telemetry = options.telemetry;

    this.worldContainer = new PIXI.Container();
    this.worldContainer.name = "chunked-world";
    this.worldContainer.sortableChildren = true;
    this.worldContainer.zIndex = 100;
    (this.worldContainer as unknown as { eventMode?: string }).eventMode = "static";

    this.viewport.addChild(this.worldContainer);
    this.viewport.setZoom?.(1.5);
    this.viewport.moveCenter?.(0, 0);

    this.overlay = new TileOverlay(this.worldContainer, {
      tileWidth: this.tileWidth,
      tileHeight: this.tileHeight,
      getTileType: this.getTileType,
      onTileHover: options.onTileHover,
      onTileClick: options.onTileClick,
    });

    if (this.ticker) {
      this.ticker.add(this.handleTick);
    }
  }

  hasChunk(chunkKey: string) {
    return this.renderedChunks.has(chunkKey);
  }

  getRenderedChunkKeys() {
    return Array.from(this.renderedChunks.keys());
  }

  renderChunk(chunkKey: string, payload: ChunkPayload) {
    if (!this.renderer) {
      logger.warn(`[CHUNK_RENDER] Renderer unavailable for chunk ${chunkKey}`);
      return null;
    }

    if (this.renderedChunks.has(chunkKey)) {
      return this.renderedChunks.get(chunkKey)!;
    }

    const rendered = buildChunkContainer(payload, this.renderer, this.tileWidth, this.tileHeight);
    this.worldContainer.addChild(rendered.container);
    this.renderedChunks.set(chunkKey, rendered);
    this.telemetry?.logRenderCreate(chunkKey, { tileCount: rendered.tileCount });
    this.updateVisibility(this.viewport, true);

    return rendered;
  }

  destroyChunk(chunkKey: string) {
    const rendered = this.renderedChunks.get(chunkKey);
    if (!rendered) {
      return;
    }

    rendered.tiles.forEach((tile) => {
      try {
        tile.dispose();
      } catch (error) {
        logger.error(`[CHUNK_RENDER] Failed disposing tile ${tile.x},${tile.y}`, error);
      }
    });

    if (rendered.container.parent) {
      rendered.container.parent.removeChild(rendered.container);
    }
    rendered.container.destroy({ children: true, texture: true });
    this.renderedChunks.delete(chunkKey);
    this.telemetry?.logRenderDispose(chunkKey, { tileCount: rendered.tileCount });
  }

  updateVisibility(viewport: Viewport, force = false) {
    const now = performance.now();
    if (!force && now - this.lastVisibilityUpdate < 200) {
      return;
    }

    const scale = viewport.scale?.x ?? 1;
    const bounds = viewport.getVisibleBounds();
    const padding = Math.max(this.tileWidth, this.tileHeight) * 4;

    const visibleLeft = bounds.x - padding;
    const visibleRight = bounds.x + bounds.width + padding;
    const visibleTop = bounds.y - padding;
    const visibleBottom = bounds.y + bounds.height + padding;

    this.renderedChunks.forEach((chunk) => {
      chunk.tiles.forEach((tile) => {
        const isInViewport =
          tile.worldX >= visibleLeft &&
          tile.worldX <= visibleRight &&
          tile.worldY >= visibleTop &&
          tile.worldY <= visibleBottom;

        const shouldShowTile = scale > 0.1 && isInViewport;
        if (tile.sprite.visible !== shouldShowTile) {
          tile.sprite.visible = shouldShowTile;
        }
      });
    });

    this.lastVisibilityUpdate = now;
  }

  destroy() {
    if (this.ticker) {
      this.ticker.remove(this.handleTick);
    }

    this.getRenderedChunkKeys().forEach((key) => this.destroyChunk(key));

    this.overlay?.destroy();
    this.overlay = null;

    if (this.worldContainer.parent) {
      this.worldContainer.parent.removeChild(this.worldContainer);
    }
    this.worldContainer.destroy({ children: true });
  }

  private readonly getTileType = (gridX: number, gridY: number) => {
    const chunkX = Math.floor(gridX / this.chunkSize);
    const chunkY = Math.floor(gridY / this.chunkSize);
    const chunkKey = getChunkKey(chunkX, chunkY);
    const chunk = this.chunkCache.get(chunkKey);

    if (!chunk) {
      return undefined;
    }

    const localX = gridX - chunk.data.chunkX * chunk.data.chunkSize;
    const localY = gridY - chunk.data.chunkY * chunk.data.chunkSize;
    return chunk.data.tiles[localY]?.[localX];
  };

  private readonly handleTick = () => {
    const now = performance.now();
    const delta = now - this.lastVisibilityUpdate;

    if (this.overlay?.selectOverlay.visible) {
      const base = 0.35;
      const amp = 0.1;
      const w = 0.002;
      const t = now;
      this.overlay.selectOverlay.alpha = base + amp * (0.5 + 0.5 * Math.sin(t * w));
    }

    if (delta > 200) {
      this.updateVisibility(this.viewport);
    }
  };
}

export function createChunkRenderer(options: ChunkRendererOptions) {
  return new ChunkRenderer(options);
}

export type { RenderedChunk };

