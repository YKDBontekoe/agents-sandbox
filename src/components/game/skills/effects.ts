import type {
  AnimatedConnection,
  ConstellationNode,
  ParticleEffect,
  SkillNode,
  SkillTree,
} from './types';

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
  edges: SkillTree['edges'],
  unlocked: Record<string, boolean>,
  highlightEdges: Set<string>,
  time: number,
  checkUnlock: (node: SkillNode) => { ok: boolean },
) {
  const nodesById = new Map<string, ConstellationNode>();
  layout.nodes.forEach((node) => {
    nodesById.set(node.node.id, node);
  });

  const unlockableCache = new Map<string, boolean>();
  const isUnlockable = (node: SkillNode) => {
    if (!unlockableCache.has(node.id)) {
      unlockableCache.set(node.id, checkUnlock(node).ok);
    }
    return unlockableCache.get(node.id)!;
  };

  const prerequisiteEdgeKeys = new Set<string>();

  layout.nodes.forEach((nodeA) => {
    (nodeA.node.requires || []).forEach((reqId) => {
      const nodeB = nodesById.get(reqId);
      if (!nodeB) return;

      const edgeKey = `${reqId}->${nodeA.node.id}`;
      prerequisiteEdgeKeys.add(edgeKey);

      const isUnlocked = unlocked[nodeA.node.id] || unlocked[nodeB.node.id];
      const nextAvailable = !unlocked[nodeA.node.id] && isUnlockable(nodeA.node);
      const isHighlighted = highlightEdges.has(edgeKey);
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

  const previousLineCap = ctx.lineCap;
  const syntheticEdgeKeys = new Set<string>();

  edges.forEach((edge) => {
    const fromNode = nodesById.get(edge.from);
    const toNode = nodesById.get(edge.to);
    if (!fromNode || !toNode) return;

    const edgeKey = `${edge.from}->${edge.to}`;
    if (prerequisiteEdgeKeys.has(edgeKey) || syntheticEdgeKeys.has(edgeKey)) {
      return;
    }
    syntheticEdgeKeys.add(edgeKey);

    const highlightKey = `bridge:${edgeKey}`;
    const fromUnlocked = !!unlocked[edge.from];
    const toUnlocked = !!unlocked[edge.to];
    const fromAvailable = !fromUnlocked && isUnlockable(fromNode.node);
    const toAvailable = !toUnlocked && isUnlockable(toNode.node);
    const isHighlighted = highlightEdges.has(highlightKey);
    if (!(fromUnlocked || toUnlocked || fromAvailable || toAvailable || isHighlighted)) {
      return;
    }

    const anyUnlocked = fromUnlocked || toUnlocked;
    const alphaBase = isHighlighted ? 0.9 : anyUnlocked ? 0.6 : 0.45;
    const gradient = ctx.createLinearGradient(fromNode.x, fromNode.y, toNode.x, toNode.y);
    gradient.addColorStop(0, `rgba(255, 180, 120, ${alphaBase * 0.85})`);
    gradient.addColorStop(0.5, `rgba(160, 140, 255, ${alphaBase})`);
    gradient.addColorStop(1, `rgba(120, 210, 255, ${alphaBase * 0.85})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = isHighlighted ? 3.5 : 2.5;
    ctx.lineCap = 'round';
    ctx.setLineDash(isHighlighted ? [8, 6] : [6, 10]);

    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.stroke();

    if (anyUnlocked || isHighlighted) {
      const seed =
        ((edge.from.charCodeAt(0) * 31 + edge.to.charCodeAt(0) * 17) % 997) / 997;
      for (let i = 0; i < 2; i++) {
        const flowPos = (time * 0.3 + seed + i * 0.5) % 1;
        const flowX = fromNode.x + (toNode.x - fromNode.x) * flowPos;
        const flowY = fromNode.y + (toNode.y - fromNode.y) * flowPos;

        const orbGradient = ctx.createRadialGradient(flowX, flowY, 0, flowX, flowY, 5);
        const orbAlpha = isHighlighted ? 0.85 : 0.55;
        orbGradient.addColorStop(0, `rgba(255, 255, 255, ${orbAlpha})`);
        orbGradient.addColorStop(0.6, `rgba(199, 210, 254, ${orbAlpha * 0.6})`);
        orbGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(flowX, flowY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  ctx.lineCap = previousLineCap;
  ctx.setLineDash([]);
}
