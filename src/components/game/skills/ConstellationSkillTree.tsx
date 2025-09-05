"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SkillNode, SkillTree, accumulateEffects } from './procgen';

type Vec2 = { x: number; y: number };

interface ConstellationSkillTreeProps {
  tree: SkillTree;
  unlocked: Record<string, boolean>;
  onUnlock: (node: SkillNode) => void;
  colorFor: (category: SkillNode['category']) => string;
}

interface StarField {
  x: number;
  y: number;
  brightness: number;
  twinkle: number;
  size: number;
}

interface ConstellationNode {
  node: SkillNode;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  constellation: string;
  tier: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  node: SkillNode | null;
  fadeIn: number;
  anchor: 'top' | 'bottom' | 'left' | 'right';
  offset: { x: number; y: number };
}

interface ParticleEffect {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'unlock' | 'hover' | 'connection' | 'ambient';
}

interface AnimatedConnection {
  from: ConstellationNode;
  to: ConstellationNode;
  progress: number;
  particles: ParticleEffect[];
}

// Performance-optimized animation frame hook with throttling
function useAnimationFrame(callback: (dt: number) => void) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const throttleRef = useRef<number>(0);
  const TARGET_FPS = 60;
  const FRAME_TIME = 1000 / TARGET_FPS;

  useEffect(() => {
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      
      // Throttle to maintain consistent frame rate
      if (currentTime - throttleRef.current >= FRAME_TIME) {
        lastTimeRef.current = currentTime;
        throttleRef.current = currentTime;
        callback(deltaTime);
      }
      
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [callback]);
}

// Canvas pool for efficient memory management
class CanvasPool {
  private static instance: CanvasPool;
  private canvases: HTMLCanvasElement[] = [];
  private contexts: CanvasRenderingContext2D[] = [];
  
  static getInstance(): CanvasPool {
    if (!CanvasPool.instance) {
      CanvasPool.instance = new CanvasPool();
    }
    return CanvasPool.instance;
  }
  
  getCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    let canvas = this.canvases.pop();
    let ctx = this.contexts.pop();
    
    if (!canvas || !ctx) {
      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d')!;
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    
    return { canvas, ctx };
  }
  
  returnCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    if (this.canvases.length < 5) { // Limit pool size
      this.canvases.push(canvas);
      this.contexts.push(ctx);
    }
  }
}

// Optimized particle system with object pooling
class ParticleSystem {
  private particles: ParticleEffect[] = [];
  private pool: ParticleEffect[] = [];
  private maxParticles = 200;
  
  createParticle(x: number, y: number, type: ParticleEffect['type']): ParticleEffect {
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
        type: 'ambient'
      };
    }
    
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 30;
    
    particle.id = `${Date.now()}-${Math.random()}`;
    particle.x = x;
    particle.y = y;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    particle.life = 1000 + Math.random() * 500;
    particle.maxLife = particle.life;
    particle.size = 2 + Math.random() * 3;
    particle.color = type === 'unlock' ? '#00ff88' : type === 'hover' ? '#88ccff' : '#ffffff';
    particle.type = type;
    
    return particle;
  }
  
  addParticles(x: number, y: number, type: ParticleEffect['type'], count: number = 5) {
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
      this.particles.push(this.createParticle(x, y, type));
    }
  }
  
  update(dt: number): ParticleEffect[] {
    const activeParticles: ParticleEffect[] = [];
    
    for (const particle of this.particles) {
      particle.x += particle.vx * dt * 0.001;
      particle.y += particle.vy * dt * 0.001;
      particle.life -= dt;
      particle.vx *= 0.98; // Friction
      particle.vy *= 0.98;
      
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

export default function ConstellationSkillTree({ tree, unlocked, onUnlock, colorFor }: ConstellationSkillTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{w:number;h:number}>({ w: 1200, h: 800 });
  const [hover, setHover] = useState<ConstellationNode | null>(null);
  const [selected, setSelected] = useState<ConstellationNode | null>(null);
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(0.8); // Start slightly zoomed out for better overview
  const [targetZoom, setTargetZoom] = useState<number>(0.8);
  const [isZooming, setIsZooming] = useState<boolean>(false);
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
  const [animatedConnections, setAnimatedConnections] = useState<AnimatedConnection[]>([]);
  const canvasPoolRef = useRef<CanvasPool>(CanvasPool.getInstance());
  const renderCacheRef = useRef<Map<string, ImageData>>(new Map());
  const dragRef = useRef<{ dragging: boolean; start: Vec2; startPan: Vec2 }>({ 
    dragging: false, 
    start: { x: 0, y: 0 }, 
    startPan: { x: 0, y: 0 } 
  });

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

    const baseGridSize = 200; // Increased base spacing between nodes
    const gridSize = baseGridSize * (1 + (1 - zoom) * 0.1); // Adaptive spacing based on zoom
    const constellationSpacing = 450; // Increased constellation spacing
    const nodes: ConstellationNode[] = [];
    const nodesByConstellation: Record<string, ConstellationNode[]> = {};

    // Organize nodes by category into constellations
    tree.nodes.forEach((node, index) => {
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
      nodesByConstellation[constellation].push({
        node,
        gridX: 0,
        gridY: 0,
        x: 0,
        y: 0,
        constellation,
        tier: Math.floor(index / 6)
      });
    });

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
    Object.entries(nodesByConstellation).forEach(([constellation, constellationNodes]) => {
      const pos = constellationPositions[constellationIndex % constellationPositions.length];
      const centerX = pos.x * constellationSpacing;
      const centerY = pos.y * constellationSpacing;

      // Arrange nodes in a spiral pattern within each constellation
      constellationNodes.forEach((cNode, nodeIndex) => {
        const angle = (nodeIndex / constellationNodes.length) * Math.PI * 2;
        const radius = Math.min(80 + (cNode.tier * 40), 160);
        
        cNode.gridX = Math.round(centerX + Math.cos(angle) * radius);
        cNode.gridY = Math.round(centerY + Math.sin(angle) * radius);
        cNode.x = cNode.gridX;
        cNode.y = cNode.gridY;
        
        nodes.push(cNode);
      });
      
      constellationIndex++;
    });

    return { nodes, constellations };
  }, [tree]);

  // Generate star field background
  useEffect(() => {
    const stars: StarField[] = [];
    for (let i = 0; i < 200; i++) {
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

  // Optimized particle creation
  const createParticles = useCallback((x: number, y: number, type: ParticleEffect['type'], count: number = 5) => {
    particleSystemRef.current.addParticles(x, y, type, count);
  }, []);

  // Animation loop
  useAnimationFrame(useCallback((dt: number) => {
    setTime(t => t + dt * 0.001);
    
    // Update tooltip fade in
    if (tooltip.visible && tooltip.fadeIn < 1) {
      setTooltip(prev => ({ ...prev, fadeIn: Math.min(1, prev.fadeIn + dt * 0.003) }));
    }

    // Update particles with optimized system
    particleSystemRef.current.update(dt);

    // Update animated connections
    setAnimatedConnections(prev => prev.map(conn => ({
      ...conn,
      progress: Math.min(1, conn.progress + dt * 0.002)
    })));

    // Generate ambient particles occasionally (reduced frequency for performance)
    if (Math.random() < 0.005) {
      const x = (Math.random() - 0.5) * 1200;
      const y = (Math.random() - 0.5) * 800;
      createParticles(x, y, 'ambient', 1);
    }
  }, [tooltip.visible, tooltip.fadeIn, createParticles]));

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, size.w, size.h);

    ctx.save();
    ctx.translate(size.w / 2 + pan.x, size.h / 2 + pan.y);
    ctx.scale(zoom, zoom);

    // Draw star field with enhanced twinkling
    starField.forEach(star => {
      const twinkle = Math.sin(time * 2 + star.twinkle) * 0.3 + 0.7;
      const alpha = star.brightness * twinkle;
      
      // Main star
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Star glow effect
      if (alpha > 0.8) {
        const glowGradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
        glowGradient.addColorStop(0, `rgba(255, 255, 255, ${(alpha - 0.8) * 0.3})`);
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw particles with batched rendering for performance
    const particles = particleSystemRef.current.getParticles();
    if (particles.length > 0) {
      // Group particles by type for batched rendering
      const particlesByType = new Map<string, ParticleEffect[]>();
      particles.forEach(particle => {
        const key = `${particle.type}-${particle.color}`;
        if (!particlesByType.has(key)) {
          particlesByType.set(key, []);
        }
        particlesByType.get(key)!.push(particle);
      });
      
      // Render each group with optimized drawing
      particlesByType.forEach((groupParticles, key) => {
        const [type, color] = key.split('-');
        
        groupParticles.forEach(particle => {
          const alpha = particle.life / particle.maxLife;
          const size = particle.size * (0.5 + alpha * 0.5);
          
          ctx.globalAlpha = alpha;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Optimized trail effect for unlock particles only
          if (particle.type === 'unlock' && alpha > 0.3) {
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = particle.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particle.x - particle.vx * 0.01, particle.y - particle.vy * 0.01);
            ctx.lineTo(particle.x, particle.y);
            ctx.stroke();
          }
        });
      });
      
      ctx.globalAlpha = 1; // Reset alpha
    }

    // Draw constellation connections
    layout.nodes.forEach(nodeA => {
      (nodeA.node.requires || []).forEach(reqId => {
        const nodeB = layout.nodes.find(n => n.node.id === reqId);
        if (!nodeB) return;

        const isUnlocked = unlocked[nodeA.node.id] || unlocked[nodeB.node.id];
        const alpha = isUnlocked ? 0.8 : 0.3;
        
        // Animated connection line
        const gradient = ctx.createLinearGradient(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
        gradient.addColorStop(0, `rgba(100, 200, 255, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(150, 150, 255, ${alpha * 1.5})`);
        gradient.addColorStop(1, `rgba(100, 200, 255, ${alpha})`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = isUnlocked ? 3 : 1;
        ctx.setLineDash(isUnlocked ? [] : [5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(nodeA.x, nodeA.y);
        ctx.lineTo(nodeB.x, nodeB.y);
        ctx.stroke();
        
        // Enhanced flowing energy effect for unlocked connections
        if (isUnlocked) {
          // Multiple flowing particles
          for (let i = 0; i < 3; i++) {
            const flowPos = ((time * 0.5) + (i * 0.33)) % 1;
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
            const trailLength = 20;
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

    // Draw skill nodes
    layout.nodes.forEach(cNode => {
      const { node } = cNode;
      const isUnlocked = unlocked[node.id];
      const isHovered = hover?.node.id === node.id;
      const isSelected = selected?.node.id === node.id;
      const canUnlock = !isUnlocked && (node.requires || []).every(r => unlocked[r]);
      
      const baseColor = colorFor(node.category);
      const nodeRadius = 20;
      
      // Node glow effect
      if (isUnlocked || isHovered) {
        const glowRadius = nodeRadius + (isHovered ? 15 : 8);
        const glowGradient = ctx.createRadialGradient(cNode.x, cNode.y, 0, cNode.x, cNode.y, glowRadius);
        glowGradient.addColorStop(0, `${baseColor}40`);
        glowGradient.addColorStop(1, `${baseColor}00`);
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(cNode.x, cNode.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Main node circle
      const nodeGradient = ctx.createRadialGradient(
        cNode.x - 5, cNode.y - 5, 0,
        cNode.x, cNode.y, nodeRadius
      );
      
      if (isUnlocked) {
        nodeGradient.addColorStop(0, '#ffffff');
        nodeGradient.addColorStop(0.3, baseColor);
        nodeGradient.addColorStop(1, '#000000');
      } else if (canUnlock) {
        nodeGradient.addColorStop(0, `${baseColor}80`);
        nodeGradient.addColorStop(1, `${baseColor}40`);
      } else {
        nodeGradient.addColorStop(0, '#444444');
        nodeGradient.addColorStop(1, '#222222');
      }
      
      ctx.fillStyle = nodeGradient;
      ctx.beginPath();
      ctx.arc(cNode.x, cNode.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Node border
      ctx.strokeStyle = isSelected ? '#ffffff' : (isHovered ? baseColor : '#666666');
      ctx.lineWidth = isSelected ? 3 : (isHovered ? 2 : 1);
      ctx.stroke();
      
      // Node icon/symbol
      ctx.fillStyle = isUnlocked ? '#ffffff' : (canUnlock ? baseColor : '#666666');
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const symbol = {
        economic: '💰',
        military: '⚔️', 
        mystical: '🔮',
        infrastructure: '🏗️',
        diplomatic: '🤝',
        social: '👥'
      }[node.category] || '⭐';
      
      ctx.fillText(symbol, cNode.x, cNode.y);
      
      // Enhanced pulsing effect for available nodes
      if (canUnlock && !isUnlocked) {
        const pulse = Math.sin(time * 3) * 0.3 + 0.7;
        const pulseRadius = nodeRadius + 5 + Math.sin(time * 4) * 3;
        
        // Outer pulse ring
        ctx.strokeStyle = `${baseColor}${Math.floor(pulse * 255).toString(16).padStart(2, '0')}`;
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
  }, [layout, unlocked, hover, selected, pan, zoom, time, starField, colorFor, size]);

  // Mouse event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Transform mouse coordinates to world space
    const worldX = (mouseX - size.w / 2 - pan.x) / zoom;
    const worldY = (mouseY - size.h / 2 - pan.y) / zoom;

    if (dragRef.current.dragging) {
      const dx = mouseX - dragRef.current.start.x;
      const dy = mouseY - dragRef.current.start.y;
      setPan({
        x: dragRef.current.startPan.x + dx,
        y: dragRef.current.startPan.y + dy
      });
      return;
    }

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

    // Create hover particle effect when hovering over a new node
    if (hoveredNode && hoveredNode !== hover) {
      createParticles(hoveredNode.x, hoveredNode.y, 'hover', 3);
    }
    
    setHover(hoveredNode);
    
    // Enhanced tooltip positioning with smart anchor detection
    if (hoveredNode && hoveredNode !== hover) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;
        
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
        
        // Reduced delay and improved timing
        setTimeout(() => {
          setTooltip({
            visible: true,
            x: tooltipX,
            y: tooltipY,
            node: hoveredNode.node,
            fadeIn: 0,
            anchor,
            offset
          });
        }, 150); // Reduced delay for better responsiveness
      }
    } else if (!hoveredNode) {
      setTooltip(prev => ({ ...prev, visible: false, fadeIn: 0 }));
    }
  }, [layout, hover, pan, zoom, size]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    dragRef.current = {
      dragging: true,
      start: { x: mouseX, y: mouseY },
      startPan: { ...pan }
    };
  }, [pan]);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.dragging) return;
    
    if (hover) {
      const { node } = hover;
      const isUnlocked = unlocked[node.id];
      const canUnlock = !isUnlocked && (node.requires || []).every(r => unlocked[r]);
      
      if (canUnlock) {
        // Create unlock particle effect
        createParticles(hover.x, hover.y, 'unlock', 8);
        onUnlock(node);
      }
      setSelected(hover);
    } else {
      setSelected(null);
    }
  }, [hover, unlocked, onUnlock, createParticles]);

  // Enhanced zoom with smooth animation and better limits
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08; // Smoother zoom increments
    const newZoom = Math.max(0.2, Math.min(4.0, zoom * zoomFactor)); // Extended zoom range
    
    setTargetZoom(newZoom);
    setIsZooming(true);
    
    // Smooth zoom animation
    const animateZoom = () => {
      setZoom(prev => {
        const diff = newZoom - prev;
        if (Math.abs(diff) < 0.01) {
          setIsZooming(false);
          return newZoom;
        }
        return prev + diff * 0.15; // Smooth interpolation
      });
    };
    
    if (!isZooming) {
      const zoomInterval = setInterval(() => {
        animateZoom();
        if (Math.abs(zoom - newZoom) < 0.01) {
          clearInterval(zoomInterval);
          setIsZooming(false);
        }
      }, 16); // 60fps animation
    }
  }, [zoom, isZooming]);
  
  // Zoom control functions
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(4.0, zoom * 1.2);
    setTargetZoom(newZoom);
    setZoom(newZoom);
  }, [zoom]);
  
  const zoomOut = useCallback(() => {
    const newZoom = Math.max(0.2, zoom * 0.8);
    setTargetZoom(newZoom);
    setZoom(newZoom);
  }, [zoom]);
  
  const resetZoom = useCallback(() => {
    setTargetZoom(1.0);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);
  
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
      
      setZoom(newZoom);
      setTargetZoom(newZoom);
      setPan({
        x: -centerX * newZoom,
        y: -centerY * newZoom
      });
    }
  }, [layout.nodes, size]);

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
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />
      
      {/* Enhanced Tooltip */}
      {tooltip.visible && tooltip.node && (
        <div 
          className={`absolute bg-gray-900 text-white p-4 rounded-lg shadow-xl border-2 pointer-events-none z-50 max-w-xs ${
            tooltip.anchor === 'left' ? 'border-l-4 border-l-blue-400' :
            tooltip.anchor === 'right' ? 'border-r-4 border-r-blue-400' :
            tooltip.anchor === 'top' ? 'border-t-4 border-t-blue-400' :
            'border-b-4 border-b-blue-400'
          }`}
          style={{ 
            left: tooltip.x, 
            top: tooltip.y,
            opacity: Math.min(1, tooltip.fadeIn * 2), // Faster fade-in
            transform: `scale(${0.9 + tooltip.fadeIn * 0.1})`, // Subtle scale animation
            transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(17, 24, 39, 0.95)'
          }}
        >
          {/* Tooltip arrow */}
          <div 
            className={`absolute w-0 h-0 ${
              tooltip.anchor === 'top' ? 'border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-700 -top-1 left-4' :
              tooltip.anchor === 'bottom' ? 'border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700 -bottom-1 left-4' :
              tooltip.anchor === 'left' ? 'border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-700 -left-1 top-4' :
              'border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-700 -right-1 top-4'
            }`}
          />
          
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colorFor(tooltip.node.category) }}
            />
            <h3 className="text-blue-300 font-semibold text-sm">{tooltip.node.title}</h3>
          </div>
          
          <p className="text-gray-300 text-xs mb-3 leading-relaxed">{tooltip.node.description}</p>
          
          {tooltip.node.effects && tooltip.node.effects.length > 0 && (
            <div className="mb-3 border-t border-gray-700 pt-2">
              <h4 className="text-yellow-400 text-xs font-medium mb-2">Effects:</h4>
              <div className="space-y-1">
                {tooltip.node.effects.map((effect, i) => {
                  let effectText = '';
                  switch (effect.kind) {
                    case 'resource_multiplier':
                      effectText = `+${((effect.factor - 1) * 100).toFixed(0)}% ${effect.resource}`;
                      break;
                    case 'building_multiplier':
                      effectText = `+${((effect.factor - 1) * 100).toFixed(0)}% ${effect.typeId}`;
                      break;
                    case 'upkeep_delta':
                      effectText = `${effect.grainPerWorkerDelta > 0 ? '+' : ''}${effect.grainPerWorkerDelta} grain per worker`;
                      break;
                    case 'route_bonus':
                      effectText = `+${effect.percent}% route efficiency`;
                      break;
                    case 'logistics_bonus':
                      effectText = `+${effect.percent}% logistics`;
                      break;
                    case 'special_ability':
                      effectText = `${effect.description} (Power: ${effect.power})`;
                      break;
                  }
                  return (
                    <div key={i} className="flex items-center text-green-400 bg-gray-800 rounded px-2 py-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2 flex-shrink-0"></span>
                      <span className="text-xs">{effectText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {tooltip.node.requires && tooltip.node.requires.length > 0 && (
            <div className="mb-2">
              <h4 className="text-gray-400 text-xs font-medium mb-1">Requirements:</h4>
              {tooltip.node.requires.map(reqId => {
                const reqNode = tree.nodes.find(n => n.id === reqId);
                const isMet = unlocked[reqId];
                return (
                  <div key={reqId} className={`text-xs ${
                    isMet ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isMet ? '✓' : '✗'} {reqNode?.title || reqId}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Status indicator */}
          <div className="mt-3 pt-2 border-t border-gray-700">
            <div className={`text-xs font-medium ${
              unlocked[tooltip.node.id] ? 'text-green-400' :
              (tooltip.node.requires || []).every(r => unlocked[r]) ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {unlocked[tooltip.node.id] ? '✓ Unlocked' :
               (tooltip.node.requires || []).every(r => unlocked[r]) ? '⚡ Available' :
               '🔒 Locked'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Category: {tooltip.node.category}
            </div>
          </div>
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