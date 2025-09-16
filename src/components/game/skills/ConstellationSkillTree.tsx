"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  SkillNode,
  Vec2,
  ConstellationSkillTreeProps,
  StarField,
  ConstellationNode,
  TooltipState,
} from './types';
import { useAnimationFrame } from './hooks';
import {
  ParticleSystem,
  drawParticles,
  drawConnections,
} from './effects';
import SkillTooltipContent from './SkillTooltipContent';
import { collectUnlockBlockers } from './unlock';

export default function ConstellationSkillTree({ tree, unlocked, onUnlock, colorFor, focusNodeId, resources, onSelectNode }: ConstellationSkillTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{w:number;h:number}>({ w: 1200, h: 800 });
  const [hover, setHover] = useState<ConstellationNode | null>(null);
  const [selected, setSelected] = useState<ConstellationNode | null>(null);
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(0.8); // Start slightly zoomed out for better overview
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
    fadeIn: 0,
    anchor: 'top',
    offset: { x: 0, y: 0 }
  });
  const [starField, setStarField] = useState<StarField[]>([]);
  const [time, setTime] = useState<number>(0);
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightEdges, setHighlightEdges] = useState<Set<string>>(new Set());
  const lastAutoFitRadius = useRef<number | null>(null);
  const [nodeTransitions, setNodeTransitions] = useState<Map<string, {
    scale: number;
    opacity: number;
    glowIntensity: number;
    targetScale: number;
    targetOpacity: number;
    targetGlowIntensity: number;
    lastUpdate: number;
  }>>(new Map());
  const lastRenderTime = useRef<number>(0);
  const RENDER_THROTTLE = 16; // ~60fps
  const dragRef = useRef<{ dragging: boolean; start: Vec2; startPan: Vec2 }>({
    dragging: false,
    start: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 }
  });
  const zoomAnimationRef = useRef<number | null>(null);
  const latestZoomRef = useRef(zoom);
  const hoverTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const hoverTargetRef = useRef<ConstellationNode | null>(null);

  const clearZoomAnimation = useCallback(() => {
    if (zoomAnimationRef.current !== null) {
      cancelAnimationFrame(zoomAnimationRef.current);
      zoomAnimationRef.current = null;
    }
  }, []);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    latestZoomRef.current = zoom;
  }, [zoom]);

  const hideTooltip = useCallback(() => {
    clearHoverTimeout();
    setTooltip(prev => {
      if (!prev.visible && prev.node === null && prev.fadeIn === 0) {
        return prev;
      }

      return {
        ...prev,
        visible: false,
        fadeIn: 0,
        node: null
      };
    });
  }, [clearHoverTimeout]);

  useEffect(() => () => {
    clearZoomAnimation();
    clearHoverTimeout();
  }, [clearZoomAnimation, clearHoverTimeout]);

  // Easing functions for smooth transitions
  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

  // Update node transition states
  const updateNodeTransition = useCallback((nodeId: string, targetState: {
    scale?: number;
    opacity?: number;
    glowIntensity?: number;
  }) => {
    setNodeTransitions(prev => {
      const current = prev.get(nodeId) || {
        scale: 1,
        opacity: 1,
        glowIntensity: 0,
        targetScale: 1,
        targetOpacity: 1,
        targetGlowIntensity: 0,
        lastUpdate: Date.now()
      };
      
      return new Map(prev).set(nodeId, {
        ...current,
        targetScale: targetState.scale ?? current.targetScale,
        targetOpacity: targetState.opacity ?? current.targetOpacity,
        targetGlowIntensity: targetState.glowIntensity ?? current.targetGlowIntensity,
        lastUpdate: Date.now()
      });
    });
  }, []);

  // Generate constellation layout - grid-based with stellar themes
  const layout = useMemo(() => {
    const constellations = {
      'Warrior': { color: '#ff6b6b', theme: 'combat' },
      'Scholar': { color: '#4ecdc4', theme: 'knowledge' },
      'Merchant': { color: '#45b7d1', theme: 'trade' },
      'Mystic': { color: '#96ceb4', theme: 'magic' },
      'Builder': { color: '#feca57', theme: 'construction' },
      'Diplomat': { color: '#ff9ff3', theme: 'social' }
    };

    const nodes: ConstellationNode[] = [];
    const nodesByConstellation: Record<string, ConstellationNode[]> = {};
    let highestTierInNodes = 0;

    // Organize nodes by category into constellations
    tree.nodes.forEach((node) => {
      const constellation = {
        economic: 'Merchant',
        military: 'Warrior',
        mystical: 'Mystic',
        infrastructure: 'Builder',
        diplomatic: 'Diplomat',
        social: 'Scholar'
      }[node.category] || 'Scholar';

      if (!nodesByConstellation[constellation]) {
        nodesByConstellation[constellation] = [];
      }

      const tier = typeof node.tier === 'number' && Number.isFinite(node.tier)
        ? Math.max(0, Math.floor(node.tier))
        : 0;
      highestTierInNodes = Math.max(highestTierInNodes, tier);

      nodesByConstellation[constellation].push({
        node,
        gridX: 0,
        gridY: 0,
        x: 0,
        y: 0,
        constellation,
        tier
      });
    });

    const layoutMaxTier = typeof tree.layout?.maxTier === 'number' && Number.isFinite(tree.layout.maxTier)
      ? Math.max(0, Math.floor(tree.layout.maxTier))
      : highestTierInNodes;
    const maxTier = Math.max(0, highestTierInNodes, layoutMaxTier);
    const tierCount = Math.max(1, maxTier + 1);

    const baseRingRadius = 80;
    const minRingGap = 60;
    const maxRingGap = 140;
    const gapDenominator = Math.max(1, tierCount - 1);
    const adaptiveGap = tierCount > 1 ? 320 / gapDenominator : maxRingGap;
    const ringGap = Math.min(maxRingGap, Math.max(minRingGap, adaptiveGap));
    const radiusByTier = Array.from({ length: tierCount }, (_, tierIndex) => baseRingRadius + tierIndex * ringGap);
    const maxConstellationRadius = radiusByTier[radiusByTier.length - 1] ?? baseRingRadius;
    const constellationSpacing = Math.max(450, maxConstellationRadius * 2 + 160);

    // Position constellations in a hexagonal pattern
    const constellationPositions = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 0.866 },
      { x: -0.5, y: 0.866 },
      { x: -1, y: 0 },
      { x: -0.5, y: -0.866 },
      { x: 0.5, y: -0.866 }
    ];

    let constellationIndex = 0;
    Object.values(nodesByConstellation).forEach((constellationNodes) => {
      const pos = constellationPositions[constellationIndex % constellationPositions.length];
      const centerX = pos.x * constellationSpacing;
      const centerY = pos.y * constellationSpacing;

      // Arrange nodes in a spiral pattern within each constellation
      constellationNodes.forEach((cNode, nodeIndex) => {
        const angle = (nodeIndex / constellationNodes.length) * Math.PI * 2;
        const tier = typeof cNode.tier === 'number' && Number.isFinite(cNode.tier)
          ? Math.max(0, Math.floor(cNode.tier))
          : 0;
        const radius = radiusByTier[tier] ?? (baseRingRadius + tier * ringGap);

        cNode.gridX = Math.round(centerX + Math.cos(angle) * radius);
        cNode.gridY = Math.round(centerY + Math.sin(angle) * radius);
        cNode.x = cNode.gridX;
        cNode.y = cNode.gridY;

        nodes.push(cNode);
      });

      constellationIndex++;
    });

    return {
      nodes,
      constellations,
      metrics: {
        baseRingRadius,
        ringGap,
        radiusByTier,
        maxConstellationRadius,
        maxTier,
        constellationSpacing
      }
    };
  }, [tree]);

  // Unified unlock check with exclusivity and additional conditions
  const checkUnlock = useCallback((node: SkillNode) => {
    const reasons = collectUnlockBlockers({ node, unlocked, nodes: tree.nodes });
    return { ok: reasons.length === 0, reasons };
  }, [tree.nodes, unlocked]);

  // Affordability check
  const canAfford = useCallback((node: SkillNode) => {
    if (!resources) return true;
    const c: SkillNode['cost'] = node.cost ?? {};
    const r = resources;
    if (typeof c.coin === 'number' && (r.coin || 0) < c.coin) return false;
    if (typeof c.mana === 'number' && (r.mana || 0) < c.mana) return false;
    if (typeof c.favor === 'number' && (r.favor || 0) < c.favor) return false;
    return true;
  }, [resources]);

  // Generate star field background (reduced count for performance)
  useEffect(() => {
    const stars: StarField[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * 2400 - 1200,
        y: Math.random() * 1600 - 800,
        brightness: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        size: Math.random() * 2 + 0.5
      });
    }
    setStarField(stars);
  }, []);



  // Build quick lookup map for layout nodes by id
  const layoutById = useMemo(() => {
    const m = new Map<string, ConstellationNode>();
    layout.nodes.forEach(n => m.set(n.node.id, n));
    return m;
  }, [layout.nodes]);

  // Focus on a node id when provided
  useEffect(() => {
    if (!focusNodeId) return;
    const n = layoutById.get(focusNodeId);
    if (!n) return;
    // Center and zoom to node
    clearZoomAnimation();
    const focusZoom = Math.min(2.5, Math.max(0.7, 1.4));
    latestZoomRef.current = focusZoom;
    setZoom(focusZoom);
    setPan({ x: -n.x, y: -n.y });
    setSelected(n);
  }, [clearZoomAnimation, focusNodeId, layoutById]);

  // Compute highlight sets for hover (ancestors and dependents)
  useEffect(() => {
    const targetId = hover ? hover.node.id : (selected ? selected.node.id : null);
    if (!targetId) { setHighlightNodes(new Set()); setHighlightEdges(new Set()); return; }
    const nodeId = targetId;
    const nodeSet = new Set<string>();
    const edgeSet = new Set<string>();

    // ancestors (requirements)
    const visitAnc = (id: string) => {
      const node = tree.nodes.find(n => n.id === id);
      if (!node) return;
      nodeSet.add(id);
      (node.requires || []).forEach(req => {
        nodeSet.add(req);
        edgeSet.add(`${req}->${id}`);
        visitAnc(req);
      });
    };
    visitAnc(nodeId);

    // dependents (who require this node)
    const visitDep = (id: string) => {
      tree.nodes.forEach(n => {
        if ((n.requires || []).includes(id)) {
          nodeSet.add(n.id);
          edgeSet.add(`${id}->${n.id}`);
          visitDep(n.id);
        }
      });
    };
    visitDep(nodeId);

    setHighlightNodes(nodeSet);
    setHighlightEdges(edgeSet);
  }, [hover, selected, tree.nodes]);

  // Enhanced animation loop with smooth transitions
  useAnimationFrame(useCallback((dt: number) => {
    const now = Date.now();
    setTime(t => t + dt * 0.001);
    
    // Update tooltip fade in
    if (tooltip.visible && tooltip.fadeIn < 1) {
      setTooltip(prev => ({ ...prev, fadeIn: Math.min(1, prev.fadeIn + dt * 0.003) }));
    }

    // Update node transitions with smooth interpolation
    setNodeTransitions(prev => {
      const updated = new Map();
      const transitionDuration = 300; // ms
      
      for (const [nodeId, transition] of prev) {
        const elapsed = now - transition.lastUpdate;
        const progress = Math.min(1, elapsed / transitionDuration);
        
        if (progress < 1) {
          // Apply easing based on transition type
          const easedProgress = easeOutCubic(progress);
          
          updated.set(nodeId, {
            ...transition,
            scale: transition.scale + (transition.targetScale - transition.scale) * easedProgress,
            opacity: transition.opacity + (transition.targetOpacity - transition.opacity) * easedProgress,
            glowIntensity: transition.glowIntensity + (transition.targetGlowIntensity - transition.glowIntensity) * easedProgress
          });
        } else {
          // Transition complete
          updated.set(nodeId, {
            ...transition,
            scale: transition.targetScale,
            opacity: transition.targetOpacity,
            glowIntensity: transition.targetGlowIntensity
          });
        }
      }
      
      return updated;
    });

    // Update particles with optimized system
    particleSystemRef.current.update(dt);


    // Generate ambient particles occasionally (further reduced frequency for performance)
    if (Math.random() < 0.002) {
      const x = (Math.random() - 0.5) * 1200;
      const y = (Math.random() - 0.5) * 800;
      particleSystemRef.current.addParticles(x, y, 'ambient', 1, '#4a90e2');
    }
  }, [tooltip.visible, tooltip.fadeIn]));

  // Canvas rendering with performance optimizations and throttling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Throttle rendering for better performance
    const now = Date.now();
    if (now - lastRenderTime.current < RENDER_THROTTLE) {
      return;
    }
    lastRenderTime.current = now;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Limit DPR for performance
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.scale(dpr, dpr);
    
    // Enable performance optimizations
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, size.w, size.h);

    ctx.save();
    ctx.translate(size.w / 2 + pan.x, size.h / 2 + pan.y);
    ctx.scale(zoom, zoom);

    // Draw star field with optimized rendering (reduced glow calculations)
    starField.forEach(star => {
      const twinkle = Math.sin(time * 2 + star.twinkle) * 0.3 + 0.7;
      const alpha = star.brightness * twinkle * 0.8;
      
      // Main star with simplified rendering
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Reduced glow effect (only for brightest stars)
      if (alpha > 0.9) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha - 0.9) * 0.2})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    drawParticles(ctx, particleSystemRef.current.getParticles(), time);
    drawConnections(ctx, layout, unlocked, highlightEdges, time, checkUnlock);

    // Draw category sector arcs (very subtle)
    ctx.save();
    const sectorColors: Record<SkillNode['category'], string> = {
      economic: '#0ea5e955', military: '#ef444455', mystical: '#a855f755', infrastructure: '#22c55e55', diplomatic: '#f59e0b55', social: '#64748b55'
    };
    const sectors = [
      { start: 0, end: Math.PI/3, cat: 'economic' as const },
      { start: Math.PI/3, end: 2*Math.PI/3, cat: 'military' as const },
      { start: 2*Math.PI/3, end: Math.PI, cat: 'mystical' as const },
      { start: Math.PI, end: 4*Math.PI/3, cat: 'infrastructure' as const },
      { start: 4*Math.PI/3, end: 5*Math.PI/3, cat: 'diplomatic' as const },
      { start: 5*Math.PI/3, end: 2*Math.PI, cat: 'social' as const },
    ];
    sectors.forEach(s => {
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0, 900, s.start, s.end);
      ctx.closePath();
      ctx.fillStyle = sectorColors[s.cat];
      ctx.globalAlpha = 0.04;
      ctx.fill();
    });
    ctx.restore();

    // Draw skill nodes with enhanced visual design and smooth transitions
    layout.nodes.forEach(cNode => {
      const { node } = cNode;
      const isUnlocked = unlocked[node.id];
      const isHovered = hover?.node.id === node.id;
      const isSelected = selected?.node.id === node.id;
      const { ok: canUnlock } = checkUnlock(node);
      const affordable = canAfford(node);
      const inHighlight = highlightNodes.has(node.id);
      
      const baseColor = colorFor(node.category);
      const baseRadius = 22; // Base radius for calculations
      
      // Get transition state for smooth animations
      const transition = nodeTransitions.get(node.id) || {
        scale: 1,
        opacity: 1,
        glowIntensity: 0,
        targetScale: 1,
        targetOpacity: 1,
        targetGlowIntensity: 0,
        lastUpdate: Date.now()
      };
      
      const nodeRadius = baseRadius * transition.scale;
      
      // Enhanced shadow effect for depth
      if (isUnlocked || isHovered || isSelected) {
        const shadowOffset = isSelected ? 4 : (isHovered ? 3 : 2);
        const shadowBlur = isSelected ? 12 : (isHovered ? 8 : 6);
        
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = shadowOffset;
        ctx.shadowOffsetY = shadowOffset;
        
        // Shadow circle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
      
      // Multi-layer glow effect for better visual hierarchy
      if (isUnlocked || isHovered || inHighlight) {
        // Outer glow
        const outerGlowRadius = nodeRadius + (isSelected ? 20 : (isHovered ? 16 : 12));
        const outerGlow = ctx.createRadialGradient(cNode.x, cNode.y, nodeRadius, cNode.x, cNode.y, outerGlowRadius);
        outerGlow.addColorStop(0, `${baseColor}${isSelected ? '60' : (isHovered ? '50' : '30')}`);
        outerGlow.addColorStop(0.7, `${baseColor}${isSelected ? '20' : '10'}`);
        outerGlow.addColorStop(1, `${baseColor}00`);
        
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, outerGlowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner glow for more definition
        if (isSelected || isHovered) {
          const innerGlowRadius = nodeRadius + 6;
          const innerGlow = ctx.createRadialGradient(cNode.x, cNode.y, nodeRadius - 2, cNode.x, cNode.y, innerGlowRadius);
          innerGlow.addColorStop(0, `${baseColor}00`);
          innerGlow.addColorStop(0.8, `${baseColor}${isSelected ? '40' : '30'}`);
          innerGlow.addColorStop(1, `${baseColor}00`);
          
          ctx.fillStyle = innerGlow;
          ctx.beginPath();
          ctx.arc(cNode.x, cNode.y, innerGlowRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Enhanced main node with sophisticated gradients
      const nodeGradient = ctx.createRadialGradient(
        cNode.x - 6, cNode.y - 6, 0,
        cNode.x, cNode.y, nodeRadius
      );
      
      if (isUnlocked) {
        // Unlocked nodes: bright, premium appearance
        nodeGradient.addColorStop(0, '#ffffff');
        nodeGradient.addColorStop(0.2, `${baseColor}f0`);
        nodeGradient.addColorStop(0.6, baseColor);
        nodeGradient.addColorStop(0.9, `${baseColor}cc`);
        nodeGradient.addColorStop(1, '#1a1a1a');
      } else if (canUnlock) {
        if (affordable) {
          // Available and affordable: inviting appearance
          nodeGradient.addColorStop(0, `${baseColor}cc`);
          nodeGradient.addColorStop(0.3, `${baseColor}99`);
          nodeGradient.addColorStop(0.7, `${baseColor}66`);
          nodeGradient.addColorStop(1, `${baseColor}33`);
        } else {
          // Available but not affordable: warning appearance
          nodeGradient.addColorStop(0, '#fbbf24cc');
          nodeGradient.addColorStop(0.3, '#f59e0b99');
          nodeGradient.addColorStop(0.7, '#d97706');
          nodeGradient.addColorStop(1, '#92400e');
        }
      } else {
        // Locked nodes: muted, professional appearance
        nodeGradient.addColorStop(0, '#6b7280');
        nodeGradient.addColorStop(0.3, '#4b5563');
        nodeGradient.addColorStop(0.7, '#374151');
        nodeGradient.addColorStop(1, '#1f2937');
      }
      
      ctx.fillStyle = nodeGradient;
      ctx.beginPath();
      ctx.arc(cNode.x, cNode.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Enhanced border with multiple layers for depth
      const borderWidth = isSelected ? 3 : ((isHovered || inHighlight) ? 2.5 : 1.5);
      
      // Outer border
      ctx.strokeStyle = isSelected ? '#ffffff' : 
                       (isHovered || inHighlight ? 
                         (canUnlock && !isUnlocked && !affordable ? '#f59e0b' : baseColor) : 
                         '#6b7280');
      ctx.lineWidth = borderWidth;
      ctx.beginPath();
      ctx.arc(cNode.x, cNode.y, nodeRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner border for premium feel on unlocked nodes
      if (isUnlocked) {
        ctx.strokeStyle = `${baseColor}80`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, nodeRadius - 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Enhanced icon rendering with better typography
      const iconSize = isSelected ? 14 : (isHovered ? 13 : 12);
      ctx.font = `${iconSize}px 'Inter', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Icon shadow for better readability
      if (isUnlocked || isHovered) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(
          {
            economic: '💰',
            military: '⚔️', 
            mystical: '🔮',
            infrastructure: '🏗️',
            diplomatic: '🤝',
            social: '👥'
          }[node.category] || '⭐',
          cNode.x + 1, cNode.y + 1
        );
      }
      
      // Main icon
      ctx.fillStyle = isUnlocked ? '#ffffff' : 
                     (canUnlock ? (affordable ? baseColor : '#fbbf24') : '#9ca3af');
      ctx.fillText(
        {
          economic: '💰',
          military: '⚔️', 
          mystical: '🔮',
          infrastructure: '🏗️',
          diplomatic: '🤝',
          social: '👥'
        }[node.category] || '⭐',
        cNode.x, cNode.y
      );
      
      // Enhanced pulsing effect for available nodes
      if (canUnlock && !isUnlocked) {
        const pulse = Math.sin(time * 3) * 0.3 + 0.7;
        const pulseRadius = nodeRadius + 5 + Math.sin(time * 4) * 3;
        
        // Outer pulse ring
        const pulseColor = canUnlock && !affordable ? '#ef4444' : baseColor;
        ctx.strokeStyle = `${pulseColor}${Math.floor(pulse * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner pulse ring
        const innerPulse = Math.sin(time * 5 + Math.PI) * 0.2 + 0.8;
        ctx.strokeStyle = `${baseColor}${Math.floor(innerPulse * 128).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, nodeRadius + 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Sparkle effects around available nodes
        for (let i = 0; i < 4; i++) {
          const sparkleAngle = (time * 2 + i * Math.PI / 2) % (Math.PI * 2);
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

    ctx.restore();
  }, [layout, unlocked, hover, selected, pan, zoom, time, starField, colorFor, size, canAfford, checkUnlock, highlightEdges, highlightNodes, nodeTransitions]);

  // Mouse event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (dragRef.current.dragging) {
      const dx = mouseX - dragRef.current.start.x;
      const dy = mouseY - dragRef.current.start.y;

      if (dx !== 0 || dy !== 0) {
        hoverTargetRef.current = null;
        if (hover) {
          updateNodeTransition(hover.node.id, {
            scale: 1,
            glowIntensity: 0
          });
          setHover(null);
        }
        hideTooltip();
      }

      setPan({
        x: dragRef.current.startPan.x + dx,
        y: dragRef.current.startPan.y + dy
      });
      return;
    }

    // Transform mouse coordinates to world space
    const worldX = (mouseX - size.w / 2 - pan.x) / zoom;
    const worldY = (mouseY - size.h / 2 - pan.y) / zoom;

    // Check for node hover
    let hoveredNode: ConstellationNode | null = null;
    for (const cNode of layout.nodes) {
      const dx = worldX - cNode.x;
      const dy = worldY - cNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= 20) {
        hoveredNode = cNode;
        break;
      }
    }

    // Create hover particle effect and transitions when hovering over a new node
    if (hoveredNode && hoveredNode !== hover) {
      const nodeColor = colorFor(hoveredNode.node.category);
      particleSystemRef.current.addParticles(hoveredNode.x, hoveredNode.y, 'hover', 4, nodeColor);

      // Apply hover transition
      updateNodeTransition(hoveredNode.node.id, {
        scale: 1.1,
        glowIntensity: 0.8
      });
    }

    // Clear previous hover transitions
    if (hover && hoveredNode !== hover) {
      updateNodeTransition(hover.node.id, {
        scale: 1,
        glowIntensity: 0
      });
    }

    hoverTargetRef.current = hoveredNode;
    setHover(hoveredNode);

    // Enhanced tooltip positioning with smart anchor detection
    if (hoveredNode && hoveredNode !== hover) {
      const hoverCanvas = canvasRef.current;
      if (hoverCanvas) {
        const hoverRect = hoverCanvas.getBoundingClientRect();
        const canvasWidth = hoverRect.width;
        const canvasHeight = hoverRect.height;

        // Calculate optimal tooltip position and anchor
        let tooltipX = mouseX;
        let tooltipY = mouseY;
        let anchor: 'top' | 'bottom' | 'left' | 'right' = 'top';
        let offset = { x: 15, y: -10 };

        // Smart positioning to keep tooltip in viewport
        const tooltipWidth = 250; // Estimated tooltip width
        const tooltipHeight = 120; // Estimated tooltip height

        // Check right edge
        if (mouseX + tooltipWidth + 20 > canvasWidth) {
          anchor = 'left';
          offset = { x: -tooltipWidth - 15, y: -tooltipHeight / 2 };
        }
        // Check bottom edge
        else if (mouseY + tooltipHeight + 20 > canvasHeight) {
          anchor = 'bottom';
          offset = { x: 15, y: -tooltipHeight - 15 };
        }
        // Check top edge
        else if (mouseY - tooltipHeight - 20 < 0) {
          anchor = 'top';
          offset = { x: 15, y: 15 };
        }

        tooltipX = Math.max(10, Math.min(canvasWidth - tooltipWidth - 10, mouseX + offset.x));
        tooltipY = Math.max(10, Math.min(canvasHeight - tooltipHeight - 10, mouseY + offset.y));

        clearHoverTimeout();
        const targetNodeId = hoveredNode.node.id;
        const targetAnchor = anchor;
        const targetOffset = offset;
        const targetX = tooltipX;
        const targetY = tooltipY;

        hoverTimeoutRef.current = globalThis.setTimeout(() => {
          if (hoverTargetRef.current?.node.id !== targetNodeId) {
            return;
          }

          setTooltip({
            visible: true,
            x: targetX,
            y: targetY,
            node: hoveredNode.node,
            fadeIn: 0,
            anchor: targetAnchor,
            offset: targetOffset
          });
        }, 150); // Reduced delay for better responsiveness
      }
    } else if (!hoveredNode) {
      hideTooltip();
    }
  }, [
    layout,
    hover,
    pan,
    zoom,
    size,
    colorFor,
    updateNodeTransition,
    hideTooltip,
    clearHoverTimeout
  ]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    dragRef.current = {
      dragging: true,
      start: { x: mouseX, y: mouseY },
      startPan: { ...pan }
    };
    clearHoverTimeout();
  }, [pan, clearHoverTimeout]);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragRef.current.dragging = false;
    hoverTargetRef.current = null;

    if (hover) {
      updateNodeTransition(hover.node.id, {
        scale: 1,
        glowIntensity: 0
      });
      setHover(null);
    }

    hideTooltip();
  }, [hover, hideTooltip, updateNodeTransition]);

  const handleClick = useCallback(() => {
    if (dragRef.current.dragging) return;

    if (hover) {
      const { node } = hover;
      const { ok: canUnlock } = checkUnlock(node);
      
      // Clear previous selection transitions
      if (selected) {
        updateNodeTransition(selected.node.id, {
          scale: 1,
          glowIntensity: 0
        });
      }
      
      if (canUnlock) {
        // Create unlock particle effect
        const nodeColor = colorFor(node.category);
        particleSystemRef.current.addParticles(
          hover.x,
          hover.y,
          'unlock',
          8,
          nodeColor
        );
        onUnlock(node);
        
        // Apply unlock transition with elastic effect
        updateNodeTransition(node.id, {
          scale: 1.3,
          glowIntensity: 1.2
        });
      } else {
        // Apply selection transition
        updateNodeTransition(node.id, {
          scale: 1.15,
          glowIntensity: 0.9
        });
      }
      
      setSelected(hover);
      onSelectNode?.(node.id);
    } else {
      // Clear selection
      if (selected) {
        updateNodeTransition(selected.node.id, {
          scale: 1,
          glowIntensity: 0
        });
      }
      setSelected(null);
      onSelectNode?.(null);
    }
  }, [hover, onUnlock, checkUnlock, selected, updateNodeTransition, colorFor, onSelectNode]);

  const animateZoomTo = useCallback((nextTarget: number) => {
    clearZoomAnimation();

    const step = () => {
      let shouldContinue = true;
      setZoom(prev => {
        const diff = nextTarget - prev;
        if (Math.abs(diff) <= 0.001) {
          latestZoomRef.current = nextTarget;
          shouldContinue = false;
          return nextTarget;
        }
        const next = prev + diff * 0.2;
        latestZoomRef.current = next;
        return next;
      });

      if (shouldContinue) {
        zoomAnimationRef.current = requestAnimationFrame(step);
      } else {
        zoomAnimationRef.current = null;
      }
    };

    zoomAnimationRef.current = requestAnimationFrame(step);
  }, [clearZoomAnimation]);

  // Enhanced zoom with smooth animation and better limits
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const currentZoom = latestZoomRef.current;
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08; // Smoother zoom increments
    const newZoom = Math.max(0.2, Math.min(4.0, currentZoom * zoomFactor)); // Extended zoom range

    animateZoomTo(newZoom);
  }, [animateZoomTo]);
  
  // Zoom control functions
  const zoomIn = useCallback(() => {
    clearZoomAnimation();
    const currentZoom = latestZoomRef.current;
    const newZoom = Math.min(4.0, currentZoom * 1.2);
    latestZoomRef.current = newZoom;
    setZoom(newZoom);
  }, [clearZoomAnimation]);

  const zoomOut = useCallback(() => {
    clearZoomAnimation();
    const currentZoom = latestZoomRef.current;
    const newZoom = Math.max(0.2, currentZoom * 0.8);
    latestZoomRef.current = newZoom;
    setZoom(newZoom);
  }, [clearZoomAnimation]);

  const resetZoom = useCallback(() => {
    clearZoomAnimation();
    latestZoomRef.current = 1.0;
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, [clearZoomAnimation]);
  
  const fitToView = useCallback(() => {
    if (layout.nodes.length === 0) return;

    // Calculate bounding box of all nodes
    const bounds = layout.nodes.reduce((acc, node) => {
      return {
        minX: Math.min(acc.minX, node.x),
        maxX: Math.max(acc.maxX, node.x),
        minY: Math.min(acc.minY, node.y),
        maxY: Math.max(acc.maxY, node.y)
      };
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    
    const canvas = canvasRef.current;
    if (canvas) {
      const padding = 100;
      const contentWidth = bounds.maxX - bounds.minX + padding * 2;
      const contentHeight = bounds.maxY - bounds.minY + padding * 2;
      
      const scaleX = size.w / contentWidth;
      const scaleY = size.h / contentHeight;
      const newZoom = Math.min(scaleX, scaleY, 2.0);
      
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      clearZoomAnimation();
      latestZoomRef.current = newZoom;
      setZoom(newZoom);
      setPan({
        x: -centerX * newZoom,
        y: -centerY * newZoom
      });
    }
  }, [clearZoomAnimation, layout.nodes, size]);

  useEffect(() => {
    if (layout.nodes.length === 0) return;

    const maxRadius = layout.metrics?.maxConstellationRadius ?? 0;
    const prevRadius = lastAutoFitRadius.current;

    if (focusNodeId) {
      lastAutoFitRadius.current = maxRadius;
      return;
    }

    if (prevRadius === null || maxRadius > prevRadius + 1) {
      lastAutoFitRadius.current = maxRadius;
      fitToView();
    } else if (prevRadius !== maxRadius) {
      lastAutoFitRadius.current = maxRadius;
    }
  }, [fitToView, focusNodeId, layout.metrics?.maxConstellationRadius, layout.nodes.length]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setSize({ w: container.clientWidth, h: container.clientHeight });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onWheel={handleWheel}
      />
      
      {/* Enhanced Tooltip */}
      {tooltip.visible && tooltip.node && (
        <div
          className={`absolute pointer-events-none z-50 max-w-sm ${
            tooltip.anchor === 'left' ? 'transform -translate-x-full' :
            tooltip.anchor === 'right' ? 'transform translate-x-0' :
            tooltip.anchor === 'top' ? 'transform -translate-y-full' :
            'transform translate-y-0'
          }`}
          style={{
            left: tooltip.x,
            top: tooltip.y,
            opacity: tooltip.fadeIn,
            transform: `scale(${0.95 + tooltip.fadeIn * 0.05}) translateZ(0)`,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.4))'
          }}
        >
          <SkillTooltipContent
            node={tooltip.node}
            tree={tree}
            unlocked={unlocked}
            colorFor={colorFor}
            checkUnlock={checkUnlock}
            canAfford={canAfford}
          />
        </div>
      )}

      {/* Enhanced Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 border border-gray-600">
        <button
          onClick={zoomIn}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors font-bold"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors font-bold"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors text-xs"
          title="Reset View"
        >
          ⌂
        </button>
        <button
          onClick={fitToView}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-colors text-xs"
          title="Fit to View"
        >
          ⊞
        </button>
      </div>
      
      {/* Zoom Level Indicator */}
      <div className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded px-3 py-1 text-white text-sm border border-gray-600">
        Zoom: {Math.round(zoom * 100)}%
      </div>
      
      {/* Navigation Hint */}
      <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded px-3 py-2 text-white text-xs border border-gray-600 max-w-xs">
        <div className="font-semibold mb-1">Navigation:</div>
        <div>• Drag to pan around</div>
        <div>• Scroll wheel to zoom</div>
        <div>• Click nodes to unlock</div>
        <div>• Hover for details</div>
      </div>
      
      {/* Minimap */}
      <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 border border-gray-600 rounded overflow-hidden">
        <div className="relative w-full h-full">
          {layout.nodes.map(cNode => {
            const x = (cNode.x + 600) / 1200 * 128;
            const y = (cNode.y + 400) / 800 * 96;
            const isUnlocked = unlocked[cNode.node.id];
            
            return (
              <div
                key={cNode.node.id}
                className={`absolute w-1 h-1 rounded-full ${
                  isUnlocked ? 'bg-blue-400' : 'bg-gray-600'
                }`}
                style={{ left: x, top: y }}
              />
            );
          })}
          
          {/* Viewport indicator */}
          <div 
            className="absolute border border-white opacity-50"
            style={{
              left: ((-pan.x / zoom + 600) / 1200 * 128) - (64 / zoom),
              top: ((-pan.y / zoom + 400) / 800 * 96) - (48 / zoom),
              width: 128 / zoom,
              height: 96 / zoom
            }}
          />
        </div>
      </div>
    </div>
  );
}
