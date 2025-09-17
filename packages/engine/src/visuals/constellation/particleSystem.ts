const TWO_PI = Math.PI * 2;

export type ConstellationParticleType =
  | 'unlock'
  | 'hover'
  | 'connection'
  | 'ambient';

export interface ParticleEffect {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ConstellationParticleType;
}

export interface ParticleSpawnContext {
  random: () => number;
  color?: string;
}

export interface ParticleUpdateContext {
  dt: number;
  dtSeconds: number;
  now: number;
  random: () => number;
}

export interface ParticlePreset {
  spawn: (particle: ParticleEffect, context: ParticleSpawnContext) => void;
  update: (particle: ParticleEffect, context: ParticleUpdateContext) => void;
}

const baseSpawn = (
  particle: ParticleEffect,
  context: ParticleSpawnContext,
) => {
  const offset = (context.random() - 0.5) * 8;
  particle.x += offset;
  particle.y += (context.random() - 0.5) * 8;
};

const createSpawn = (
  handler: (
    particle: ParticleEffect,
    context: ParticleSpawnContext,
  ) => void,
  color: string,
) => {
  return (particle: ParticleEffect, context: ParticleSpawnContext) => {
    handler(particle, context);
    particle.color = context.color ?? color;
  };
};

export const CONSTELLATION_PARTICLE_PRESETS: Record<
  ConstellationParticleType,
  ParticlePreset
> = {
  unlock: {
    spawn: createSpawn((particle, context) => {
      baseSpawn(particle, context);
      const angle = context.random() * TWO_PI;
      const speed = 40 + context.random() * 60;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 1200 + context.random() * 800;
      particle.size = 3 + context.random() * 4;
    }, '#ffd700'),
    update: (particle, { dtSeconds }) => {
      particle.vy += 30 * dtSeconds;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
    },
  },
  hover: {
    spawn: createSpawn((particle, context) => {
      baseSpawn(particle, context);
      const angle = context.random() * TWO_PI;
      const speed = 15 + context.random() * 25;
      particle.vx = Math.cos(angle) * speed * 0.6;
      particle.vy = Math.sin(angle) * speed * 0.6 - 10;
      particle.life = 800 + context.random() * 400;
      particle.size = 1.5 + context.random() * 2.5;
    }, '#64b5f6'),
    update: (particle, { dtSeconds, now }) => {
      particle.vy -= 5 * dtSeconds;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      particle.vx += Math.sin(now * 0.003 + particle.x * 0.01) * 2;
    },
  },
  connection: {
    spawn: createSpawn((particle, context) => {
      baseSpawn(particle, context);
      const angle = context.random() * TWO_PI;
      const speed = 25 + context.random() * 35;
      particle.vx = Math.cos(angle) * speed * 0.8;
      particle.vy = Math.sin(angle) * speed * 0.8;
      particle.life = 1000 + context.random() * 600;
      particle.size = 2 + context.random() * 3;
    }, '#9c27b0'),
    update: (particle) => {
      particle.vx *= 0.99;
      particle.vy *= 0.99;
    },
  },
  ambient: {
    spawn: createSpawn((particle, context) => {
      baseSpawn(particle, context);
      const angle = context.random() * TWO_PI;
      const speed = 5 + context.random() * 15;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 2000 + context.random() * 1500;
      particle.size = 1 + context.random() * 2;
    }, '#ffffff'),
    update: (particle, { random }) => {
      particle.vx *= 0.995;
      particle.vy *= 0.995;
      particle.vx += (random() - 0.5) * 0.5;
      particle.vy += (random() - 0.5) * 0.5;
    },
  },
};

export type EasingFunction = (t: number) => number;

export const easeOutCubic: EasingFunction = (t: number) => 1 - Math.pow(1 - t, 3);

export const CONSTELLATION_EASING = {
  easeOutCubic,
};

export interface ParticleSystemOptions {
  maxParticles?: number;
  poolSize?: number;
  random?: () => number;
  now?: () => number;
  presets?: Partial<Record<ConstellationParticleType, ParticlePreset>>;
}

const DEFAULT_ID_RANDOM_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

const defaultIdRandom = () => Math.random();
const defaultNow = () => Date.now();

const generateId = (random: () => number, now: number): string => {
  const randomIndex = Math.floor(random() * DEFAULT_ID_RANDOM_CHARS.length);
  return `${now}-${DEFAULT_ID_RANDOM_CHARS[randomIndex]}`;
};

export class ParticleSystem {
  private particles: ParticleEffect[] = [];
  private pool: ParticleEffect[] = [];
  private readonly maxParticles: number;
  private readonly poolSize: number;
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly presets: Record<ConstellationParticleType, ParticlePreset>;

  constructor(options: ParticleSystemOptions = {}) {
    this.maxParticles = options.maxParticles ?? 150;
    this.poolSize = options.poolSize ?? 50;
    this.random = options.random ?? defaultIdRandom;
    this.now = options.now ?? defaultNow;
    this.presets = {
      unlock: options.presets?.unlock ?? CONSTELLATION_PARTICLE_PRESETS.unlock,
      hover: options.presets?.hover ?? CONSTELLATION_PARTICLE_PRESETS.hover,
      connection:
        options.presets?.connection ?? CONSTELLATION_PARTICLE_PRESETS.connection,
      ambient: options.presets?.ambient ?? CONSTELLATION_PARTICLE_PRESETS.ambient,
    };
  }

  private createParticle(
    x: number,
    y: number,
    type: ConstellationParticleType,
    color?: string,
  ): ParticleEffect {
    const preset = this.presets[type];
    let particle = this.pool.pop();

    if (!particle) {
      particle = {
        id: '',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 0,
        color: color ?? '#ffffff',
        type,
      };
    }

    particle.id = generateId(this.random, this.now());
    particle.type = type;
    particle.x = x;
    particle.y = y;
    particle.vx = 0;
    particle.vy = 0;
    particle.life = 0;
    particle.maxLife = 0;
    particle.size = 0;
    preset.spawn(particle, { random: this.random, color });
    particle.maxLife = particle.life;

    return particle;
  }

  addParticles(
    x: number,
    y: number,
    type: ConstellationParticleType,
    count = 5,
    color?: string,
  ): void {
    if (this.particles.length + count > this.maxParticles) {
      const toRemove = this.particles.length + count - this.maxParticles;
      for (let i = 0; i < toRemove; i += 1) {
        const removed = this.particles.shift();
        if (removed && this.pool.length < this.poolSize) {
          this.pool.push(removed);
        }
      }
    }

    for (let i = 0; i < count; i += 1) {
      this.particles.push(this.createParticle(x, y, type, color));
    }
  }

  update(dt: number): ParticleEffect[] {
    const activeParticles: ParticleEffect[] = [];
    const dtSeconds = dt * 0.001;
    const now = this.now();

    for (const particle of this.particles) {
      particle.x += particle.vx * dtSeconds;
      particle.y += particle.vy * dtSeconds;
      particle.life -= dt;

      this.presets[particle.type].update(particle, {
        dt,
        dtSeconds,
        now,
        random: this.random,
      });

      if (particle.life > 0) {
        activeParticles.push(particle);
      } else if (this.pool.length < this.poolSize) {
        this.pool.push(particle);
      }
    }

    this.particles = activeParticles;
    return this.particles;
  }

  getParticles(): ParticleEffect[] {
    return this.particles;
  }

  clear(): void {
    for (const particle of this.particles) {
      if (this.pool.length < this.poolSize) {
        this.pool.push(particle);
      }
    }
    this.particles = [];
  }
}
