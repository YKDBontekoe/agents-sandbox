import React, { useEffect } from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import * as PIXI from "pixi.js";
import { useChunkStreaming, type UseChunkStreamingOptions, type UseChunkStreamingResult } from "../useChunkStreaming";
import type { GridTile } from "../TileRenderer";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const { createTileSpriteMock } = vi.hoisted(() => ({
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
}));

vi.mock("../TileRenderer", () => ({
  createTileSprite: createTileSpriteMock,
}));

vi.mock("@/lib/isometric", () => ({
  worldToGrid: (x: number, y: number) => ({ gridX: x, gridY: y }),
}));

class ViewportMock {
  center = { x: 0, y: 0 };
  scale = { x: 1, y: 1 };
  private handlers = new Map<string, Set<() => void>>();
  children: PIXI.Container[] = [];

  addChild(child: PIXI.Container) {
    this.children.push(child);
    (child as unknown as { parent: ViewportMock | null }).parent = this;
  }

  removeChild(child: PIXI.Container) {
    this.children = this.children.filter((c) => c !== child);
    (child as unknown as { parent: ViewportMock | null }).parent = null;
  }

  setZoom(value: number) {
    this.scale = { x: value, y: value };
  }

  moveCenter(x: number, y: number) {
    this.center = { x, y };
  }

  getVisibleBounds() {
    return { x: this.center.x, y: this.center.y, width: 1, height: 1 };
  }

  on(event: string, handler: () => void) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)?.add(handler);
  }

  off(event: string, handler: () => void) {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string) {
    this.handlers.get(event)?.forEach((handler) => handler());
  }
}

interface HookHarnessProps {
  options: UseChunkStreamingOptions;
  onUpdate: (value: UseChunkStreamingResult) => void;
}

function HookHarness({ options, onUpdate }: HookHarnessProps) {
  const result = useChunkStreaming(options);

  useEffect(() => {
    onUpdate(result);
  }, [result, onUpdate]);

  return null;
}

const originalFetch = global.fetch;
let fetchMock: ReturnType<typeof vi.fn>;
let root: Root | null = null;
let container: HTMLDivElement | null = null;
let lastResult: UseChunkStreamingResult | null = null;

function createAppStub() {
  const listeners = new Set<() => void>();
  return {
    renderer: {} as PIXI.Renderer,
    ticker: {
      deltaMS: 16,
      add: (fn: () => void) => {
        listeners.add(fn);
      },
      remove: (fn: () => void) => {
        listeners.delete(fn);
      },
    },
    __listeners: listeners,
  } as const;
}

async function renderHarness(options: UseChunkStreamingOptions) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root!.render(
      <HookHarness
        options={options}
        onUpdate={(value) => {
          lastResult = value;
        }}
      />,
    );
  });
}

async function waitForExpect(assertion: () => void, timeout = 1000) {
  const start = Date.now();
  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - start >= timeout) {
        throw error;
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }
  }
}

function setupFetchMock() {
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const parsed = new URL(url, "http://localhost");
    const chunkX = Number(parsed.searchParams.get("chunkX"));
    const chunkY = Number(parsed.searchParams.get("chunkY"));
    const chunkSize = Number(parsed.searchParams.get("chunkSize")) || 32;
    const tiles = Array.from({ length: chunkSize }, () => Array(chunkSize).fill("grass"));

    return {
      ok: true,
      json: async () => ({
        chunkX,
        chunkY,
        chunkSize,
        seed: 1,
        tiles,
      }),
    };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
}

function makeOptions(overrides: Partial<UseChunkStreamingOptions> = {}): UseChunkStreamingOptions {
  const viewport = new ViewportMock();
  return {
    app: createAppStub() as unknown as PIXI.Application,
    viewport: viewport as unknown as import("pixi-viewport").Viewport,
    worldSeed: 1,
    chunkSize: 32,
    tileWidth: 64,
    tileHeight: 32,
    maxLoadedChunks: 3,
    ...overrides,
  };
}

beforeEach(() => {
  setupFetchMock();
  createTileSpriteMock.mockClear();
  lastResult = null;
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = null;
  if (container) {
    container.remove();
    container = null;
  }
  global.fetch = originalFetch;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useChunkStreaming", () => {
  it("limits the number of cached chunks", async () => {
    const options = makeOptions({ maxLoadedChunks: 2 });
    await renderHarness(options);

    await waitForExpect(() => {
      expect(lastResult?.loadedChunks.size).toBe(2);
    });
  });

  it("cleans up stale chunks via the memory sweep timer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const options = makeOptions({ maxLoadedChunks: 2 });
    await renderHarness(options);

    await waitForExpect(() => {
      expect(lastResult?.loadedChunks.size).toBe(2);
    });

    const firstChunk = lastResult?.loadedChunks.values().next().value;
    const sampleTile = firstChunk ? firstChunk.tiles.values().next().value : null;

    vi.setSystemTime(new Date(70_000));

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitForExpect(() => {
      expect(lastResult?.loadedChunks.size).toBe(0);
    });

    if (sampleTile) {
      expect(sampleTile.dispose).toHaveBeenCalled();
    }
  });

  it("throttles viewport-driven chunk refreshes", async () => {
    vi.useFakeTimers();
    const viewport = new ViewportMock();
    const options = makeOptions({ viewport: viewport as unknown as import("pixi-viewport").Viewport });
    await renderHarness(options);

    await waitForExpect(() => {
      expect(lastResult?.loadedChunks.size).toBeGreaterThan(0);
    });

    const initialCalls = fetchMock.mock.calls.length;

    viewport.moveCenter(512, 0);
    await act(async () => {
      viewport.emit("moved");
      vi.advanceTimersByTime(299);
    });

    expect(fetchMock.mock.calls.length).toBe(initialCalls);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    await waitForExpect(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });
});
