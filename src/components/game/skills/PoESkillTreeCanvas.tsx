"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SkillNode, SkillTree, accumulateEffects } from './procgen';

type Vec2 = { x: number; y: number };

interface PoESkillTreeCanvasProps {
  tree: SkillTree;
  unlocked: Record<string, boolean>;
  onUnlock: (node: SkillNode) => void;
  colorFor: (category: SkillNode['category']) => string;
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
  type: 'spark' | 'glow' | 'constellation';
}

function useAnimationFrame(callback: (dt: number) => void) {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  
  useEffect(() => {
    const loop = (t: number) => {
      const last = lastRef.current || t;
      const dt = Math.min(32, t - last);
      lastRef.current = t;
      callback(dt);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { 
      if (rafRef.current) cancelAnimationFrame(rafRef.current); 
    };
  }, [callback]);
}

export default function PoESkillTreeCanvas({ tree, unlocked, onUnlock, colorFor }: PoESkillTreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{w:number;h:number}>({ w: 800, h: 600 });
  const [hover, setHover] = useState<SkillNode | null>(null);
  const [selected, setSelected] = useState<SkillNode | null>(null);
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.8);
  const [particles, setParticles] = useState<ParticleEffect[]>([]);
  const [animationTime, setAnimationTime] = useState(0);
  const dragRef = useRef<{ dragging: boolean; start: Vec2; panStart: Vec2 }>({ 
    dragging: false, 
    start: {x:0,y:0}, 
    panStart: {x:0,y:0} 
  });

  // Enhanced radial layout with constellation patterns
  const layout = useMemo(() => {
    const nodes = tree.nodes;
    const edges = tree.edges;
    const center: Vec2 = { x: 0, y: 0 };
    const baseR = 180; // inner ring
    const ringGap = 120; // distance between rings
    
    // Category sectors with PoE-style distribution
    const sectorByCategory: Record<SkillNode['category'], [number, number]> = {
      economic: [0, Math.PI / 3],
      military: [Math.PI / 3, 2 * Math.PI / 3],
      mystical: [2 * Math.PI / 3, Math.PI],
      infrastructure: [Math.PI, 4 * Math.PI / 3],
      diplomatic: [4 * Math.PI / 3, 5 * Math.PI / 3],
      social: [5 * Math.PI / 3, 2 * Math.PI],
    };
    
    const placed: Record<string, { 
      pos: Vec2; 
      r: number; 
      a: number; 
      isNotable: boolean; 
      isKeystone: boolean;
      constellation: Vec2[]; // Additional constellation points around the node
    }> = {};
    
    const tiersSet = Array.from(new Set(nodes.map(n => n.tier ?? 0))).sort((a,b)=>a-b);
    const byTier: Record<number, SkillNode[]> = {};
    nodes.forEach(n => { const t = n.tier ?? 0; (byTier[t] ||= []).push(n); });
    
    // Seeded random for consistent layout
    const rand = (seed: number) => { 
      let s = seed; 
      return () => { 
        s = (s * 1664525 + 1013904223) >>> 0; 
        return s / 2**32; 
      }; 
    };
    const rng = rand(1234567);

    tiersSet.forEach((t) => {
      const r = baseR + t * ringGap;
      const nodesTier = byTier[t] || [];
      
      // Distribute per category sector with enhanced positioning
      const byCat: Record<string, SkillNode[]> = {};
      nodesTier.forEach(n => { (byCat[n.category] ||= []).push(n); });
      
      (Object.keys(byCat) as Array<SkillNode['category']>).forEach((cat) => {
        const arr = byCat[cat];
        const [a0, a1] = sectorByCategory[cat];
        const step = (a1 - a0) / (arr.length + 1);
        
        arr.forEach((n, i) => {
          let a = a0 + step * (i + 1);
          a += (rng() - 0.5) * step * 0.2; // reduced jitter for cleaner look
          const jitterR = r + (rng() - 0.5) * 15;
          const pos = { 
            x: center.x + Math.cos(a) * jitterR, 
            y: center.y + Math.sin(a) * jitterR 
          };
          
          const isNotable = n.quality === 'epic' || n.rarity === 'rare';
          const isKeystone = (n.importance || 0) > 0.85 || n.quality === 'legendary' || n.rarity === 'legendary';
          
          // Generate constellation points for notable/keystone nodes
          const constellation: Vec2[] = [];
          if (isNotable || isKeystone) {
            const numPoints = isKeystone ? 8 : 6;
            const constellationR = isKeystone ? 45 : 35;
            for (let j = 0; j < numPoints; j++) {
              const constellationA = (j / numPoints) * Math.PI * 2 + rng() * 0.3;
              const constellationDist = constellationR + (rng() - 0.5) * 10;
              constellation.push({
                x: pos.x + Math.cos(constellationA) * constellationDist,
                y: pos.y + Math.sin(constellationA) * constellationDist
              });
            }
          }
          
          placed[n.id] = { pos, r: jitterR, a, isNotable, isKeystone, constellation };
        });
      });
    });

    return { placed, edges };
  }, [tree]);

  // Resize observer
  useEffect(() => {
    const onResize = () => {
      setSize({ w: window.innerWidth, h: Math.max(600, window.innerHeight - 120) });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toScreen = useCallback((p: Vec2): Vec2 => ({ 
    x: size.w/2 + (p.x + pan.x) * zoom, 
    y: size.h/2 + (p.y + pan.y) * zoom 
  }), [size, pan, zoom]);
  
  const toWorld = useCallback((s: Vec2): Vec2 => ({ 
    x: (s.x - size.w/2) / zoom - pan.x, 
    y: (s.y - size.h/2) / zoom - pan.y 
  }), [size, pan, zoom]);

  const hitTest = useCallback((mouse: Vec2): SkillNode | null => {
    const world = toWorld(mouse);
    let best: { id: string; d: number } | null = null;
    
    tree.nodes.forEach(n => {
      const pl = layout.placed[n.id]; 
      if (!pl) return;
      
      const dx = world.x - pl.pos.x; 
      const dy = world.y - pl.pos.y;
      const d = Math.hypot(dx, dy);
      const r = pl.isKeystone ? 32 : pl.isNotable ? 22 : 16;
      
      if (d <= r * 1.2 && (!best || d < best.d)) {
        best = { id: n.id, d };
      }
    });
    
    return best ? tree.nodes.find(n => n.id === best!.id) || null : null;
  }, [tree, layout, toWorld]);

  // Enhanced unlock checking
  const checkUnlock = useCallback((node: SkillNode) => {
    const reasons: string[] = [];
    
    if (node.requires) {
      node.requires.forEach(r => { 
        if (!unlocked[r]) {
          const reqNode = tree.nodes.find(n=>n.id===r);
          reasons.push(`Requires: ${reqNode?.title || r}`);
        }
      });
    }
    
    if (node.exclusiveGroup) {
      const taken = tree.nodes.find(n => 
        n.exclusiveGroup === node.exclusiveGroup && 
        n.id !== node.id && 
        unlocked[n.id]
      );
      if (taken) reasons.push(`Path chosen: ${taken.title}`);
    }
    
    if (node.unlockConditions) {
      const unlockedIds = Object.keys(unlocked).filter(k => unlocked[k]);
      const byCat: Record<SkillNode['category'], number> = {
        economic: 0, military: 0, mystical: 0, 
        infrastructure: 0, diplomatic: 0, social: 0
      };
      
      unlockedIds.forEach(id => { 
        const nn = tree.nodes.find(n=>n.id===id); 
        if (nn) byCat[nn.category] = (byCat[nn.category]||0)+1; 
      });
      
      const highestTier = unlockedIds.reduce((m,id)=>{ 
        const nn = tree.nodes.find(n=>n.id===id); 
        return nn && typeof nn.tier==='number'?Math.max(m,nn.tier):m; 
      }, -1);
      
      node.unlockConditions.forEach(cond => {
        if (cond.type === 'min_unlocked' && unlockedIds.length < cond.value) {
          reasons.push(`Unlock at least ${cond.value} skills`);
        }
        if (cond.type === 'category_unlocked_at_least' && (byCat[cond.category]||0) < cond.value) {
          reasons.push(`Unlock ${cond.value} ${cond.category} skills`);
        }
        if (cond.type === 'max_unlocked_in_category' && (byCat[cond.category]||0) > cond.value) {
          reasons.push(`Too many in ${cond.category}: max ${cond.value}`);
        }
        if (cond.type === 'tier_before_required' && highestTier < cond.tier) {
          reasons.push(`Reach tier ${cond.tier} first`);
        }
      });
    }
    
    return { ok: reasons.length === 0, reasons };
  }, [tree, unlocked]);

  // Particle system for visual effects
  const updateParticles = useCallback((dt: number) => {
    setParticles(prev => {
      const updated = prev.map(p => ({
        ...p,
        x: p.x + p.vx * dt * 0.01,
        y: p.y + p.vy * dt * 0.01,
        life: p.life - dt
      })).filter(p => p.life > 0);
      
      return updated;
    });
  }, []);

  // Add particle effect when node is unlocked
  const addUnlockEffect = useCallback((node: SkillNode) => {
    const pl = layout.placed[node.id];
    if (!pl) return;
    
    const newParticles: ParticleEffect[] = [];
    const color = colorFor(node.category);
    
    // Burst effect
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      newParticles.push({
        id: `${node.id}-burst-${i}`,
        x: pl.pos.x,
        y: pl.pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1000 + Math.random() * 500,
        maxLife: 1500,
        size: 2 + Math.random() * 3,
        color,
        type: 'spark'
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  }, [layout, colorFor]);

  // Enhanced render function with PoE-style visuals
  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    const { w, h } = size;
    ctx.clearRect(0, 0, w, h);
    
    // Dark background with subtle pattern
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#020617');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    // Enhanced background grid with constellation feel
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    
    // Radial rings
    for (let r = 160; r <= 160 + 12 * 120; r += 120) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Sector lines
    const sectorAngles = [0, Math.PI/3, 2*Math.PI/3, Math.PI, 4*Math.PI/3, 5*Math.PI/3];
    sectorAngles.forEach(a => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 2000, Math.sin(a) * 2000);
      ctx.stroke();
    });
    
    ctx.restore();

    // Render constellation patterns for notable/keystone nodes
    tree.nodes.forEach(n => {
      const pl = layout.placed[n.id];
      if (!pl || (!pl.isNotable && !pl.isKeystone)) return;
      
      const isUnlocked = !!unlocked[n.id];
      if (!isUnlocked) return;
      
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(animationTime * 0.003);
      ctx.strokeStyle = colorFor(n.category);
      ctx.lineWidth = 1;
      
      // Draw constellation lines
      pl.constellation.forEach((point, i) => {
        if (i === 0) return;
        const prevPoint = pl.constellation[i - 1];
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      });
      
      // Connect back to first point
      if (pl.constellation.length > 2) {
        const first = pl.constellation[0];
        const last = pl.constellation[pl.constellation.length - 1];
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(first.x, first.y);
        ctx.stroke();
      }
      
      // Draw constellation points
      ctx.fillStyle = colorFor(n.category);
      pl.constellation.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.restore();
    });

    // Enhanced edge rendering with energy flow
    tree.edges.forEach(e => {
      const a = layout.placed[e.from];
      const b = layout.placed[e.to];
      if (!a || !b) return;
      
      const fromUnlocked = !!unlocked[e.from];
      const toUnlocked = !!unlocked[e.to];
      
      ctx.save();
      
      // Base connection line
      ctx.beginPath();
      const cpx = (a.pos.x + b.pos.x) / 2;
      const cpy = (a.pos.y + b.pos.y) / 2;
      ctx.moveTo(a.pos.x, a.pos.y);
      ctx.quadraticCurveTo(cpx, cpy, b.pos.x, b.pos.y);
      
      if (fromUnlocked && toUnlocked) {
        // Animated energy flow
        ctx.lineWidth = 4;
        const gradient = ctx.createLinearGradient(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
        const flowOffset = (animationTime * 0.005) % 1;
        gradient.addColorStop(Math.max(0, flowOffset - 0.3), 'rgba(16,185,129,0.2)');
        gradient.addColorStop(flowOffset, 'rgba(16,185,129,0.9)');
        gradient.addColorStop(Math.min(1, flowOffset + 0.3), 'rgba(16,185,129,0.2)');
        ctx.strokeStyle = gradient;
        ctx.stroke();
        
        // Glow effect
        ctx.globalCompositeOperation = 'screen';
        ctx.lineWidth = 8;
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#10b981';
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (fromUnlocked) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(245,158,11,0.8)';
        ctx.stroke();
      } else {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(100,116,139,0.4)';
        ctx.stroke();
      }
      
      ctx.restore();
    });

    // Enhanced node rendering
    tree.nodes.forEach(n => {
      const pl = layout.placed[n.id];
      if (!pl) return;
      
      const isUnlocked = !!unlocked[n.id];
      const { ok: canUnlock } = checkUnlock(n);
      const isHovered = hover && hover.id === n.id;
      
      const baseR = pl.isKeystone ? 32 : pl.isNotable ? 22 : 16;
      const r = baseR + (isHovered ? 4 : 0);
      
      ctx.save();
      
      // Outer glow for unlocked nodes
      if (isUnlocked) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(animationTime * 0.004);
        ctx.beginPath();
        ctx.arc(pl.pos.x, pl.pos.y, r + 8, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(
          pl.pos.x, pl.pos.y, 0,
          pl.pos.x, pl.pos.y, r + 8
        );
        glowGradient.addColorStop(0, colorFor(n.category) + '80');
        glowGradient.addColorStop(1, colorFor(n.category) + '00');
        ctx.fillStyle = glowGradient;
        ctx.fill();
      }
      
      ctx.globalAlpha = 1;
      
      // Node background
      ctx.beginPath();
      ctx.arc(pl.pos.x, pl.pos.y, r + 2, 0, Math.PI * 2);
      if (isUnlocked) {
        const bgGradient = ctx.createRadialGradient(
          pl.pos.x, pl.pos.y, 0,
          pl.pos.x, pl.pos.y, r + 2
        );
        bgGradient.addColorStop(0, colorFor(n.category) + '40');
        bgGradient.addColorStop(1, colorFor(n.category) + '20');
        ctx.fillStyle = bgGradient;
      } else if (canUnlock) {
        ctx.fillStyle = 'rgba(245,158,11,0.2)';
      } else {
        ctx.fillStyle = 'rgba(100,116,139,0.1)';
      }
      ctx.fill();
      
      // Main node circle
      ctx.beginPath();
      ctx.arc(pl.pos.x, pl.pos.y, r, 0, Math.PI * 2);
      
      if (isUnlocked) {
        const nodeGradient = ctx.createRadialGradient(
          pl.pos.x - r/3, pl.pos.y - r/3, 0,
          pl.pos.x, pl.pos.y, r
        );
        nodeGradient.addColorStop(0, colorFor(n.category));
        nodeGradient.addColorStop(1, colorFor(n.category) + 'CC');
        ctx.fillStyle = nodeGradient;
      } else if (canUnlock) {
        ctx.fillStyle = '#f59e0b';
      } else {
        ctx.fillStyle = '#475569';
      }
      ctx.fill();
      
      // Node border
      ctx.lineWidth = 2;
      ctx.strokeStyle = isUnlocked ? '#ffffff' : colorFor(n.category);
      ctx.stroke();
      
      // Quality indicators
      if (n.quality === 'legendary' || pl.isKeystone) {
        // Diamond shape for keystones
        ctx.save();
        ctx.translate(pl.pos.x, pl.pos.y);
        ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        const diamondSize = r * 0.6;
        ctx.strokeRect(-diamondSize/2, -diamondSize/2, diamondSize, diamondSize);
        ctx.restore();
      } else if (n.quality === 'epic' || pl.isNotable) {
        // Hexagon for notable nodes
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const x = pl.pos.x + Math.cos(angle) * (r * 0.7);
          const y = pl.pos.y + Math.sin(angle) * (r * 0.7);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Hover highlight
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(pl.pos.x, pl.pos.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      ctx.restore();
    });

    // Render particles
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }, [size, pan, zoom, layout, tree, unlocked, hover, colorFor, checkUnlock, particles, animationTime]);

  // Animation loop
  useAnimationFrame((dt) => {
    setAnimationTime(prev => prev + dt);
    updateParticles(dt);
    
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    render(ctx);
  });

  // Mouse interactions
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.001);
    const nextZoom = Math.min(2.5, Math.max(0.3, zoom * factor));
    setZoom(nextZoom);
  }, [zoom]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current.dragging = true;
    dragRef.current.start = { x: e.clientX, y: e.clientY };
    dragRef.current.panStart = { ...pan };
  }, [pan]);
  
  const onMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);
  
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.dragging) {
      const dx = (e.clientX - dragRef.current.start.x) / zoom;
      const dy = (e.clientY - dragRef.current.start.y) / zoom;
      setPan({ 
        x: dragRef.current.panStart.x + dx, 
        y: dragRef.current.panStart.y + dy 
      });
    }
    
    const n = hitTest({ x: e.clientX, y: e.clientY });
    setHover(n);
  }, [zoom, hitTest]);

  const onClick = useCallback((e: React.MouseEvent) => {
    const n = hitTest({ x: e.clientX, y: e.clientY });
    if (!n) return;
    
    setSelected(n);
    const { ok } = checkUnlock(n);
    if (ok && !unlocked[n.id]) {
      onUnlock(n);
      addUnlockEffect(n);
    }
  }, [hitTest, checkUnlock, unlocked, onUnlock, addUnlockEffect]);

  // Enhanced tooltip with PoE-style information
  const tooltip = useMemo(() => {
    if (!hover) return null;
    
    const effNow = accumulateEffects(tree.nodes.filter(n => unlocked[n.id]));
    const effWith = accumulateEffects([...tree.nodes.filter(n => unlocked[n.id]), hover]);
    
    const resKeys = Array.from(new Set([
      ...Object.keys(effNow.resMul), 
      ...Object.keys(effWith.resMul)
    ]));
    const bldKeys = Array.from(new Set([
      ...Object.keys(effNow.bldMul), 
      ...Object.keys(effWith.bldMul)
    ]));
    
    const diffs: Array<{k:string; from:number; to:number; type:'res'|'bld'}> = [];
    resKeys.forEach(k => {
      const a = effNow.resMul[k] || 1;
      const b = effWith.resMul[k] || 1;
      if (a !== b) diffs.push({ k, from: a, to: b, type: 'res' });
    });
    bldKeys.forEach(k => {
      const a = effNow.bldMul[k] || 1;
      const b = effWith.bldMul[k] || 1;
      if (a !== b) diffs.push({ k, from: a, to: b, type: 'bld' });
    });
    
    const { ok, reasons } = checkUnlock(hover);
    return { diffs, reasons, ok };
  }, [hover, tree, unlocked, checkUnlock]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
        style={{ background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onClick={onClick}
      />
      
      {/* Enhanced PoE-style tooltip */}
      {hover && tooltip && (
        <div className="pointer-events-none absolute z-20" style={{ left: 20, top: 20 }}>
          <div className="rounded-lg border-2 border-amber-600/50 bg-slate-900/95 backdrop-blur-sm text-white p-4 w-96 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div 
                className="font-bold text-lg"
                style={{ color: colorFor(hover.category) }}
              >
                {hover.title}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs px-2 py-1 rounded bg-slate-700 capitalize">
                  {hover.rarity}
                </div>
                <div className="text-xs px-2 py-1 rounded bg-amber-600/20 text-amber-300 capitalize">
                  {hover.quality}
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div className="text-sm text-slate-300 mb-3 italic">
              {hover.description}
            </div>
            
            {/* Effects */}
            <div className="mb-3">
              <div className="text-xs font-semibold text-amber-300 mb-2">EFFECTS:</div>
              <div className="space-y-1">
                {hover.effects.map((e, i) => (
                  <div key={i} className="text-sm text-blue-300">
                    {e.kind === 'resource_multiplier' && 
                      `+${Math.round((e.factor-1)*100)}% ${e.resource} production`}
                    {e.kind === 'building_multiplier' && 
                      `+${Math.round((e.factor-1)*100)}% ${e.typeId} efficiency`}
                    {e.kind === 'upkeep_delta' && 
                      `${e.grainPerWorkerDelta > 0 ? '+' : ''}${e.grainPerWorkerDelta} grain per worker`}
                    {e.kind === 'route_bonus' && 
                      `+${e.percent}% trade route efficiency`}
                    {e.kind === 'logistics_bonus' && 
                      `+${e.percent}% logistics efficiency`}
                    {e.kind === 'special_ability' && 
                      `${e.description} (Power: ${e.power})`}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Cost */}
            {(hover.cost.coin || hover.cost.mana || hover.cost.favor) && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-amber-300 mb-1">COST:</div>
                <div className="text-sm text-yellow-300">
                  {hover.cost.coin && `🜚 ${hover.cost.coin} `}
                  {hover.cost.mana && `✨ ${hover.cost.mana} `}
                  {hover.cost.favor && `☼ ${hover.cost.favor}`}
                </div>
              </div>
            )}
            
            {/* What-if analysis */}
            {tooltip.diffs.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-emerald-300 mb-1">IMPACT:</div>
                <div className="space-y-1">
                  {tooltip.diffs.map(d => (
                    <div key={`${d.type}-${d.k}`} className="text-sm text-emerald-200">
                      {d.k}: ×{d.from.toFixed(2)} → ×{d.to.toFixed(2)} 
                      <span className="text-emerald-400 font-semibold">
                        (+{Math.round((d.to/d.from-1)*100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Requirements */}
            {!tooltip.ok && (
              <div className="border-t border-red-600/30 pt-2">
                <div className="text-xs font-semibold text-red-300 mb-1">REQUIREMENTS:</div>
                <div className="space-y-1">
                  {tooltip.reasons.map((r, i) => (
                    <div key={i} className="text-sm text-red-200 flex items-center gap-2">
                      <span className="text-red-400">•</span>
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 text-slate-400 text-xs">
        <div>Mouse wheel: Zoom</div>
        <div>Click & drag: Pan</div>
        <div>Click node: Unlock</div>
      </div>
    </div>
  );
}

