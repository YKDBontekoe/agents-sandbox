import type { Graphics } from "pixi.js";

export interface ParticleProperties {
  vy: number;
  fade: number;
}

export type ParticleGraphic = Graphics & ParticleProperties;
