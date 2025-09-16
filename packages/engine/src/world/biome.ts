export type ClimateBand =
  | "polar"
  | "subpolar"
  | "temperate-humid"
  | "temperate-arid"
  | "subtropical-humid"
  | "subtropical-arid"
  | "tropical-humid"
  | "tropical-arid";

export type BiomeId =
  | "deep_water"
  | "open_water"
  | "coast"
  | "swamp"
  | "temperate_forest"
  | "tropical_forest"
  | "grassland"
  | "steppe"
  | "savanna"
  | "desert"
  | "tundra"
  | "snow"
  | "mountain"
  | "hills"
  | "badlands";

export interface BiomeThresholds {
  waterLevel: number;
  deepWaterLevel: number;
  coastMargin: number;
  mountainHeight: number;
  hillHeight: number;
  highlandTundraTemperature: number;
  snowTemperature: number;
  coolForestTemperature: number;
  forestMoisture: number;
  tropicalTemperature: number;
  desertMoisture: number;
  savannaMoisture: number;
  badlandsMoisture: number;
  steppeMoisture: number;
  swampMoisture: number;
}

export const DEFAULT_BIOME_THRESHOLDS: BiomeThresholds = {
  waterLevel: 0.38,
  deepWaterLevel: 0.38 - 0.08,
  coastMargin: 0.02,
  mountainHeight: 0.82,
  hillHeight: 0.7,
  highlandTundraTemperature: 0.35,
  snowTemperature: 0.18,
  coolForestTemperature: 0.32,
  forestMoisture: 0.55,
  tropicalTemperature: 0.78,
  desertMoisture: 0.35,
  savannaMoisture: 0.55,
  badlandsMoisture: 0.22,
  steppeMoisture: 0.35,
  swampMoisture: 0.78,
};

export interface ClimateBandThresholds {
  polarMaxTemperature: number;
  subpolarMaxTemperature: number;
  temperateMaxTemperature: number;
  subtropicalMaxTemperature: number;
  temperateHumidMoisture: number;
  subtropicalHumidMoisture: number;
  tropicalHumidMoisture: number;
}

export const DEFAULT_CLIMATE_THRESHOLDS: ClimateBandThresholds = {
  polarMaxTemperature: 0.2,
  subpolarMaxTemperature: 0.35,
  temperateMaxTemperature: 0.6,
  subtropicalMaxTemperature: 0.78,
  temperateHumidMoisture: 0.4,
  subtropicalHumidMoisture: 0.45,
  tropicalHumidMoisture: 0.5,
};

export function classifyBiome(
  height: number,
  temperature: number,
  moisture: number,
  thresholds: BiomeThresholds = DEFAULT_BIOME_THRESHOLDS,
): BiomeId {
  const {
    waterLevel,
    deepWaterLevel,
    mountainHeight,
    hillHeight,
    highlandTundraTemperature,
    snowTemperature,
    coolForestTemperature,
    forestMoisture,
    tropicalTemperature,
    desertMoisture,
    savannaMoisture,
    badlandsMoisture,
    steppeMoisture,
    swampMoisture,
  } = thresholds;

  if (height <= waterLevel) {
    return height <= deepWaterLevel ? "deep_water" : "open_water";
  }

  if (height >= mountainHeight) {
    return "mountain";
  }

  if (height >= hillHeight) {
    return temperature < highlandTundraTemperature ? "tundra" : "hills";
  }

  if (temperature < snowTemperature) {
    return "snow";
  }

  if (temperature < coolForestTemperature) {
    return moisture > forestMoisture ? "temperate_forest" : "tundra";
  }

  if (temperature > tropicalTemperature) {
    if (moisture < desertMoisture) return "desert";
    if (moisture < savannaMoisture) return "savanna";
    return "tropical_forest";
  }

  if (moisture < badlandsMoisture) {
    return "badlands";
  }

  if (moisture < steppeMoisture) {
    return "steppe";
  }

  if (moisture > swampMoisture) {
    return "swamp";
  }

  return moisture > forestMoisture ? "temperate_forest" : "grassland";
}

export function getClimateBand(
  temperature: number,
  moisture: number,
  thresholds: ClimateBandThresholds = DEFAULT_CLIMATE_THRESHOLDS,
): ClimateBand {
  const {
    polarMaxTemperature,
    subpolarMaxTemperature,
    temperateMaxTemperature,
    subtropicalMaxTemperature,
    temperateHumidMoisture,
    subtropicalHumidMoisture,
    tropicalHumidMoisture,
  } = thresholds;

  if (temperature < polarMaxTemperature) return "polar";
  if (temperature < subpolarMaxTemperature) return "subpolar";
  if (temperature < temperateMaxTemperature) {
    return moisture < temperateHumidMoisture ? "temperate-arid" : "temperate-humid";
  }
  if (temperature < subtropicalMaxTemperature) {
    return moisture < subtropicalHumidMoisture ? "subtropical-arid" : "subtropical-humid";
  }
  return moisture < tropicalHumidMoisture ? "tropical-arid" : "tropical-humid";
}

export function biomeToTile(
  biome: BiomeId,
  { isRiver, height }: { isRiver: boolean; height: number },
  thresholds: BiomeThresholds = DEFAULT_BIOME_THRESHOLDS,
): string {
  if (isRiver) return "river";

  switch (biome) {
    case "deep_water":
      return "deep_water";
    case "open_water":
      return height <= thresholds.waterLevel + thresholds.coastMargin ? "water" : "coast";
    case "coast":
      return "coast";
    case "swamp":
      return "swamp";
    case "temperate_forest":
    case "tropical_forest":
      return "forest";
    case "grassland":
      return "grass";
    case "savanna":
      return "savanna";
    case "steppe":
      return "plains";
    case "desert":
      return "desert";
    case "tundra":
      return "tundra";
    case "snow":
      return "snow";
    case "mountain":
      return "mountain";
    case "hills":
      return "hills";
    case "badlands":
      return "badlands";
    default:
      return "grass";
  }
}
