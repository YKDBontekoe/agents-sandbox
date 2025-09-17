import { describe, expect, it, vi } from "vitest";

import {
  calculateClampSettings,
  computeIsometricWorldBounds,
} from "../useIsometricViewportBounds";

describe("useIsometricViewportBounds helpers", () => {
  it("computes world bounds for an isometric grid", () => {
    const bounds = computeIsometricWorldBounds({ gridSize: 2, tileWidth: 64, tileHeight: 32 });

    expect(bounds).toEqual({
      minX: -32,
      maxX: 32,
      minY: 0,
      maxY: 32,
      centerX: 0,
      centerY: 16,
    });
  });

  it("derives clamp rectangles and min zoom from the computed bounds", () => {
    const bounds = computeIsometricWorldBounds({ gridSize: 2, tileWidth: 64, tileHeight: 32 });
    const mockViewport = {
      screenWidth: 800,
      screenHeight: 600,
      clamp: vi.fn(),
      clampZoom: vi.fn(),
    };

    const settings = calculateClampSettings(bounds, mockViewport, 64, 32);

    expect(settings.clampRect).toEqual({ left: -160, right: 160, top: -64, bottom: 96 });
    expect(settings.minScale).toBe(2);
    expect(settings.maxScale).toBe(3);
  });
});
