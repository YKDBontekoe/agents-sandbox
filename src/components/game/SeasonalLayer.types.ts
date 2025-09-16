import type { Graphics } from "pixi.js";

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface SeasonalLayerProps {
  season: Season;
}

export interface ParticleGraphics extends Graphics {
  vx: number;
  vy: number;
  fade: number;
}
