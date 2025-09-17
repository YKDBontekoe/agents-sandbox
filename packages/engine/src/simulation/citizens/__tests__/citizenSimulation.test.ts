import { describe, expect, it } from "vitest";
import {
  DEFAULT_GLOBAL_HOME,
  buildProducerWeightMap,
  selectLeisureDestination,
  selectWorkDestination,
} from "../citizenSimulation";

describe("citizenSimulation", () => {
  describe("selectWorkDestination", () => {
    const producers = [
      { id: "a", typeId: "farm", x: 0, y: 0, workers: 0 },
      { id: "b", typeId: "sawmill", x: 1, y: 1, workers: 4 },
      { id: "c", typeId: "shrine", x: 2, y: 2, workers: 1 },
    ];
    const weights = buildProducerWeightMap(producers);
    const totalWeight = producers.reduce(
      (sum, producer) => sum + (weights.get(producer.id) ?? 0),
      0
    );

    const makeRoll = (value: number) => () => value / totalWeight;

    it("biases selection toward higher worker counts", () => {
      expect(
        selectWorkDestination(producers, weights, makeRoll(0.1), DEFAULT_GLOBAL_HOME)
      ).toBe(producers[0]);
      expect(
        selectWorkDestination(
          producers,
          weights,
          makeRoll(0.5 + 0.1),
          DEFAULT_GLOBAL_HOME
        )
      ).toBe(producers[1]);
      expect(
        selectWorkDestination(
          producers,
          weights,
          makeRoll(0.5 + 4.5 + 0.1),
          DEFAULT_GLOBAL_HOME
        )
      ).toBe(producers[2]);
    });

    it("falls back to the provided home when no producers exist", () => {
      expect(
        selectWorkDestination([], weights, makeRoll(0.2), DEFAULT_GLOBAL_HOME)
      ).toBe(DEFAULT_GLOBAL_HOME);
    });
  });

  describe("selectLeisureDestination", () => {
    const fallback = DEFAULT_GLOBAL_HOME;
    const tradePost = { id: "tp", typeId: "trade_post", x: 3, y: 3 };

    it("returns the first leisure structure when available", () => {
      const shrine = { id: "sh", typeId: "shrine", x: 2, y: 2 };
      expect(
        selectLeisureDestination([shrine], [tradePost], fallback)
      ).toBe(shrine);
    });

    it("prefers a trade post producer when leisure options are missing", () => {
      expect(
        selectLeisureDestination([], [tradePost], fallback)
      ).toBe(tradePost);
    });

    it("falls back to the provided home when no destinations exist", () => {
      expect(selectLeisureDestination([], [], fallback)).toBe(fallback);
    });
  });
});
