import { describe, expect, it } from "vitest";

import { deriveCoastPoints, deriveRiverPaths, orderRiverComponent } from "../features";

describe("river ordering", () => {
  it("orders components from source to mouth", () => {
    const component = [
      { x: 0, y: 0, height: 0.8 },
      { x: 1, y: 0, height: 0.6 },
      { x: 2, y: 0, height: 0.4 },
    ];
    const heightMap = [[0.8, 0.6, 0.4]];

    const ordered = orderRiverComponent(component, heightMap, 3, 1);

    expect(ordered.map((point) => point.x)).toEqual([0, 1, 2]);
    expect(ordered[0].height).toBeGreaterThan(ordered[ordered.length - 1].height);
  });
});

describe("river derivation", () => {
  it("builds river paths with consistent ordering", () => {
    const isRiver = [
      [false, true, false],
      [false, true, false],
      [false, true, false],
    ];
    const heightMap = [
      [0.9, 0.8, 0.7],
      [0.7, 0.6, 0.5],
      [0.5, 0.4, 0.3],
    ];

    const [river] = deriveRiverPaths(isRiver, heightMap, 10, 20);

    expect(river).toBeDefined();
    expect(river.length).toBe(3);
    expect(river.source.height).toBeGreaterThan(river.mouth.height);
    expect(river.path.map((point) => [point.x, point.y])).toEqual([
      [11, 20],
      [11, 21],
      [11, 22],
    ]);
  });
});

describe("coast extraction", () => {
  it("identifies land tiles bordering water", () => {
    const isWater = [
      [true, false],
      [false, false],
    ];

    const points = deriveCoastPoints(isWater, 100, 200);
    const coordinates = new Set(points.map((point) => `${point.x},${point.y}`));

    expect(coordinates).toEqual(new Set(["101,200", "100,201", "101,201"]));
  });
});
