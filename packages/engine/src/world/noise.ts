const UINT32_MAX = 0xffffffff;

export interface HeightNoiseLayer {
  seedOffset: number;
  frequency: number;
  amplitude: number;
}

export const HEIGHT_NOISE_LAYERS: HeightNoiseLayer[] = [
  { seedOffset: 101, frequency: 0.004, amplitude: 1 },
  { seedOffset: 131, frequency: 0.008, amplitude: 0.55 },
  { seedOffset: 151, frequency: 0.018, amplitude: 0.25 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export function hash(seed: number, x: number, y: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 362437);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / UINT32_MAX;
}

export function valueNoise(seed: number, x: number, y: number) {
  const x0 = Math.floor(x);
  const x1 = x0 + 1;
  const y0 = Math.floor(y);
  const y1 = y0 + 1;
  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);

  const n00 = hash(seed, x0, y0);
  const n10 = hash(seed, x1, y0);
  const n01 = hash(seed, x0, y1);
  const n11 = hash(seed, x1, y1);

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);
  return lerp(ix0, ix1, sy);
}

export interface FractalNoiseOptions {
  frequency: number;
  octaves?: number;
  lacunarity?: number;
  gain?: number;
}

export function fractalNoise(
  seed: number,
  x: number,
  y: number,
  { frequency, octaves = 4, lacunarity = 2, gain = 0.5 }: FractalNoiseOptions,
) {
  let amp = 1;
  let freq = frequency;
  let total = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise(seed + i * 97, x * freq, y * freq) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return norm === 0 ? 0 : total / norm;
}

export function computeHeight(
  seed: number,
  x: number,
  y: number,
  layers: HeightNoiseLayer[] = HEIGHT_NOISE_LAYERS,
) {
  let heightValue = 0;
  let totalAmplitude = 0;
  for (const layer of layers) {
    const value = fractalNoise(seed + layer.seedOffset, x, y, {
      frequency: layer.frequency,
      octaves: 3,
      lacunarity: 2.1,
      gain: 0.55,
    });
    heightValue += value * layer.amplitude;
    totalAmplitude += layer.amplitude;
  }
  heightValue = totalAmplitude === 0 ? 0 : heightValue / totalAmplitude;
  heightValue = Math.pow(heightValue, 1.08);
  return clamp(heightValue, 0, 1);
}

export function computeTemperature(seed: number, x: number, y: number, heightValue: number) {
  const lat = Math.abs(y) / 620;
  const latInfluence = clamp(1 - lat, 0, 1);
  const continental = fractalNoise(seed + 211, x, y, {
    frequency: 0.0025,
    octaves: 3,
    lacunarity: 2.2,
    gain: 0.55,
  });
  const detail = fractalNoise(seed + 213, x, y, {
    frequency: 0.012,
    octaves: 2,
    lacunarity: 2.1,
    gain: 0.5,
  });
  let temperature = latInfluence * 0.7 + continental * 0.2 + detail * 0.1;
  temperature -= heightValue * 0.32;
  return clamp(temperature, 0, 1);
}

export interface MoistureOptions {
  waterLevel?: number;
  shorelineRange?: number;
  shorelineIntensity?: number;
}

export function computeMoisture(
  seed: number,
  x: number,
  y: number,
  heightValue: number,
  { waterLevel = 0.38, shorelineRange = 0.04, shorelineIntensity = 1.4 }: MoistureOptions = {},
) {
  const base = fractalNoise(seed + 271, x, y, {
    frequency: 0.0035,
    octaves: 4,
    lacunarity: 2.0,
    gain: 0.55,
  });
  const detail = fractalNoise(seed + 277, x, y, {
    frequency: 0.015,
    octaves: 2,
    lacunarity: 2.1,
    gain: 0.5,
  });
  let moisture = base * 0.7 + detail * 0.3;
  if (heightValue <= waterLevel + shorelineRange) {
    moisture += (waterLevel + shorelineRange - heightValue) * shorelineIntensity;
  }
  return clamp(moisture, 0, 1);
}
