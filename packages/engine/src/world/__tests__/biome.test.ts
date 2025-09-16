import { describe, expect, it } from "vitest";

import {
  classifyBiome,
  getClimateBand,
  biomeToTile,
  DEFAULT_BIOME_THRESHOLDS,
  DEFAULT_CLIMATE_THRESHOLDS,
} from "../biome";

describe("biome classification", () => {
  const thresholds = DEFAULT_BIOME_THRESHOLDS;

  it("handles aquatic depth thresholds", () => {
    expect(classifyBiome(thresholds.deepWaterLevel - 0.01, 0.5, 0.5, thresholds)).toBe("deep_water");
    expect(classifyBiome(thresholds.waterLevel - 0.001, 0.5, 0.5, thresholds)).toBe("open_water");
  });

  it("distinguishes mountains and tundra at elevation", () => {
    expect(classifyBiome(thresholds.mountainHeight + 0.01, 0.4, 0.4, thresholds)).toBe("mountain");
    expect(
      classifyBiome(
        thresholds.hillHeight + 0.01,
        thresholds.highlandTundraTemperature - 0.01,
        0.4,
        thresholds,
      ),
    ).toBe("tundra");
  });

  it("classifies hot climates across moisture bands", () => {
    const hotTemp = thresholds.tropicalTemperature + 0.05;
    expect(classifyBiome(0.6, hotTemp, thresholds.desertMoisture - 0.01, thresholds)).toBe("desert");
    expect(
      classifyBiome(
        0.6,
        hotTemp,
        (thresholds.desertMoisture + thresholds.savannaMoisture) / 2,
        thresholds,
      ),
    ).toBe("savanna");
    expect(classifyBiome(0.6, hotTemp, thresholds.savannaMoisture + 0.05, thresholds)).toBe("tropical_forest");
  });

  it("maps temperate moisture extremes", () => {
    expect(classifyBiome(0.5, thresholds.coolForestTemperature + 0.1, thresholds.badlandsMoisture - 0.01, thresholds)).toBe(
      "badlands",
    );
    expect(classifyBiome(0.5, thresholds.coolForestTemperature + 0.1, thresholds.swampMoisture + 0.01, thresholds)).toBe(
      "swamp",
    );
  });
});

describe("climate band mapping", () => {
  const climateThresholds = DEFAULT_CLIMATE_THRESHOLDS;

  it("applies temperature cut-offs", () => {
    expect(getClimateBand(climateThresholds.polarMaxTemperature - 0.01, 0.5, climateThresholds)).toBe("polar");
    expect(getClimateBand((climateThresholds.polarMaxTemperature + climateThresholds.subpolarMaxTemperature) / 2, 0.5, climateThresholds)).toBe(
      "subpolar",
    );
    expect(
      getClimateBand(
        climateThresholds.temperateMaxTemperature - 0.01,
        climateThresholds.temperateHumidMoisture - 0.05,
        climateThresholds,
      ),
    ).toBe("temperate-arid");
    expect(
      getClimateBand(
        climateThresholds.subtropicalMaxTemperature - 0.01,
        climateThresholds.subtropicalHumidMoisture + 0.05,
        climateThresholds,
      ),
    ).toBe("subtropical-humid");
    expect(getClimateBand(climateThresholds.subtropicalMaxTemperature + 0.1, climateThresholds.tropicalHumidMoisture - 0.05, climateThresholds)).toBe(
      "tropical-arid",
    );
  });
});

describe("tile conversion", () => {
  const thresholds = DEFAULT_BIOME_THRESHOLDS;

  it("marks rivers regardless of biome", () => {
    expect(biomeToTile("temperate_forest", { isRiver: true, height: 0.5 }, thresholds)).toBe("river");
  });

  it("distinguishes coastal shallows", () => {
    expect(biomeToTile("open_water", { isRiver: false, height: thresholds.waterLevel }, thresholds)).toBe("water");
    expect(
      biomeToTile("open_water", { isRiver: false, height: thresholds.waterLevel + thresholds.coastMargin + 0.01 }, thresholds),
    ).toBe("coast");
  });

  it("maps terrestrial biomes", () => {
    expect(biomeToTile("savanna", { isRiver: false, height: 0.6 }, thresholds)).toBe("savanna");
  });
});
