import { describe, expect, it } from "vitest";

import { computeHeight, computeTemperature, computeMoisture } from "../noise";
import { DEFAULT_BIOME_THRESHOLDS } from "../biome";

describe("noise utilities", () => {
  const seed = 12345;

  it("produces deterministic height samples", () => {
    const first = computeHeight(seed, 100, -50);
    const second = computeHeight(seed, 100, -50);
    const neighbor = computeHeight(seed, 101, -50);

    expect(second).toBe(first);
    expect(neighbor).not.toBeCloseTo(first, 6);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(1);
  });

  it("reduces temperature with higher elevation", () => {
    const seaLevel = computeTemperature(seed, 10, 20, 0.1);
    const mountainTop = computeTemperature(seed, 10, 20, 0.9);

    expect(mountainTop).toBeLessThanOrEqual(seaLevel);
  });

  it("boosts moisture near coastlines", () => {
    const waterLevel = DEFAULT_BIOME_THRESHOLDS.waterLevel;
    const nearShore = computeMoisture(seed, 5, -12, waterLevel - 0.01, { waterLevel });
    const inland = computeMoisture(seed, 5, -12, waterLevel + 0.1, { waterLevel });

    expect(nearShore).toBeGreaterThan(inland);
  });
});
