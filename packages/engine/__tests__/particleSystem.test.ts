import { describe, expect, it } from 'vitest';

import { ParticleSystem } from '../src/visuals/constellation/particleSystem';

const createConstantRandom = (value: number) => () => value;

describe('ParticleSystem', () => {
  it('reuses pooled particles when particles expire', () => {
    const constantRandom = createConstantRandom(0);
    let now = 0;
    const system = new ParticleSystem({
      maxParticles: 2,
      poolSize: 4,
      random: constantRandom,
      now: () => now,
    });

    system.addParticles(0, 0, 'ambient', 2);
    const firstBatch = [...system.getParticles()];
    expect(firstBatch).toHaveLength(2);

    now = 1000;
    system.update(5000);
    expect(system.getParticles()).toHaveLength(0);

    system.addParticles(0, 0, 'ambient', 2);
    const secondBatch = [...system.getParticles()];
    expect(secondBatch).toHaveLength(2);
    secondBatch.forEach((particle) => {
      expect(firstBatch).toContain(particle);
    });
  });

  it('applies unlock physics with gravity and friction', () => {
    const constantRandom = createConstantRandom(0);
    let now = 0;
    const system = new ParticleSystem({
      random: constantRandom,
      now: () => now,
    });

    system.addParticles(0, 0, 'unlock', 1);
    const particle = system.getParticles()[0];
    const initialVx = particle.vx;
    const initialVy = particle.vy;
    const initialLife = particle.life;

    now = 1000;
    system.update(1000);

    expect(particle.vy).toBeGreaterThan(initialVy);
    expect(particle.vx).toBeLessThan(initialVx);
    expect(particle.life).toBeLessThan(initialLife);
  });

  it('adds ambient drift during updates', () => {
    const constantRandom = createConstantRandom(0);
    const system = new ParticleSystem({
      random: constantRandom,
      now: () => 0,
    });

    system.addParticles(0, 0, 'ambient', 1);
    const particle = system.getParticles()[0];
    const initialVx = particle.vx;
    const initialVy = particle.vy;

    system.update(16);

    expect(particle.vx).not.toBe(initialVx);
    expect(particle.vy).not.toBe(initialVy);
  });
});
