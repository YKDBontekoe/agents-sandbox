import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { generateSkillTree, SkillNode } from './procgen';

interface SkillTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LayoutNode = SkillNode & { depth: number; x: number; y: number };

interface SkillNodeProps {
  node: LayoutNode;
  isUnlocked: boolean;
  canUnlock: boolean;
  onUnlock: (node: SkillNode) => void;
  onHover: (node: SkillNode | null) => void;
  onClick?: (node: SkillNode) => void;
  colorFor: (category: SkillNode['category']) => string;
  unlocked: Record<string, boolean>;
  isHighlighted?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
}

// Enhanced Skill Node Component with Animations
function SkillNodeComponent({ 
  node, isUnlocked, canUnlock, onUnlock, onHover, onClick, colorFor, unlocked,
  isHighlighted = false, isSelected = false, isHovered = false 
}: SkillNodeProps) {
  const [isLocalHovered, setIsLocalHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  
  const getNodeState = () => {
    if (isUnlocked) return 'unlocked';
    if (canUnlock) return 'available';
    return 'locked';
  };
  
  // Handle unlock animation
  const handleUnlockClick = () => {
    if (!canUnlock || isUnlocked) return;
    setIsAnimating(true);
    setJustUnlocked(true);
    onUnlock(node);
    
    // Reset animation state after animation completes
    setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => setJustUnlocked(false), 500);
    }, 600);
  };
  
  const state = getNodeState();
  const categoryColor = colorFor(node.category);
  
  const stateStyles = {
    unlocked: {
      bg: 'bg-gradient-to-br from-emerald-600 to-emerald-700',
      border: 'border-emerald-400',
      shadow: 'shadow-lg shadow-emerald-500/25',
      text: 'text-white',
      cursor: 'cursor-default'
    },
    available: {
      bg: 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700',
      border: 'border-slate-500 hover:border-slate-400',
      shadow: 'shadow-lg hover:shadow-xl transition-all duration-200',
      text: 'text-white',
      cursor: 'cursor-pointer'
    },
    locked: {
      bg: 'bg-gradient-to-br from-slate-800 to-slate-900',
      border: 'border-slate-600',
      shadow: 'shadow-md',
      text: 'text-slate-400',
      cursor: 'cursor-not-allowed'
    }
  };
  
  const currentStyle = stateStyles[state];
  
  return (
    <div
      className={`absolute rounded-xl border-2 px-4 py-3 w-[280px] min-h-[100px] transition-all duration-300 ease-out transform ${
        currentStyle.bg
      } ${
        currentStyle.border
      } ${
        currentStyle.shadow
      } ${
        currentStyle.cursor
      } ${
        isLocalHovered && state === 'available' ? 'scale-105 shadow-2xl' : ''
      } ${
        isAnimating ? 'animate-pulse scale-110' : ''
      } ${
        justUnlocked ? 'animate-bounce' : ''
      } ${
        isHighlighted ? 'brightness-125 drop-shadow-lg' : ''
      } ${
        isSelected ? 'ring-4 ring-white ring-opacity-50' : ''
      }`}
      style={{ 
        left: node.x, 
        top: node.y,
        borderLeftColor: categoryColor,
        borderLeftWidth: '4px',
        boxShadow: isLocalHovered ? `0 20px 40px -12px ${categoryColor}40` : undefined,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onClick={() => {
        if (canUnlock && !isUnlocked) {
          handleUnlockClick();
        }
        onClick?.(node);
      }}
      onMouseEnter={() => {
        setIsLocalHovered(true);
        onHover(node);
      }}
      onMouseLeave={() => {
        setIsLocalHovered(false);
        onHover(null);
      }}
    >
      {/* Animated Status Indicator */}
      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
        isLocalHovered || isHighlighted ? 'scale-110' : ''
      } ${
        justUnlocked ? 'animate-spin' : ''
      } ${
        isSelected ? 'brightness-150' : ''
      }`}>
        {state === 'unlocked' && (
          <div className={`w-full h-full bg-emerald-500 rounded-full flex items-center justify-center text-white transition-all duration-300 ${
            justUnlocked ? 'animate-pulse' : (isLocalHovered || isHighlighted) ? 'animate-pulse' : ''
          } ${
            isSelected ? 'ring-2 ring-white ring-opacity-75' : ''
          }`}>
            ✓
          </div>
        )}
        {state === 'available' && (
          <div className={`w-full h-full bg-amber-500 rounded-full flex items-center justify-center text-white transition-all duration-300 ${
            isLocalHovered || isHighlighted ? 'animate-pulse' : ''
          } ${
            isSelected ? 'ring-2 ring-white ring-opacity-75' : ''
          }`}>
            !
          </div>
        )}
        {state === 'locked' && (
          <div className="w-full h-full bg-slate-600 rounded-full flex items-center justify-center text-slate-400 transition-all duration-300">
            🔒
          </div>
        )}
      </div>
      
      {/* Quality Indicator */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {/* Quality Badge */}
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          (node as any).quality === 'legendary' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse' :
          (node as any).quality === 'epic' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' :
          (node as any).quality === 'rare' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
          'bg-slate-500 text-white'
        }`}>
          {((node as any).quality || node.rarity).toUpperCase()}
        </div>
        
        {/* Special Ability Indicator */}
        {(node as any).specialAbility && (
          <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-[8px] animate-pulse">
            ⚡
          </div>
        )}
        
        {/* Stat Multiplier Indicator */}
        {(node as any).statMultiplier && (node as any).statMultiplier > 1 && (
          <div className="px-1 py-0.5 bg-green-500 text-white text-[8px] rounded font-bold">
            +{Math.round(((node as any).statMultiplier - 1) * 100)}%
          </div>
        )}
      </div>
      
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-base leading-tight ${
            currentStyle.text
          }`} style={{ color: state === 'unlocked' ? 'white' : categoryColor }}>
            {node.title}
          </div>
          <div className={`text-xs opacity-80 mt-0.5 ${
            currentStyle.text
          }`}>
            {node.category.charAt(0).toUpperCase() + node.category.slice(1)}
          </div>
        </div>
      </div>
      
      {/* Description */}
      <div className={`text-sm mb-3 leading-relaxed ${
        currentStyle.text
      } opacity-90`}>
        {node.description}
      </div>
      
      {/* Special Ability Details */}
      {(node as any).specialAbility && (
        <div className="mb-3 p-2 rounded-lg bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⚡</span>
            <span className="text-sm font-bold text-purple-200">
              {(node as any).specialAbility.name}
            </span>
          </div>
          <div className="text-xs text-purple-100 opacity-90">
            {(node as any).specialAbility.description}
          </div>
          {(node as any).specialAbility.cooldown && (
            <div className="text-xs text-purple-300 mt-1">
              Cooldown: {(node as any).specialAbility.cooldown}s
            </div>
          )}
        </div>
      )}
      
      {/* Enhanced Cost Display with Clear Currency Information */}
      <div className="space-y-2">
        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-600">
          <div className="text-xs font-semibold text-slate-300 mb-1">Unlock Cost:</div>
          <div className="flex flex-wrap items-center gap-2">
            {node.cost?.coin && typeof node.cost.coin === 'number' && (
              <div className="flex items-center gap-1 bg-yellow-900/30 px-2 py-1 rounded border border-yellow-600/30">
                <span className="text-yellow-400 text-sm">🪙</span>
                <span className="text-yellow-200 font-medium">{node.cost.coin.toLocaleString()}</span>
                <span className="text-yellow-300/70 text-xs">Coins</span>
              </div>
            )}
            {node.cost?.mana && typeof node.cost.mana === 'number' && (
              <div className="flex items-center gap-1 bg-purple-900/30 px-2 py-1 rounded border border-purple-600/30">
                <span className="text-purple-400 text-sm">✨</span>
                <span className="text-purple-200 font-medium">{node.cost.mana.toLocaleString()}</span>
                <span className="text-purple-300/70 text-xs">Mana</span>
              </div>
            )}
            {node.cost?.favor && typeof node.cost.favor === 'number' && (
              <div className="flex items-center gap-1 bg-orange-900/30 px-2 py-1 rounded border border-orange-600/30">
                <span className="text-orange-400 text-sm">☼</span>
                <span className="text-orange-200 font-medium">{node.cost.favor.toLocaleString()}</span>
                <span className="text-orange-300/70 text-xs">Favor</span>
              </div>
            )}
            {(!node.cost?.coin && !node.cost?.mana && !node.cost?.favor) && (
              <div className="text-emerald-400 font-medium text-sm">Free to unlock!</div>
            )}
          </div>
          
          {/* Progressive Cost Indicator with Better Formatting */}
          {(node as any).baseCost && (node as any).unlockCount > 0 && (
            <div className="mt-2 p-1.5 bg-orange-900/20 rounded border border-orange-600/20">
              <div className="text-[10px] text-orange-300 font-medium mb-1">Progressive Pricing:</div>
              <div className="text-[10px] text-orange-200">
                Base Cost: {typeof (node as any).baseCost === 'object' ? 
                  Object.entries((node as any).baseCost).map(([k, v]) => `${v} ${k}`).join(', ') : 
                  (node as any).baseCost
                }
              </div>
              <div className="text-[10px] text-orange-400 font-semibold">
                +{Math.round(((node as any).unlockCount || 0) * 10)}% increase from progression
              </div>
            </div>
          )}
        </div>
        
        {/* Enhanced Requirements indicator with progression path */}
        {node.requires && node.requires.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className={`text-xs ${
              currentStyle.text
            } opacity-60 font-medium`}>
              Prerequisites:
            </div>
            <div className="flex flex-wrap gap-1">
              {node.requires.map((reqId, idx) => {
                const isReqUnlocked = !!unlocked[reqId];
                return (
                  <div 
                    key={reqId}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      isReqUnlocked 
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                        : 'bg-red-100 text-red-700 border-red-300'
                    }`}
                    title={`Prerequisite skill ${reqId}`}
                  >
                    {isReqUnlocked ? '✓' : '✗'} Skill {reqId.split('_')[1]}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Dynamic node generation function
function generateDynamicNodes(count: number, tier: number, unlockCount: number): SkillNode[] {
  const categories: SkillNode['category'][] = ['economic', 'military', 'mystical', 'infrastructure', 'diplomatic', 'social'];
  const qualities = ['common', 'rare', 'epic', 'legendary'] as const;
  const nodes: SkillNode[] = [];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const quality = qualities[Math.floor(Math.random() * qualities.length)];
    const qualityMultiplier = { common: 1, rare: 1.5, epic: 2, legendary: 3 }[quality];
    
    const node: SkillNode = {
       id: `dynamic_${Date.now()}_${i}`,
       title: `${quality.charAt(0).toUpperCase() + quality.slice(1)} ${category} Node`,
       description: `A dynamically generated ${quality} ${category} skill with enhanced capabilities.`,
       category,
       rarity: quality === 'common' ? 'common' : quality === 'rare' ? 'uncommon' : quality === 'epic' ? 'rare' : 'legendary',
       tags: ['dynamic', quality, category],
      cost: {
        coin: Math.floor((50 + tier * 25) * qualityMultiplier),
        mana: tier > 2 ? Math.floor((20 + tier * 10) * qualityMultiplier) : undefined,
        favor: tier > 4 ? Math.floor((10 + tier * 5) * qualityMultiplier) : undefined
      },
      effects: [{
         kind: 'resource_multiplier' as const,
         resource: category === 'economic' ? 'coin' : category === 'mystical' ? 'mana' : 'favor',
         factor: 1 + (0.1 * qualityMultiplier)
       }],
       requires: [],
       quality,
       baseCost: {
         coin: Math.floor((50 + tier * 25) * qualityMultiplier),
         mana: tier > 2 ? Math.floor((20 + tier * 10) * qualityMultiplier) : undefined,
         favor: tier > 4 ? Math.floor((10 + tier * 5) * qualityMultiplier) : undefined
       },
       unlockCount,
       isRevealed: false,
       specialAbility: quality === 'epic' || quality === 'legendary' ? {
          id: `${category}_${quality}_ability`,
          name: `${quality} Power`,
          description: `Special ${quality} ability that enhances ${category} capabilities`,
          power: quality === 'epic' ? 2 : 3,
          quality
        } : undefined,
      statMultiplier: qualityMultiplier,
      tier
    };
    
    nodes.push(node);
  }
  
  return nodes;
}

export default function SkillTreeModal({ isOpen, onClose }: SkillTreeModalProps) {
  const [seed, setSeed] = useState<number>(12345);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<SkillNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedConnections, setHighlightedConnections] = useState<Set<string>>(new Set());
  const [viewportBounds, setViewportBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [energyBursts, setEnergyBursts] = useState<Array<{id: string, x: number, y: number, timestamp: number}>>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [totalUnlocked, setTotalUnlocked] = useState<number>(0);
  const [activeChallenges, setActiveChallenges] = useState<Set<string>>(new Set());
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());
  const [treeVersion, setTreeVersion] = useState<number>(0); // Force re-renders when tree changes

  useEffect(() => {
    if (!isOpen) return;
    setOffset({ x: 0, y: 0 });
    setScale(0.8);
    setEnergyBursts([]);
  }, [isOpen]);
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const tree = useMemo(() => generateSkillTree(seed), [seed]);
  
  // Activate challenges when modal opens
  useEffect(() => {
    if (isOpen && tree.progressionData?.challenges) {
      const challengeIds = tree.progressionData.challenges.map(c => c.id);
      setActiveChallenges(new Set(challengeIds));
    }
  }, [isOpen, tree.progressionData?.challenges]);
  
  // State for tracking unlocked nodes
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('ad_skills_unlocked') || '{}'); } catch { return {}; }
  });

  // Enhanced hierarchical layout function
  const createHierarchicalLayout = useCallback((tree: any) => {
    const columnW = 320;
    const nodeH = 120;
    const hGap = 150; // Balanced horizontal gap for better usability
    const vGap = 70;  // Reduced vertical gap for better UI density
    
    const layoutNodes: LayoutNode[] = [];
    const placed: Record<string, LayoutNode> = {};
    
    // Find all tiers including dynamically generated ones
    const tierNumbers = tree.nodes.map((n: any) => n.tier ?? 0) as number[];
    const allTiers = [...new Set(tierNumbers)].sort((a, b) => a - b);
    
    // Process each tier
    allTiers.forEach(tier => {
      const tierNodes = tree.nodes.filter((n: any) => (n.tier ?? 0) === tier);
      
      // Group by category within tier
      const byCategory: Record<string, any[]> = {};
      tierNodes.forEach((n: any) => {
        if (!byCategory[n.category]) byCategory[n.category] = [];
        byCategory[n.category].push(n);
      });
      
      // Sort categories by importance (based on node count and rarity)
      const sortedCategories = Object.keys(byCategory).sort((a, b) => {
        const aImportance = byCategory[a].reduce((sum: number, n: any) => sum + (n.importance || 0), 0);
        const bImportance = byCategory[b].reduce((sum: number, n: any) => sum + (n.importance || 0), 0);
        return bImportance - aImportance;
      });
      
      let yOffset = tier === 0 ? 30 : 0; // Reduced top padding for better density
      const x = tier * (columnW + hGap);
      
      sortedCategories.forEach((category, categoryIndex) => {
        const categoryNodes = byCategory[category];
        
        // Sort nodes within category by importance
        categoryNodes.sort((a: any, b: any) => (b.importance || 0) - (a.importance || 0));
        
        // Add category spacing - balanced for usability
         if (categoryIndex > 0) {
           yOffset += tier === 0 ? vGap * 1.5 : vGap * 1.2;
         }
        
        categoryNodes.forEach((node: any, index: number) => {
          // Calculate position with parent alignment and collision avoidance
          const parents = (node.requires || []).map((r: string) => placed[r]).filter(Boolean) as LayoutNode[];
          let y = yOffset + index * (nodeH + vGap);
          
          if (parents.length > 0 && tier > 0) {
            const avgParentY = parents.reduce((sum, p) => sum + p.y, 0) / parents.length;
            const categoryOffset = index * (nodeH + vGap);
            y = Math.max(yOffset + index * (nodeH + vGap), avgParentY - (categoryNodes.length - 1) * (nodeH + vGap) / 2 + categoryOffset);
          }
          
          // Enhanced collision detection with stricter spacing
          let finalY = y;
          let attempts = 0;
          while (attempts < 30) {
            const collision = layoutNodes.find(existing => 
              Math.abs(existing.x - x) < columnW * 0.1 && 
              Math.abs(existing.y - finalY) < nodeH + vGap * 0.5
            );
            
            if (!collision) break;
            
            finalY += nodeH + vGap;
            attempts++;
          }
          
          // Ensure newly generated nodes are marked as revealed
          if (node.isRevealed === undefined) {
            node.isRevealed = tier === 0 || (node.requires || []).some((r: string) => unlocked[r]);
          }
          
          const layoutNode: LayoutNode = {
            ...node,
            depth: tier,
            x,
            y: finalY
          };
          
          layoutNodes.push(layoutNode);
          placed[node.id] = layoutNode;
          yOffset = Math.max(yOffset, finalY + nodeH + vGap);
        });
      });
    });
    
    const pos = Object.fromEntries(layoutNodes.map(n => [n.id, n]));
    const layoutEdges = tree.edges.map((e: { from: string; to: string }) => ({ from: pos[e.from], to: pos[e.to] })).filter((e: any) => e.from && e.to);
    const maxX = Math.max(...layoutNodes.map(n => n.x + columnW), 0);
    const maxY = Math.max(...layoutNodes.map(n => n.y + nodeH), 0);
    
    return { nodes: layoutNodes, edges: layoutEdges, bounds: { w: maxX + 300, h: maxY + 300 } };
  }, [unlocked]);
  
  const layout = useMemo(() => {
    if (!tree) return null;
    return createHierarchicalLayout(tree);
  }, [tree, createHierarchicalLayout, treeVersion]);

  // Persist unlocked state to localStorage
  useEffect(() => {
    try { localStorage.setItem('ad_skills_unlocked', JSON.stringify(unlocked)); } catch {}
  }, [unlocked]);

  // Performance optimization: Throttled viewport bounds update
  const updateViewportBounds = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 16) return; // Throttle to ~60fps
    lastUpdateRef.current = now;
    
    if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const padding = 200; // Extra padding for smooth scrolling
        setViewportBounds({
          x: (-offset.x / scale) - padding,
          y: (-offset.y / scale) - padding,
          width: (rect.width / scale) + (padding * 2),
          height: (rect.height / scale) + (padding * 2)
        });
      }
    });
  }, [offset, scale]);

  useEffect(() => {
    updateViewportBounds();
  }, [updateViewportBounds]);

  useEffect(() => {
    const handleResize = () => updateViewportBounds();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateViewportBounds]);

  // Memoized expensive calculations for performance
  const visibleNodes = useMemo(() => {
    if (!layout?.nodes) return [];
    return layout.nodes.filter((n: any) => {
      // Only show revealed nodes (or first tier nodes)
      const isRevealed = (n as any).isRevealed !== false || (n.tier === 0);
      return isRevealed &&
             n.x + 280 >= viewportBounds.x && 
             n.x <= viewportBounds.x + viewportBounds.width &&
             n.y + 100 >= viewportBounds.y && 
             n.y <= viewportBounds.y + viewportBounds.height;
    });
  }, [layout?.nodes, viewportBounds]);

  const visibleEdges = useMemo(() => {
    if (!layout?.edges) return [];
    const visibleNodeIds = new Set(visibleNodes.map((n: any) => n.id));
    return layout.edges.filter((e: any) => 
      visibleNodeIds.has(e.from.id) || visibleNodeIds.has(e.to.id)
    );
  }, [layout?.edges, visibleNodes]);



  // Layout nodes by depth (longest prerequisite chain) with hierarchical support
  const { nodes, edges, bounds } = useMemo(() => {
    // Use hierarchical tier-based layout if available
    if (tree.layout) {
      return createHierarchicalLayout(tree);
    }
    
    // Fallback to depth-based layout
    const depth: Record<string, number> = {};
    const byId: Record<string, SkillNode> = {};
    tree.nodes.forEach(n => { byId[n.id] = n; depth[n.id] = 0; });
    let changed = true; let guard = 0;
    while (changed && guard++ < 200) {
      changed = false;
      for (const n of tree.nodes) {
        const reqDepth = Math.max(0, ...(n.requires || []).map(r => depth[r] ?? 0));
        const nd = (n.requires?.length ? reqDepth + 1 : 0);
        if (nd > (depth[n.id] ?? 0)) { depth[n.id] = nd; changed = true; }
      }
    }
    const byDepth: Record<number, SkillNode[]> = {};
    tree.nodes.forEach(n => { const d = depth[n.id] || 0; (byDepth[d] = byDepth[d] || []).push(n); });
    const columnW = 320; const nodeH = 120; const vGap = 40; const hGap = 200;
    const layoutNodes: LayoutNode[] = [];
    const placed: Record<string, LayoutNode> = {};
    const depths = Object.keys(byDepth).map(Number).sort((a,b)=>a-b);
    depths.forEach(d => {
      const col = byDepth[d];
      const suggested: Array<{ n: SkillNode; y: number }> = col.map((n, i) => {
        const parents = (n.requires || []).map(r => placed[r]).filter(Boolean) as LayoutNode[];
        if (parents.length) {
          const avg = parents.reduce((s,p)=>s+p.y,0) / parents.length;
          const jitter = (Math.random() - 0.5) * 20;
          return { n, y: avg + jitter };
        }
        return { n, y: i * (nodeH + vGap) };
      });
      suggested.sort((a,b)=>a.y-b.y);
      let cursor = 0;
      const items: LayoutNode[] = [];
      for (const s of suggested) {
        const y = Math.max(cursor, s.y);
        items.push({ ...s.n, depth: d, x: d * (columnW + hGap), y });
        cursor = y + nodeH + vGap;
      }
      items.forEach(it => { placed[it.id] = it; layoutNodes.push(it); });
    });
    const pos = Object.fromEntries(layoutNodes.map(n => [n.id, n]));
    const layoutEdges = tree.edges.map(e => ({ from: pos[e.from], to: pos[e.to] })).filter(e => e.from && e.to);
    const maxX = Math.max(...layoutNodes.map(n => n.x + columnW), 0);
    const maxY = Math.max(...layoutNodes.map(n => n.y + nodeH), 0);
    return { nodes: layoutNodes, edges: layoutEdges, bounds: { w: maxX + 200, h: maxY + 200 } };
  }, [tree]);

  const colorFor = (cat: SkillNode['category']) => ({
    economic: '#0ea5e9', military: '#ef4444', mystical: '#a855f7', infrastructure: '#22c55e', diplomatic: '#f59e0b', social: '#64748b'
  }[cat] || '#64748b');

  const onWheel: React.WheelEventHandler<HTMLDivElement> = useCallback((e) => {
    e.preventDefault();
    const dz = e.deltaY < 0 ? 0.1 : -0.1;
    setScale(s => {
      const newScale = Math.min(2, Math.max(0.5, s + dz));
      // Trigger viewport update after scale change
      setTimeout(updateViewportBounds, 0);
      return newScale;
    });
  }, [updateViewportBounds]);
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = useCallback((e) => { draggingRef.current = true; dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; }, [offset]);
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    if (!draggingRef.current || !dragStartRef.current) return;
    const newOffset = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y };
    setOffset(newOffset);
    // Throttled viewport update for smooth dragging
    updateViewportBounds();
  }, [updateViewportBounds]);
  const onMouseUp = useCallback(() => { draggingRef.current = false; dragStartRef.current = null; }, []);

  const handleUnlock = (n: SkillNode) => {
    const reqMet = (n.requires || []).every(r => unlocked[r]);
    if (!reqMet || unlocked[n.id]) return;
    
    // Calculate progressive cost based on total unlocked nodes
    const progressiveMultiplier = 1 + (totalUnlocked * 0.1); // 10% increase per unlock
    const baseCost = typeof n.baseCost === 'number' ? n.baseCost : (typeof n.cost === 'number' ? n.cost : 100);
    const actualCost = Math.floor(baseCost * progressiveMultiplier);
    
    try { 
      window.dispatchEvent(new CustomEvent('ad_unlock_skill', { 
        detail: { ...n, cost: actualCost } 
      })); 
    } catch {}
    
    // Update unlocked state - THIS WAS MISSING!
    setUnlocked(prev => ({ ...prev, [n.id]: true }));
    
    // Update progression tracking
    setTotalUnlocked(prev => prev + 1);
    
    // Reveal connected nodes that meet prerequisites
    const newlyRevealed: string[] = [];
    const updatedUnlocked = { ...unlocked, [n.id]: true };
    tree.nodes.forEach(node => {
      if (!node.isRevealed && node.requires?.includes(n.id)) {
        const allPrereqsMet = node.requires.every(req => updatedUnlocked[req]);
        if (allPrereqsMet) {
          node.isRevealed = true;
          newlyRevealed.push(node.id);
        }
      }
    });
    
    // Generate 3-5 new random nodes when unlocking certain milestone nodes
    if (n.tier && n.tier > 0 && n.tier % 2 === 0) { // Every 2 tiers
      const numNewNodes = 3 + Math.floor(Math.random() * 3); // 3-5 nodes
      const newNodes = generateDynamicNodes(numNewNodes, n.tier + 1, totalUnlocked + 1);
      
      // Add new nodes to the tree with proper revelation status
      newNodes.forEach(newNode => {
        // Mark new nodes as revealed since they're being generated from an unlocked node
        newNode.isRevealed = true;
        tree.nodes.push(newNode);
        // Create edges from current node to new nodes
        tree.edges.push({ from: n.id, to: newNode.id });
      });
      
      console.log(`Generated ${numNewNodes} new nodes at tier ${n.tier + 1}`);
    }
    
    // Force re-render when nodes are revealed or generated
    if (newlyRevealed.length > 0 || (n.tier && n.tier > 0 && n.tier % 2 === 0)) {
      setTreeVersion(prev => prev + 1);
    }
    
    // Check for achievement unlocks
    const currentUnlocked = Object.keys(unlocked).filter(id => unlocked[id]);
    currentUnlocked.push(n.id); // Add the newly unlocked node
    
    tree.progressionData?.achievements.forEach(achievement => {
      if (!unlockedAchievements.has(achievement.id)) {
        if (achievement.condition(tree, currentUnlocked)) {
          setUnlockedAchievements(prev => new Set([...prev, achievement.id]));
          
          // Show achievement notification
          console.log(`Achievement Unlocked: ${achievement.name} - ${achievement.description}`);
          
          // Apply achievement rewards if any
          if (achievement.reward) {
            console.log('Achievement reward applied:', achievement.reward);
          }
        }
      }
    });
    
    // Check and update challenge progress
    tree.progressionData?.challenges.forEach(challenge => {
      if (activeChallenges.has(challenge.id) && !completedChallenges.has(challenge.id)) {
        let challengeCompleted = true;
        
        challenge.requirements.forEach(req => {
          switch (req.type) {
            case 'unlock_count':
              if (totalUnlocked + 1 < req.value) challengeCompleted = false;
              break;
            case 'category_mastery':
              const categoryCount = currentUnlocked.filter(nodeId => {
                const node = tree.nodes.find(n => n.id === nodeId);
                return node?.category === req.category;
              }).length;
              if (categoryCount < req.value) challengeCompleted = false;
              break;
            case 'tier_completion':
              const tierNodes = tree.nodes.filter(node => node.tier === req.tier);
              const unlockedInTier = tierNodes.filter(node => currentUnlocked.includes(node.id));
              if (unlockedInTier.length < tierNodes.length) challengeCompleted = false;
              break;
          }
        });
        
        if (challengeCompleted) {
          setCompletedChallenges(prev => new Set([...prev, challenge.id]));
          setActiveChallenges(prev => {
            const newSet = new Set(prev);
            newSet.delete(challenge.id);
            return newSet;
          });
          
          // Apply quality boost to target node
          const targetNode = tree.nodes.find(node => node.id === challenge.targetNodeId);
          if (targetNode) {
            const qualities = ['common', 'rare', 'epic', 'legendary'] as const;
            const currentQualityIndex = qualities.indexOf(targetNode.quality);
            const newQualityIndex = Math.min(qualities.length - 1, currentQualityIndex + challenge.qualityBoost);
            targetNode.quality = qualities[newQualityIndex];
            
            console.log(`Challenge Completed: ${challenge.name} - ${targetNode.title} boosted to ${targetNode.quality} quality!`);
          }
        }
      }
    });
    
    // Add energy burst effect
    const burstId = `${n.id}-${Date.now()}`;
    setEnergyBursts(prev => [...prev, {
      id: burstId,
      x: (layout?.nodes.find((node: any) => node.id === n.id)?.x || 0) + 140,
      y: (layout?.nodes.find((node: any) => node.id === n.id)?.y || 0) + 50,
      timestamp: Date.now()
    }]);
    
    // Remove burst after animation
    setTimeout(() => {
      setEnergyBursts(prev => prev.filter(burst => burst.id !== burstId));
    }, 2000);
  };

  // Calculate highlighted nodes and connections based on hover/selection
  const calculateHighlights = (node: SkillNode | null) => {
    if (!node) {
      setHighlightedNodes(new Set());
      setHighlightedConnections(new Set());
      return;
    }

    const highlighted = new Set<string>();
    const connections = new Set<string>();
    
    // Add the hovered/selected node
    highlighted.add(node.id);
    
    // Add prerequisites (backward connections)
      const addPrerequisites = (nodeId: string) => {
        const currentNode = tree.nodes.find((n: SkillNode) => n.id === nodeId);
        if (currentNode?.requires) {
          currentNode.requires.forEach((prereqId: string) => {
            highlighted.add(prereqId);
            connections.add(`${prereqId}-${nodeId}`);
            addPrerequisites(prereqId); // Recursive for chain highlighting
          });
        }
      };
      
      // Add dependents (forward connections)
      const addDependents = (nodeId: string) => {
        tree.nodes.forEach((n: SkillNode) => {
          if (n.requires?.includes(nodeId)) {
            highlighted.add(n.id);
            connections.add(`${nodeId}-${n.id}`);
            addDependents(n.id); // Recursive for chain highlighting
          }
        });
      };
    
    addPrerequisites(node.id);
    addDependents(node.id);
    
    setHighlightedNodes(highlighted);
    setHighlightedConnections(connections);
  };

  // Enhanced hover handlers
  const handleNodeHover = (node: SkillNode | null) => {
    setHoveredNode(node);
    if (!selectedNode) {
      calculateHighlights(node);
    }
  };

  const handleNodeSelect = (node: SkillNode) => {
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
      calculateHighlights(hoveredNode);
    } else {
      setSelectedNode(node);
      calculateHighlights(node);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[100]" />
        <Dialog.Content className="fixed inset-0 z-[110] flex items-stretch justify-stretch p-0">
          <Dialog.Title className="sr-only">Skill Tree</Dialog.Title>
          <div
            ref={containerRef}
            className="relative flex-1 bg-neutral-900 text-white select-none"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            {/* Enhanced Header with Progression Indicators */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-6">
                <div className="font-bold text-xl text-white">Skill Tree</div>
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>Progress:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${(Object.values(unlocked).filter(Boolean).length / nodes.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono">
                        {Object.values(unlocked).filter(Boolean).length}/{nodes.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>Unlocked ({Object.values(unlocked).filter(Boolean).length})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span>Available ({nodes.filter(n => (n.requires || []).every(r => unlocked[r]) && !unlocked[n.id]).length})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                      <span>Locked ({nodes.filter(n => !(n.requires || []).every(r => unlocked[r]) && !unlocked[n.id]).length})</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScale(s => Math.max(0.5, s - 0.1))} 
                    className="px-2 py-1 text-sm rounded bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    −
                  </button>
                  <div className="text-sm text-slate-300 min-w-[60px] text-center">
                    {(scale*100)|0}%
                  </div>
                  <button 
                    onClick={() => setScale(s => Math.min(2, s + 0.1))} 
                    className="px-2 py-1 text-sm rounded bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    +
                  </button>
                </div>
                <div className="text-xs text-slate-400">Seed: {seed}</div>
                <button 
                  onClick={() => setSeed(Math.floor(Math.random() * 1e9))} 
                  className="px-3 py-1 text-sm rounded bg-slate-700 hover:bg-slate-600 text-white"
                >
                  Reroll
                </button>
                <Dialog.Close asChild>
                  <button className="px-4 py-1 text-sm rounded bg-slate-700 hover:bg-slate-600 text-white">
                    Close
                  </button>
                </Dialog.Close>
              </div>
              
              {/* Challenge Panel */}
              {activeChallenges.size > 0 && (
                <div className="absolute top-4 left-4 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-xl p-3 shadow-xl w-64 z-20">
                  <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
                    <span className="text-orange-400">⚡</span>
                    ACTIVE CHALLENGES
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {Array.from(activeChallenges).map(challengeId => {
                      const challenge = tree.progressionData?.challenges.find(c => c.id === challengeId);
                      if (!challenge) return null;
                      
                      const currentUnlocked = Object.keys(unlocked).filter(id => unlocked[id]);
                      let progress = 0;
                      let maxProgress = 1;
                      
                      challenge.requirements.forEach(req => {
                        switch (req.type) {
                          case 'unlock_count':
                            progress = Math.min(currentUnlocked.length, req.value);
                            maxProgress = req.value;
                            break;
                          case 'category_mastery':
                            const categoryCount = currentUnlocked.filter(nodeId => {
                              const node = tree.nodes.find(n => n.id === nodeId);
                              return node?.category === req.category;
                            }).length;
                            progress = Math.min(categoryCount, req.value);
                            maxProgress = req.value;
                            break;
                          case 'tier_completion':
                            const tierNodes = tree.nodes.filter(node => node.tier === req.tier);
                            const unlockedInTier = tierNodes.filter(node => currentUnlocked.includes(node.id));
                            progress = unlockedInTier.length;
                            maxProgress = tierNodes.length;
                            break;
                        }
                      });
                      
                      const progressPercent = (progress / maxProgress) * 100;
                      
                      return (
                        <div key={challengeId} className="bg-slate-700/50 rounded p-2">
                          <div className="text-xs font-medium text-white mb-1">{challenge.name}</div>
                          <div className="text-xs text-slate-300 mb-2">{challenge.description}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-600 rounded-full h-1.5">
                              <div 
                                className="bg-orange-400 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-300">{progress}/{maxProgress}</span>
                          </div>
                          {challenge.timeLimit && (
                            <div className="text-xs text-orange-300 mt-1">⏱ Time Limited</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Enhanced Minimap */}
              <div className="absolute bottom-4 right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-xl p-3 shadow-xl max-w-[280px] max-h-[200px]">
                <div className="text-xs font-semibold text-slate-300 mb-2">Navigation</div>
                <div className="relative overflow-hidden" style={{ width: Math.min(220, window.innerWidth - 100), height: Math.min(160, window.innerHeight - 200) }}>
                  <svg className="absolute inset-0 w-full h-full">
                    {/* Enhanced minimap with improved spacing and collision detection */}
                    {layout && nodes.length > 0 && (() => {
                      // Calculate proper scaling to fit all nodes within minimap bounds
                      const minimapWidth = Math.min(220, window.innerWidth - 100);
                      const minimapHeight = Math.min(160, window.innerHeight - 200);
                      const padding = 25;
                      
                      // Find actual bounds of all nodes with extra spacing
                      const minX = Math.min(...nodes.map(n => n.x)) - 50;
                      const maxX = Math.max(...nodes.map(n => n.x)) + 370; // Node width + extra space
                      const minY = Math.min(...nodes.map(n => n.y)) - 30;
                      const maxY = Math.max(...nodes.map(n => n.y)) + 150; // Node height + extra space
                      
                      const contentWidth = maxX - minX;
                      const contentHeight = maxY - minY;
                      
                      // Calculate scale to fit content with padding
                      const scaleX = (minimapWidth - padding * 2) / contentWidth;
                      const scaleY = (minimapHeight - padding * 2) / contentHeight;
                      const minimapScale = Math.min(scaleX, scaleY, 0.8); // Slightly smaller for better spacing
                      
                      // Transform coordinates to minimap space
                      const transformX = (x: number) => (x - minX) * minimapScale + padding;
                      const transformY = (y: number) => (y - minY) * minimapScale + padding;
                      
                      // Create a grid to detect overlapping nodes and adjust positions
                      const gridSize = 8;
                      const occupiedPositions = new Set<string>();
                      const adjustedNodes = nodes.map((n: LayoutNode) => {
                        let nodeX = transformX(n.x + 160);
                        let nodeY = transformY(n.y + 60);
                        
                        // Check for collisions and adjust position
                        let attempts = 0;
                        while (attempts < 20) {
                          const gridX = Math.round(nodeX / gridSize);
                          const gridY = Math.round(nodeY / gridSize);
                          const posKey = `${gridX},${gridY}`;
                          
                          if (!occupiedPositions.has(posKey)) {
                            occupiedPositions.add(posKey);
                            break;
                          }
                          
                          // Try nearby positions in a spiral pattern
                          const angle = (attempts * 2.4) % (Math.PI * 2);
                          const radius = Math.ceil(attempts / 8) * gridSize;
                          nodeX = transformX(n.x + 160) + Math.cos(angle) * radius;
                          nodeY = transformY(n.y + 60) + Math.sin(angle) * radius;
                          attempts++;
                        }
                        
                        return { ...n, minimapX: nodeX, minimapY: nodeY };
                      });
                      
                      return (
                        <>
                          {/* Connection lines - only render if both nodes exist and are visible */}
                          {edges.length > 0 && edges.filter((e: { from: LayoutNode; to: LayoutNode }) => e.from && e.to).map((e: { from: LayoutNode; to: LayoutNode }, i: number) => {
                            const fromNode = adjustedNodes.find(n => n.id === e.from.id);
                            const toNode = adjustedNodes.find(n => n.id === e.to.id);
                            
                            if (!fromNode || !toNode) return null;
                            
                            const fromUnlocked = !!unlocked[e.from.id];
                            const toUnlocked = !!unlocked[e.to.id];
                            const bothVisible = fromNode.minimapX >= 0 && fromNode.minimapX <= minimapWidth && 
                                              toNode.minimapX >= 0 && toNode.minimapX <= minimapWidth;
                            
                            if (!bothVisible) return null;
                            
                            const strokeColor = fromUnlocked && toUnlocked ? '#10b981' : 
                                              fromUnlocked || toUnlocked ? '#f59e0b' : '#64748b';
                            
                            return (
                              <line 
                                key={`edge-${i}`}
                                x1={fromNode.minimapX} 
                                y1={fromNode.minimapY} 
                                x2={toNode.minimapX} 
                                y2={toNode.minimapY} 
                                stroke={strokeColor} 
                                strokeOpacity={0.7} 
                                strokeWidth={1.2}
                                strokeDasharray={fromUnlocked && toUnlocked ? "none" : "2,2"}
                              />
                            );
                          })}
                          
                          {/* Skill nodes with collision-free positioning */}
                          {adjustedNodes.map((n: any) => {
                            const isUnlocked = !!unlocked[n.id];
                            const canUnlock = (n.requires || []).every((r: string) => unlocked[r]);
                            
                            // Ensure nodes stay within minimap bounds
                            if (n.minimapX < padding || n.minimapX > minimapWidth - padding || 
                                n.minimapY < padding || n.minimapY > minimapHeight - padding) {
                              return null;
                            }
                            
                            const fillColor = isUnlocked ? '#10b981' : canUnlock ? '#f59e0b' : '#64748b';
                            const nodeRadius = Math.max(3, Math.min(5, minimapScale * 10));
                            
                            return (
                              <g key={`node-${n.id}`}>
                                {/* Node shadow for better visibility */}
                                <circle 
                                  cx={n.minimapX + 1} 
                                  cy={n.minimapY + 1} 
                                  r={nodeRadius} 
                                  fill="rgba(0,0,0,0.3)"
                                />
                                {/* Main node */}
                                <circle 
                                  cx={n.minimapX} 
                                  cy={n.minimapY} 
                                  r={nodeRadius} 
                                  fill={fillColor}
                                  stroke={colorFor(n.category)}
                                  strokeWidth={1}
                                  opacity={0.9}
                                />
                                {/* Quality indicator for high-tier nodes */}
                                {((n as any).quality === 'legendary' || (n as any).quality === 'epic') && (
                                  <circle 
                                    cx={n.minimapX} 
                                    cy={n.minimapY} 
                                    r={nodeRadius + 2} 
                                    fill="none"
                                    stroke={(n as any).quality === 'legendary' ? '#a855f7' : '#3b82f6'}
                                    strokeWidth={1}
                                    opacity={0.6}
                                    strokeDasharray="2,2"
                                  />
                                )}
                              </g>
                            );
                          })}
                          
                          {/* Enhanced viewport indicator */}
                          {(() => {
                            const viewportX = Math.max(padding, transformX(-offset.x / scale));
                            const viewportY = Math.max(padding, transformY(-offset.y / scale));
                            const viewportW = Math.min((window.innerWidth / scale) * minimapScale, minimapWidth - viewportX - padding);
                            const viewportH = Math.min(((window.innerHeight - 80) / scale) * minimapScale, minimapHeight - viewportY - padding);
                            
                            if (viewportW > 10 && viewportH > 10) {
                              return (
                                <g>
                                  {/* Viewport background */}
                                  <rect
                                    x={viewportX}
                                    y={viewportY}
                                    width={viewportW}
                                    height={viewportH}
                                    fill="rgba(56, 189, 248, 0.1)" 
                                    stroke="#38bdf8" 
                                    strokeWidth={1.5}
                                    rx={3}
                                  />
                                  {/* Viewport corners for better visibility */}
                                  <rect x={viewportX} y={viewportY} width={6} height={6} fill="#38bdf8" rx={1} />
                                  <rect x={viewportX + viewportW - 6} y={viewportY} width={6} height={6} fill="#38bdf8" rx={1} />
                                  <rect x={viewportX} y={viewportY + viewportH - 6} width={6} height={6} fill="#38bdf8" rx={1} />
                                  <rect x={viewportX + viewportW - 6} y={viewportY + viewportH - 6} width={6} height={6} fill="#38bdf8" rx={1} />
                                </g>
                              );
                            }
                            return null;
                          })()}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="absolute inset-0 top-8 overflow-hidden">
              <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }} className="relative" aria-label="skill-tree-canvas" role="region">
                <div style={{ width: bounds.w, height: bounds.h }} />
                <svg className="absolute inset-0 w-full h-full">
                  {/* Energy burst effects */}
                  {energyBursts.map((burst) => {
                    const age = Date.now() - burst.timestamp;
                    const progress = Math.min(age / 2000, 1);
                    const opacity = 1 - progress;
                    const scale = 1 + progress * 3;
                    
                    return (
                      <g key={burst.id}>
                        {/* Central burst */}
                        <circle
                          cx={burst.x}
                          cy={burst.y}
                          r={20 * scale}
                          fill="url(#burstGradient)"
                          opacity={opacity * 0.8}
                        />
                        {/* Radiating particles */}
                        {Array.from({ length: 12 }, (_, i) => {
                          const angle = (i / 12) * Math.PI * 2;
                          const distance = 40 * progress;
                          const x = burst.x + Math.cos(angle) * distance;
                          const y = burst.y + Math.sin(angle) * distance;
                          
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r={3 * (1 - progress)}
                              fill="#10b981"
                              opacity={opacity}
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                  
                  {/* Gradient definitions */}
                  <defs>
                    <radialGradient id="burstGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#059669" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  
                  {/* Connection lines with enhanced styling */}
                  {visibleEdges.map((e: any, i: number) => {
                    const fromUnlocked = !!unlocked[e.from.id];
                    const toUnlocked = !!unlocked[e.to.id];
                    const toCanUnlock = (e.to.requires || []).every((r: string) => unlocked[r]);
                    
                    const connectionId = `${e.from.id}-${e.to.id}`;
                    const isConnectionHighlighted = highlightedConnections.has(connectionId);
                    const strokeColor = fromUnlocked && toUnlocked ? '#10b981' : 
                                      fromUnlocked && toCanUnlock ? '#f59e0b' : 
                                      '#64748b';
                    const strokeWidth = isConnectionHighlighted ? 4 : fromUnlocked && toUnlocked ? 3 : 
                                       fromUnlocked && toCanUnlock ? 2.5 : 2;
                    const strokeOpacity = isConnectionHighlighted ? 1.0 : fromUnlocked && toUnlocked ? 0.8 : 
                                         fromUnlocked && toCanUnlock ? 0.7 : 0.4;
                    
                    return (
                      <g key={i}>
                        {/* Enhanced animated glow effect for active and highlighted connections */}
                        {((fromUnlocked && toUnlocked) || isConnectionHighlighted) && (
                          <>
                            <path 
                              d={`M ${e.from.x+140} ${e.from.y+60} C ${e.from.x+240} ${e.from.y+60}, ${e.to.x-100} ${e.to.y+60}, ${e.to.x} ${e.to.y+60}`}
                              stroke={strokeColor} 
                              strokeOpacity={isConnectionHighlighted ? 0.6 : 0.3} 
                              fill="none" 
                              strokeWidth={strokeWidth + (isConnectionHighlighted ? 8 : 6)}
                              filter="blur(3px)"
                            >
                              <animate attributeName="stroke-opacity" values={isConnectionHighlighted ? "0.4;0.8;0.4" : "0.2;0.5;0.2"} dur="2s" repeatCount="indefinite" />
                            </path>
                            {/* Enhanced particle effect with energy flow animation */}
                            {Array.from({ length: isConnectionHighlighted ? 12 : fromUnlocked && toUnlocked ? 8 : fromUnlocked && toCanUnlock ? 6 : 3 }, (_, idx) => {
                              const animationSpeed = isConnectionHighlighted ? 1.5 : fromUnlocked && toUnlocked ? 1.2 : 0.8;
                              const baseOffset = idx / (isConnectionHighlighted ? 12 : fromUnlocked && toUnlocked ? 8 : fromUnlocked && toCanUnlock ? 6 : 3);
                              const particleSize = isConnectionHighlighted ? 4 : fromUnlocked && toUnlocked ? 3 : 2;
                              const delay = baseOffset * (isConnectionHighlighted ? 2 : 3);
                              
                              return (
                                <circle 
                                  key={idx}
                                  r={particleSize} 
                                  fill={strokeColor} 
                                  opacity="0.9"
                                >
                                  <animateMotion 
                                    dur={`${isConnectionHighlighted ? 2 : 3}s`} 
                                    repeatCount="indefinite"
                                    begin={`${delay}s`}
                                  >
                                    <mpath href={`#path-${i}`} />
                                  </animateMotion>
                                  <animate 
                                    attributeName="opacity" 
                                    values="0;1;0.8;1;0" 
                                    dur={`${isConnectionHighlighted ? 2 : 3}s`} 
                                    repeatCount="indefinite"
                                    begin={`${delay}s`}
                                  />
                                  <animate 
                                    attributeName="r" 
                                    values={`${particleSize};${particleSize + 1};${particleSize}`}
                                    dur={`${isConnectionHighlighted ? 2 : 3}s`} 
                                    repeatCount="indefinite"
                                    begin={`${delay}s`}
                                  />
                                </circle>
                              );
                            })}
                          </>
                        )}
                        {/* Enhanced main connection line with highlighting */}
                        <defs>
                          <filter id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge> 
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/> 
                            </feMerge>
                          </filter>
                          <linearGradient id={`energy-gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3">
                              <animate attributeName="stop-opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
                            </stop>
                            <stop offset="50%" stopColor={strokeColor} stopOpacity="0.9">
                              <animate attributeName="stop-opacity" values="0.9;1;0.9" dur="2s" repeatCount="indefinite" />
                            </stop>
                            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.3">
                              <animate attributeName="stop-opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
                            </stop>
                          </linearGradient>
                        </defs>
                        <path 
                          id={`path-${i}`}
                          d={`M ${e.from.x+140} ${e.from.y+60} C ${e.from.x+240} ${e.from.y+60}, ${e.to.x-100} ${e.to.y+60}, ${e.to.x} ${e.to.y+60}`}
                          stroke={isConnectionHighlighted ? `url(#energy-gradient-${i})` : strokeColor} 
                          strokeOpacity={strokeOpacity} 
                          fill="none" 
                          strokeWidth={strokeWidth}
                          strokeDasharray={fromUnlocked ? 'none' : '5,5'}
                          filter={isConnectionHighlighted ? `url(#glow-${i})` : 'none'}
                        >
                          {(!fromUnlocked || isConnectionHighlighted) && (
                            <animate attributeName="stroke-dashoffset" values="0;10" dur={isConnectionHighlighted ? "0.5s" : "1s"} repeatCount="indefinite" />
                          )}
                        </path>
                        {/* Enhanced arrow indicator */}
                        <polygon 
                          points={`${e.to.x-8},${e.to.y+55} ${e.to.x-8},${e.to.y+65} ${e.to.x-2},${e.to.y+60}`}
                          fill={strokeColor}
                          fillOpacity={strokeOpacity}
                        />
                      </g>
                    );
                  })}
                </svg>
                {visibleNodes.map((n: any) => {
                   const isUnlocked = !!unlocked[n.id];
                   const canUnlock = (n.requires || []).every((r: string) => unlocked[r]);
                  
                  return (
                    <SkillNodeComponent
                      key={n.id}
                      node={n}
                      isUnlocked={isUnlocked}
                      canUnlock={canUnlock}
                      onUnlock={handleUnlock}
                      onHover={handleNodeHover}
                      onClick={handleNodeSelect}
                      colorFor={colorFor}
                      unlocked={unlocked}
                      isHighlighted={highlightedNodes.has(n.id)}
                      isSelected={selectedNode?.id === n.id}
                      isHovered={hoveredNode?.id === n.id}
                    />
                  );
                })}
              </div>

              
              {/* Hover Preview Panel */}
              {hoveredNode && (
                <div className="absolute top-4 left-4 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-xl p-4 w-80 shadow-2xl z-20">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="font-bold text-lg text-white mb-1" style={{ color: colorFor(hoveredNode.category) }}>
                        {hoveredNode.title}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-slate-300">
                          {hoveredNode.category.charAt(0).toUpperCase() + hoveredNode.category.slice(1)}
                        </span>
                        <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          hoveredNode.rarity === 'legendary' ? 'bg-purple-500 text-white' :
                          hoveredNode.rarity === 'rare' ? 'bg-blue-500 text-white' :
                          hoveredNode.rarity === 'uncommon' ? 'bg-green-500 text-white' :
                          'bg-slate-500 text-white'
                        }`}>
                          {hoveredNode.rarity}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-200 mb-4 leading-relaxed">
                    {hoveredNode.description}
                  </div>
                  
                  {/* Effects */}
                  {hoveredNode.effects && hoveredNode.effects.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-slate-300 mb-2">EFFECTS:</div>
                      <div className="space-y-1">
                        {hoveredNode.effects.map((effect, i) => (
                          <div key={i} className="text-xs text-slate-200 bg-slate-700/50 rounded px-2 py-1">
                            {effect.kind === 'resource_multiplier' && (
                              <span>+{Math.round((effect.factor - 1) * 100)}% {effect.resource} production</span>
                            )}
                            {effect.kind === 'building_multiplier' && (
                              <span>+{Math.round((effect.factor - 1) * 100)}% {effect.typeId} efficiency</span>
                            )}
                            {effect.kind === 'upkeep_delta' && (
                              <span>{effect.grainPerWorkerDelta > 0 ? '+' : ''}{effect.grainPerWorkerDelta} grain per worker</span>
                            )}
                            {effect.kind === 'route_bonus' && (
                              <span>+{effect.percent}% trade route efficiency</span>
                            )}
                            {effect.kind === 'logistics_bonus' && (
                              <span>+{effect.percent}% logistics efficiency</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Cost */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-slate-300 mb-2">COST:</div>
                    <div className="flex items-center gap-3">
                      {hoveredNode.cost.coin && (
                        <span className="flex items-center gap-1 text-sm">
                          <span className="text-yellow-400">🜚</span>
                          <span className="text-white">{hoveredNode.cost.coin}</span>
                        </span>
                      )}
                      {hoveredNode.cost.mana && (
                        <span className="flex items-center gap-1 text-sm">
                          <span className="text-purple-400">✨</span>
                          <span className="text-white">{hoveredNode.cost.mana}</span>
                        </span>
                      )}
                      {hoveredNode.cost.favor && (
                        <span className="flex items-center gap-1 text-sm">
                          <span className="text-orange-400">☼</span>
                          <span className="text-white">{hoveredNode.cost.favor}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Requirements */}
                  {hoveredNode.requires && hoveredNode.requires.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-300 mb-2">REQUIRES:</div>
                      <div className="space-y-1">
                        {hoveredNode.requires.map((reqId: string, i: number) => {
                          const reqNode = nodes.find(n => n.id === reqId);
                          const isReqUnlocked = !!unlocked[reqId];
                          return (
                            <div key={i} className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                              isReqUnlocked ? 'bg-emerald-700/50 text-emerald-200' : 'bg-slate-700/50 text-slate-300'
                            }`}>
                              <span>{isReqUnlocked ? '✓' : '○'}</span>
                              <span>{reqNode?.title || reqId}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
