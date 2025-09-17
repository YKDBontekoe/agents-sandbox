import { drawConnections, drawParticles } from './effects';
import type { ConstellationLayout } from './layout/constellation';
import type {
  ConstellationNode,
  ParticleEffect,
  SkillNode,
  SkillTree,
  StarField,
  Vec2,
} from './types';
import { DEFAULT_NODE_TRANSITION, type NodeTransitionState } from './hooks/useNodeTransitions';

export interface PaintBackgroundOptions {
  size: { w: number; h: number };
  pan: Vec2;
  zoom: number;
  starField: StarField[];
  time: number;
}

export interface PaintConnectionsOptions {
  layout: ConstellationLayout;
  treeEdges: SkillTree['edges'];
  unlocked: Record<string, boolean>;
  highlightEdges: Set<string>;
  time: number;
  checkUnlock: (node: SkillNode) => { ok: boolean; reasons: string[] };
}

export interface PaintParticlesOptions {
  particles: ParticleEffect[];
  time: number;
}

export interface PaintNodesOptions {
  layout: ConstellationLayout;
  transitions: Map<string, NodeTransitionState>;
  highlightNodes: Set<string>;
  hover: ConstellationNode | null;
  selected: ConstellationNode | null;
  unlocked: Record<string, boolean>;
  time: number;
  colorFor: (category: SkillNode['category']) => string;
  canAfford: (node: SkillNode) => boolean;
  checkUnlock: (node: SkillNode) => { ok: boolean; reasons: string[] };
}

export function paintBackground(
  ctx: CanvasRenderingContext2D,
  { size, pan, zoom, starField, time }: PaintBackgroundOptions,
) {
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, size.w, size.h);

  ctx.save();
  ctx.translate(size.w / 2 + pan.x, size.h / 2 + pan.y);
  ctx.scale(zoom, zoom);

  starField.forEach((star) => {
    const twinkle = Math.sin(time * 2 + star.twinkle) * 0.3 + 0.7;
    const alpha = star.brightness * twinkle * 0.8;

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();

    if (alpha > 0.9) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(alpha - 0.9) * 0.2})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.restore();
}

export function paintConnections(
  ctx: CanvasRenderingContext2D,
  { layout, treeEdges, unlocked, highlightEdges, time, checkUnlock }: PaintConnectionsOptions,
) {
  drawConnections(ctx, layout, treeEdges, unlocked, highlightEdges, time, checkUnlock);
}

export function paintParticles(
  ctx: CanvasRenderingContext2D,
  { particles, time }: PaintParticlesOptions,
) {
  if (particles.length === 0) return;
  drawParticles(ctx, particles, time);
}

export function paintNodes(
  ctx: CanvasRenderingContext2D,
  {
    layout,
    transitions,
    highlightNodes,
    hover,
    selected,
    unlocked,
    time,
    colorFor,
    canAfford,
    checkUnlock,
  }: PaintNodesOptions,
) {
  const sectorColors: Record<SkillNode['category'], string> = {
    economic: '#0ea5e955',
    military: '#ef444455',
    mystical: '#a855f755',
    infrastructure: '#22c55e55',
    diplomatic: '#f59e0b55',
    social: '#64748b55',
  };

  const sectors = [
    { start: 0, end: Math.PI / 3, cat: 'economic' as const },
    { start: Math.PI / 3, end: (2 * Math.PI) / 3, cat: 'military' as const },
    { start: (2 * Math.PI) / 3, end: Math.PI, cat: 'mystical' as const },
    { start: Math.PI, end: (4 * Math.PI) / 3, cat: 'infrastructure' as const },
    { start: (4 * Math.PI) / 3, end: (5 * Math.PI) / 3, cat: 'diplomatic' as const },
    { start: (5 * Math.PI) / 3, end: 2 * Math.PI, cat: 'social' as const },
  ];

  ctx.save();
  sectors.forEach((sector) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 900, sector.start, sector.end);
    ctx.closePath();
    ctx.fillStyle = sectorColors[sector.cat];
    ctx.globalAlpha = 0.04;
    ctx.fill();
  });
  ctx.restore();

  layout.nodes.forEach((cNode) => {
    const { node } = cNode;
    const isUnlocked = unlocked[node.id];
    const isHovered = hover?.node.id === node.id;
    const isSelected = selected?.node.id === node.id;
    const { ok: canUnlock } = checkUnlock(node);
    const affordable = canAfford(node);
    const inHighlight = highlightNodes.has(node.id);
    const baseColor = colorFor(node.category);
    const baseRadius = 22;

    const transition = transitions.get(node.id) ?? DEFAULT_NODE_TRANSITION;
    const nodeRadius = baseRadius * transition.scale;

    if (isUnlocked || isHovered || isSelected) {
      const shadowOffset = isSelected ? 4 : isHovered ? 3 : 2;
      const shadowBlur = isSelected ? 12 : isHovered ? 8 : 6;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = shadowOffset;
      ctx.shadowOffsetY = shadowOffset;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.beginPath();
      ctx.arc(cNode.x, cNode.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    if (isUnlocked || isHovered || inHighlight) {
      const outerGlowRadius = nodeRadius + (isSelected ? 20 : isHovered ? 16 : 12);
      const outerGlow = ctx.createRadialGradient(
        cNode.x,
        cNode.y,
        nodeRadius,
        cNode.x,
        cNode.y,
        outerGlowRadius,
      );
      outerGlow.addColorStop(0, `${baseColor}${isSelected ? '60' : isHovered ? '50' : '30'}`);
      outerGlow.addColorStop(0.7, `${baseColor}${isSelected ? '20' : '10'}`);
      outerGlow.addColorStop(1, `${baseColor}00`);

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cNode.x, cNode.y, outerGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      if (isSelected || isHovered) {
        const innerGlowRadius = nodeRadius + 6;
        const innerGlow = ctx.createRadialGradient(
          cNode.x,
          cNode.y,
          nodeRadius - 2,
          cNode.x,
          cNode.y,
          innerGlowRadius,
        );
        innerGlow.addColorStop(0, `${baseColor}00`);
        innerGlow.addColorStop(0.8, `${baseColor}${isSelected ? '40' : '30'}`);
        innerGlow.addColorStop(1, `${baseColor}00`);

        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, innerGlowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const nodeGradient = ctx.createRadialGradient(cNode.x - 6, cNode.y - 6, 0, cNode.x, cNode.y, nodeRadius);

    if (isUnlocked) {
      nodeGradient.addColorStop(0, '#ffffff');
      nodeGradient.addColorStop(0.2, `${baseColor}f0`);
      nodeGradient.addColorStop(0.6, baseColor);
      nodeGradient.addColorStop(0.9, `${baseColor}cc`);
      nodeGradient.addColorStop(1, '#1a1a1a');
    } else if (canUnlock) {
      if (affordable) {
        nodeGradient.addColorStop(0, `${baseColor}cc`);
        nodeGradient.addColorStop(0.3, `${baseColor}99`);
        nodeGradient.addColorStop(0.7, `${baseColor}66`);
        nodeGradient.addColorStop(1, `${baseColor}33`);
      } else {
        nodeGradient.addColorStop(0, '#fbbf24cc');
        nodeGradient.addColorStop(0.3, '#f59e0b99');
        nodeGradient.addColorStop(0.7, '#d97706');
        nodeGradient.addColorStop(1, '#92400e');
      }
    } else {
      nodeGradient.addColorStop(0, '#6b7280');
      nodeGradient.addColorStop(0.3, '#4b5563');
      nodeGradient.addColorStop(0.7, '#374151');
      nodeGradient.addColorStop(1, '#1f2937');
    }

    ctx.fillStyle = nodeGradient;
    ctx.beginPath();
    ctx.arc(cNode.x, cNode.y, nodeRadius, 0, Math.PI * 2);
    ctx.fill();

    const borderWidth = isSelected ? 3 : isHovered || inHighlight ? 2.5 : 1.5;
    ctx.strokeStyle = isSelected
      ? '#ffffff'
      : isHovered || inHighlight
      ? canUnlock && !isUnlocked && !affordable
        ? '#f59e0b'
        : baseColor
      : '#6b7280';
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.arc(cNode.x, cNode.y, nodeRadius, 0, Math.PI * 2);
    ctx.stroke();

    if (isUnlocked) {
      ctx.strokeStyle = `${baseColor}80`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cNode.x, cNode.y, nodeRadius - 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    const iconSize = isSelected ? 14 : isHovered ? 13 : 12;
    ctx.font = `${iconSize}px 'Inter', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isUnlocked || isHovered) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText(
        {
          economic: '💰',
          military: '⚔️',
          mystical: '🔮',
          infrastructure: '🏗️',
          diplomatic: '🤝',
          social: '👥',
        }[node.category] ?? '⭐',
        cNode.x + 1,
        cNode.y + 1,
      );
    }

    ctx.fillStyle = isUnlocked ? '#ffffff' : canUnlock ? (affordable ? baseColor : '#fbbf24') : '#9ca3af';
    ctx.fillText(
      {
        economic: '💰',
        military: '⚔️',
        mystical: '🔮',
        infrastructure: '🏗️',
        diplomatic: '🤝',
        social: '👥',
      }[node.category] ?? '⭐',
      cNode.x,
      cNode.y,
    );

    if (canUnlock && !isUnlocked) {
      const pulse = Math.sin(time * 3) * 0.3 + 0.7;
      const pulseRadius = nodeRadius + 5 + Math.sin(time * 4) * 3;
      const pulseColor = canUnlock && !affordable ? '#ef4444' : baseColor;
      ctx.strokeStyle = `${pulseColor}${Math.floor(pulse * 255)
        .toString(16)
        .padStart(2, '0')}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cNode.x, cNode.y, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      const innerPulse = Math.sin(time * 5 + Math.PI) * 0.2 + 0.8;
      ctx.strokeStyle = `${baseColor}${Math.floor(innerPulse * 128)
        .toString(16)
        .padStart(2, '0')}`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cNode.x, cNode.y, nodeRadius + 2, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 4; i += 1) {
        const sparkleAngle = (time * 2 + (i * Math.PI) / 2) % (Math.PI * 2);
        const sparkleRadius = nodeRadius + 15;
        const sparkleX = cNode.x + Math.cos(sparkleAngle) * sparkleRadius;
        const sparkleY = cNode.y + Math.sin(sparkleAngle) * sparkleRadius;

        ctx.fillStyle = `${baseColor}80`;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}
