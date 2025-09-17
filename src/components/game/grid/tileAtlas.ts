import * as PIXI from "pixi.js";
import { Assets, ExtensionType, extensions, LoaderParserPriority, Matrix } from "pixi.js";
import type { Renderer } from "pixi.js";

import logger from "@/lib/logger";

import { createTileGraphics, getAvailableTileTypes } from "./tileArt";

const TILE_ATLAS_SCHEME = "tile-atlas";

export interface TileAtlasResource {
  atlasTexture: PIXI.RenderTexture;
  textures: Record<string, PIXI.Texture>;
  frames: Record<string, PIXI.Rectangle>;
  tileWidth: number;
  tileHeight: number;
  tileTypes: string[];
  destroy: () => void;
}

interface LoadTileAtlasOptions {
  renderer: Renderer;
  tileWidth: number;
  tileHeight: number;
  tileTypes?: readonly string[];
}

const atlasResources = new Map<string, TileAtlasResource>();
const atlasPromises = new Map<string, Promise<TileAtlasResource>>();
let parserRegistered = false;

function getTileAtlasKey(tileWidth: number, tileHeight: number): string {
  return `${tileWidth}x${tileHeight}`;
}

function registerTileAtlasParser() {
  if (parserRegistered) {
    return;
  }

  extensions.add(tileAtlasParser);
  parserRegistered = true;
}

function normalizeTileTypes(tileTypes?: readonly string[]): string[] {
  const baseList = tileTypes && tileTypes.length > 0 ? tileTypes : getAvailableTileTypes();
  const unique = new Set(baseList);
  unique.add("unknown");
  return Array.from(unique);
}

function createAtlasResource({
  renderer,
  tileWidth,
  tileHeight,
  tileTypes,
}: LoadTileAtlasOptions & { tileTypes: string[] }): TileAtlasResource {
  const tileCount = tileTypes.length;
  const columns = Math.max(1, Math.ceil(Math.sqrt(tileCount)));
  const rows = Math.max(1, Math.ceil(tileCount / columns));
  const atlasWidth = columns * tileWidth;
  const atlasHeight = rows * tileHeight;

  const atlasTexture = PIXI.RenderTexture.create({ width: atlasWidth, height: atlasHeight });
  const textures: Record<string, PIXI.Texture> = {};
  const frames: Record<string, PIXI.Rectangle> = {};

  const start = performance.now();

  for (let index = 0; index < tileCount; index += 1) {
    const tileType = tileTypes[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const offsetX = column * tileWidth;
    const offsetY = row * tileHeight;

    const tileContainer = createTileGraphics(tileType, tileWidth, tileHeight);
    const transform = new Matrix(1, 0, 0, 1, offsetX, offsetY);

    renderer.render({
      container: tileContainer,
      target: atlasTexture,
      clear: index === 0,
      transform,
    });

    tileContainer.destroy({ children: true });

    const frame = new PIXI.Rectangle(offsetX, offsetY, tileWidth, tileHeight);
    frames[tileType] = frame;

    const texture = new PIXI.Texture({
      source: atlasTexture.source,
      frame,
      defaultAnchor: { x: 0.5, y: 0.5 },
    });
    textures[tileType] = texture;
  }

  const duration = performance.now() - start;
  logger.debug(
    `[TILE_ATLAS] Generated ${tileCount} tile variants (${tileWidth}x${tileHeight}) in ${duration.toFixed(2)}ms`,
  );

  return {
    atlasTexture,
    textures,
    frames,
    tileWidth,
    tileHeight,
    tileTypes,
    destroy: () => {
      Object.values(textures).forEach((texture) => texture.destroy());
      atlasTexture.destroy(true);
    },
  };
}

const tileAtlasParser = {
  extension: {
    type: ExtensionType.LoadParser,
    priority: LoaderParserPriority.Normal,
    name: TILE_ATLAS_SCHEME,
  },
  name: TILE_ATLAS_SCHEME,
  id: TILE_ATLAS_SCHEME,
  test(url: string): boolean {
    return typeof url === "string" && url.startsWith(`${TILE_ATLAS_SCHEME}:`);
  },
  load(url: string, asset: { data?: Partial<LoadTileAtlasOptions> }) {
    const data = asset.data ?? {};
    const renderer = data.renderer;
    if (!renderer) {
      throw new Error(`[TILE_ATLAS] Renderer missing when loading atlas for ${url}`);
    }

    const tileWidth = typeof data.tileWidth === "number" ? data.tileWidth : 64;
    const tileHeight = typeof data.tileHeight === "number" ? data.tileHeight : 32;
    const tileTypes = normalizeTileTypes(data.tileTypes);

    logger.debug(
      `[TILE_ATLAS] Loading atlas via parser for ${tileWidth}x${tileHeight} with ${tileTypes.length} variants`,
    );

    return createAtlasResource({ renderer, tileWidth, tileHeight, tileTypes });
  },
  unload(resource: TileAtlasResource) {
    resource.destroy();
  },
};

export async function loadTileAtlasResource(options: LoadTileAtlasOptions): Promise<TileAtlasResource> {
  const key = getTileAtlasKey(options.tileWidth, options.tileHeight);
  const cached = atlasResources.get(key);
  if (cached) {
    return cached;
  }

  registerTileAtlasParser();

  let promise = atlasPromises.get(key);
  if (!promise) {
    const alias = `${TILE_ATLAS_SCHEME}:${key}`;
    promise = (Assets.load({
      alias,
      src: alias,
      parser: TILE_ATLAS_SCHEME,
      data: {
        renderer: options.renderer,
        tileWidth: options.tileWidth,
        tileHeight: options.tileHeight,
        tileTypes: normalizeTileTypes(options.tileTypes),
      },
    }) as Promise<TileAtlasResource>)
      .then((resource) => {
        atlasResources.set(key, resource);
        return resource;
      })
      .catch((error) => {
        atlasPromises.delete(key);
        throw error;
      });
    atlasPromises.set(key, promise);
  }

  return promise;
}

export function getLoadedTileAtlasResource(tileWidth: number, tileHeight: number): TileAtlasResource | undefined {
  const key = getTileAtlasKey(tileWidth, tileHeight);
  return atlasResources.get(key);
}

export function clearTileAtlasCache() {
  atlasPromises.clear();
  atlasResources.forEach((resource) => {
    resource.destroy();
  });
  atlasResources.clear();
  parserRegistered = false;
}
