import { useCallback, useMemo, useState } from 'react';
import type { StarField } from '../types';

const STAR_FIELD_SEED = 0x1badf00d;

const createRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export interface UseConstellationStarfieldOptions {
  count?: number;
  width?: number;
  height?: number;
  seed?: number;
}

export interface ConstellationStarfieldState {
  starField: StarField[];
  time: number;
  tick: (dt: number) => void;
}

const generateStarField = ({
  count,
  width,
  height,
  seed,
}: Required<Pick<UseConstellationStarfieldOptions, 'count' | 'width' | 'height' | 'seed'>>) => {
  const random = createRandom(seed);
  const stars: StarField[] = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: random() * width - width / 2,
      y: random() * height - height / 2,
      brightness: random() * 0.8 + 0.2,
      twinkle: random() * Math.PI * 2,
      size: random() * 2 + 0.5,
    });
  }
  return stars;
};

export function useConstellationStarfield(
  options: UseConstellationStarfieldOptions = {},
): ConstellationStarfieldState {
  const { count = 150, width = 2400, height = 1600, seed = STAR_FIELD_SEED } = options;
  const starField = useMemo(
    () => generateStarField({ count, width, height, seed }),
    [count, width, height, seed],
  );
  const [time, setTime] = useState(0);

  const tick = useCallback((dt: number) => {
    setTime((prev) => prev + dt * 0.001);
  }, []);

  return { starField, time, tick };
}
