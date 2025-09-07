import type {
  AnimatedConnection,
  ConstellationNode,
  ParticleEffect,
  SkillNode,
} from './types';

// Optimized particle system with object pooling
export class ParticleSystem {
  private particles: ParticleEffect[] = [];
  private pool: ParticleEffect[] = [];
  private maxParticles = 150; // Reduced for better performance

  createParticle(
    x: number,
    y: number,
    type: ParticleEffect['type'],
    color?: string,
  ): ParticleEffect {
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
        color: '',
        type: 'ambient',
      };
    }

    particle.id = `${Date.now()}-${Math.random()}`;
    particle.x = x + (Math.random() - 0.5) * 8; // Add position variance
    particle.y = y + (Math.random() - 0.5) * 8;
    particle.type = type;

    switch (type) {
      case 'unlock': {
        // Explosive radial burst
        const unlockAngle = Math.random() * Math.PI * 2;
        const unlockSpeed = 40 + Math.random() * 60;
        particle.vx = Math.cos(unlockAngle) * unlockSpeed;
        particle.vy = Math.sin(unlockAngle) * unlockSpeed;
        particle.life = 1200 + Math.random() * 800;
        particle.maxLife = particle.life;
        particle.size = 3 + Math.random() * 4;
        particle.color = color || '#ffd700';
        break;
      }
      case 'hover': {
        // Gentle upward float with sparkle
        const hoverAngle = Math.random() * Math.PI * 2;
        const hoverSpeed = 15 + Math.random() * 25;
        particle.vx = Math.cos(hoverAngle) * hoverSpeed * 0.6;
        particle.vy = Math.sin(hoverAngle) * hoverSpeed * 0.6 - 10; // Upward bias
        particle.life = 800 + Math.random() * 400;
        particle.maxLife = particle.life;
        particle.size = 1.5 + Math.random() * 2.5;
        particle.color = color || '#64b5f6';
        break;
      }
      case 'connection': {
        // Flowing energy along connections
        const connAngle = Math.random() * Math.PI * 2;
        const connSpeed = 25 + Math.random() * 35;
        particle.vx = Math.cos(connAngle) * connSpeed * 0.8;
        particle.vy = Math.sin(connAngle) * connSpeed * 0.8;
        particle.life = 1000 + Math.random() * 600;
        particle.maxLife = particle.life;
        particle.size = 2 + Math.random() * 3;
        particle.color = color || '#9c27b0';
        break;
      }
      case 'ambient': {
        // Subtle twinkling background stars
        const ambientAngle = Math.random() * Math.PI * 2;
        const ambientSpeed = 5 + Math.random() * 15;
        particle.vx = Math.cos(ambientAngle) * ambientSpeed;
        particle.vy = Math.sin(ambientAngle) * ambientSpeed;
        particle.life = 2000 + Math.random() * 1500;
        particle.maxLife = particle.life;
        particle.size = 1 + Math.random() * 2;
        particle.color = color || '#ffffff';
        break;
      }
    }

    return particle;
  }

  addParticles(
    x: number,
    y: number,
    type: ParticleEffect['type'],
    count: number = 5,
    color?: string,
  ) {
    if (this.particles.length + count > this.maxParticles) {
      // Remove oldest particles to make room
      const toRemove = this.particles.length + count - this.maxParticles;
      for (let i = 0; i < toRemove; i++) {
        const removed = this.particles.shift();
        if (removed && this.pool.length < 50) {
          this.pool.push(removed);
        }
      }
    }

    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(x, y, type, color));
    }
  }

  update(dt: number): ParticleEffect[] {
    const activeParticles: ParticleEffect[] = [];
    const dtSec = dt * 0.001;

    for (const particle of this.particles) {
      // Update position
      particle.x += particle.vx * dtSec;
      particle.y += particle.vy * dtSec;
      particle.life -= dt;

      // Apply type-specific physics
      switch (particle.type) {
        case 'unlock':
          // Explosive particles with gravity and strong friction
          particle.vy += 30 * dtSec; // Gravity
          particle.vx *= 0.95;
          particle.vy *= 0.95;
          break;
        case 'hover':
          // Floating particles with gentle drift
          particle.vy -= 5 * dtSec; // Slight upward force
          particle.vx *= 0.98;
          particle.vy *= 0.98;
          // Add subtle oscillation
          particle.vx += Math.sin(Date.now() * 0.003 + particle.x * 0.01) * 2;
          break;
        case 'connection':
          // Energy flow with minimal friction
          particle.vx *= 0.99;
          particle.vy *= 0.99;
          break;
        case 'ambient':
          // Gentle twinkling with very slow movement
          particle.vx *= 0.995;
          particle.vy *= 0.995;
          // Add subtle drift
          particle.vx += (Math.random() - 0.5) * 0.5;
          particle.vy += (Math.random() - 0.5) * 0.5;
          break;
      }

      if (particle.life > 0) {
        activeParticles.push(particle);
      } else if (this.pool.length < 50) {
        this.pool.push(particle);
      }
    }

    this.particles = activeParticles;
    return this.particles;
  }

  getParticles(): ParticleEffect[] {
    return this.particles;
  }

  clear() {
    this.pool.push(...this.particles);
    this.particles = [];
  }
}

export function updateConnections(
  connections: AnimatedConnection[],
  dt: number,
): AnimatedConnection[] {
  return connections.map((conn) => ({
    ...conn,
    progress: Math.min(1, conn.progress + dt * 0.002),
  }));
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: ParticleEffect[],
  time: number,
) {
  if (particles.length === 0) return;

  // Set additive blending for glowing effects
  ctx.globalCompositeOperation = 'screen';

  // Group particles by type for batched rendering
  const particlesByType = new Map<string, ParticleEffect[]>();
  particles.forEach((particle) => {
    const key = `${particle.type}-${particle.color}`;
    if (!particlesByType.has(key)) {
      particlesByType.set(key, []);
    }
    particlesByType.get(key)!.push(particle);
  });

  // Render each group with enhanced visual effects
  particlesByType.forEach((groupParticles) => {
    groupParticles.forEach((particle) => {
      const lifeRatio = particle.life / particle.maxLife;
      const alpha = Math.pow(lifeRatio, 0.8); // Smoother fade
      const size = particle.size * (0.3 + lifeRatio * 0.7);

      switch (particle.type) {
        case 'unlock': {
          // Explosive golden particles with intense glow
          const unlockGlow = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            size * 3,
          );
          unlockGlow.addColorStop(0, `rgba(255, 215, 0, ${alpha * 0.9})`);
          unlockGlow.addColorStop(0.3, `rgba(255, 165, 0, ${alpha * 0.6})`);
          unlockGlow.addColorStop(0.7, `rgba(255, 100, 0, ${alpha * 0.3})`);
          unlockGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');

          ctx.fillStyle = unlockGlow;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 3, 0, Math.PI * 2);
          ctx.fill();

          // Core particle
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();

          // Dynamic trail effect
          if (alpha > 0.2) {
            const trailGradient = ctx.createLinearGradient(
              particle.x - particle.vx * 0.02,
              particle.y - particle.vy * 0.02,
              particle.x,
              particle.y,
            );
            trailGradient.addColorStop(0, 'rgba(255, 100, 0, 0)');
            trailGradient.addColorStop(1, `rgba(255, 200, 0, ${alpha * 0.6})`);

            ctx.strokeStyle = trailGradient;
            ctx.lineWidth = size * 0.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(
              particle.x - particle.vx * 0.02,
              particle.y - particle.vy * 0.02,
            );
            ctx.lineTo(particle.x, particle.y);
            ctx.stroke();
          }
          break;
        }
        case 'hover': {
          // Gentle blue sparkles with soft glow
          const hoverGlow = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            size * 2.5,
          );
          hoverGlow.addColorStop(0, `rgba(100, 181, 246, ${alpha * 0.8})`);
          hoverGlow.addColorStop(0.5, `rgba(66, 165, 245, ${alpha * 0.4})`);
          hoverGlow.addColorStop(1, 'rgba(33, 150, 243, 0)');

          ctx.fillStyle = hoverGlow;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'connection': {
          // Energy connection particles with purple hue
          const connGlow = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            size * 2.5,
          );
          connGlow.addColorStop(0, `rgba(156, 39, 176, ${alpha * 0.8})`);
          connGlow.addColorStop(0.5, `rgba(123, 31, 162, ${alpha * 0.4})`);
          connGlow.addColorStop(1, 'rgba(81, 45, 168, 0)');

          ctx.fillStyle = connGlow;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'ambient': {
          // Subtle twinkling
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Subtle twinkling
          const ambientTwinkle = Math.sin(time * 3 + particle.y * 0.05) * 0.4 + 0.6;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * ambientTwinkle})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    });
  });

  // Reset composite operation and alpha
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

export function drawConnections(
  ctx: CanvasRenderingContext2D,
  layout: { nodes: ConstellationNode[] },
  unlocked: Record<string, boolean>,
  highlightEdges: Set<string>,
  time: number,
  checkUnlock: (node: SkillNode) => { ok: boolean },
) {
  layout.nodes.forEach((nodeA) => {
    (nodeA.node.requires || []).forEach((reqId) => {
      const nodeB = layout.nodes.find((n) => n.node.id === reqId);
      if (!nodeB) return;

      const isUnlocked = unlocked[nodeA.node.id] || unlocked[nodeB.node.id];
      const nextAvailable = !unlocked[nodeA.node.id] && checkUnlock(nodeA.node).ok;
      const isHighlighted = highlightEdges.has(`${reqId}->${nodeA.node.id}`);
      if (!(isUnlocked || nextAvailable || isHighlighted)) return;
      const alpha = isUnlocked ? 0.8 : nextAvailable ? 0.8 : 0.6;

      // Animated connection line
      const gradient = ctx.createLinearGradient(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
      gradient.addColorStop(0, `rgba(100, 200, 255, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(150, 150, 255, ${alpha * 1.5})`);
      gradient.addColorStop(1, `rgba(100, 200, 255, ${alpha})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = isHighlighted ? 4 : isUnlocked ? 3 : 3;
      ctx.setLineDash(isUnlocked ? [] : nextAvailable ? [3, 4] : []);

      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.stroke();

      // Enhanced flowing energy effect for unlocked connections
      if (isUnlocked) {
        for (let i = 0; i < 3; i++) {
          const flowPos = ((time * 0.5) + i * 0.33) % 1;
          const flowX = nodeA.x + (nodeB.x - nodeA.x) * flowPos;
          const flowY = nodeA.y + (nodeB.y - nodeA.y) * flowPos;

          // Main energy orb
          const orbGradient = ctx.createRadialGradient(flowX, flowY, 0, flowX, flowY, 6);
          orbGradient.addColorStop(0, 'rgba(150, 200, 255, 0.9)');
          orbGradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.6)');
          orbGradient.addColorStop(1, 'rgba(50, 100, 255, 0)');

          ctx.fillStyle = orbGradient;
          ctx.beginPath();
          ctx.arc(flowX, flowY, 6, 0, Math.PI * 2);
          ctx.fill();

          // Energy trail
          const trailX = flowX - (nodeB.x - nodeA.x) * 0.05;
          const trailY = flowY - (nodeB.y - nodeA.y) * 0.05;
          const trailGradient = ctx.createLinearGradient(trailX, trailY, flowX, flowY);
          trailGradient.addColorStop(0, 'rgba(100, 150, 255, 0)');
          trailGradient.addColorStop(1, 'rgba(150, 200, 255, 0.4)');

          ctx.strokeStyle = trailGradient;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(trailX, trailY);
          ctx.lineTo(flowX, flowY);
          ctx.stroke();
        }
      }
    });
  });

  ctx.setLineDash([]);
}
