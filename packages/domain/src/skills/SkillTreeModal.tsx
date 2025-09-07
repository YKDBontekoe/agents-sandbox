import React, { useState, useMemo, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import ConstellationSkillTree from './ConstellationSkillTree';
import { generateSkillTree, expandSkillTree } from './generate';
import type { SkillNode } from './types';

interface SkillTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources?: { coin?: number; mana?: number; favor?: number };
}

export default function SkillTreeModal({ isOpen, onClose, resources }: SkillTreeModalProps) {
  const [seed] = useState<number>(12345);
  const [query, setQuery] = useState('');
  const [focusNodeId, setFocusNodeId] = useState<string | undefined>(undefined);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [stateId, setStateId] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { 
      return JSON.parse(localStorage.getItem('ad_skills_unlocked') || '{}'); 
    } catch { 
      return {}; 
    }
  });

  const [tree, setTree] = useState(() => generateSkillTree(seed, 10));
  const matches = useMemo(() => {
    if (!query) return [] as { id: string; title: string }[];
    const q = query.toLowerCase();
    return tree.nodes
      .filter(n => n.title.toLowerCase().includes(q) || n.category.toLowerCase().includes(q) || (n.tags||[]).some(t => String(t).toLowerCase().includes(q)))
      .slice(0, 8)
      .map(n => ({ id: n.id, title: n.title }));
  }, [query, tree]);

  // Path planning helpers (postorder collect ancestors for unlock order)
  const computePathTo = useCallback((targetId: string) => {
    const target = tree.nodes.find(n => n.id === targetId);
    if (!target) return [] as SkillNode[];
    const out: SkillNode[] = [];
    const seen = new Set<string>();
    const visit = (n: SkillNode) => {
      (n.requires || []).forEach(reqId => {
        if (!unlocked[reqId]) {
          const req = tree.nodes.find(nn => nn.id === reqId);
          if (req && !seen.has(req.id)) { visit(req); out.push(req); seen.add(req.id); }
        }
      });
    };
    visit(target);
    return out;
  }, [tree, unlocked]);

  const plannedPath = useMemo(() => selectedNodeId ? computePathTo(selectedNodeId) : [], [selectedNodeId, computePathTo]);
  const plannedCost = useMemo(() => {
    return plannedPath.reduce<{ coin: number; mana: number; favor: number }>((acc, n) => ({
      coin: acc.coin + (n.cost.coin || 0),
      mana: acc.mana + (n.cost.mana || 0),
      favor: acc.favor + (n.cost.favor || 0)
    }), { coin: 0, mana: 0, favor: 0 });
  }, [plannedPath]);

  // Simulate spend: find failing step id given current resources
  const failingNodeId = useMemo(() => {
    if (!resources || !selectedNodeId) return null;
    const target = tree.nodes.find(n => n.id === selectedNodeId);
    const path = [...plannedPath, ...(target ? [target] : [])];
    let coin = resources.coin || 0, mana = resources.mana || 0, favor = resources.favor || 0;
    for (const n of path) {
      const c: { coin?: number; mana?: number; favor?: number } = n.cost || {};
      const needCoin = c.coin || 0, needMana = c.mana || 0, needFavor = c.favor || 0;
      if (coin < needCoin || mana < needMana || favor < needFavor) return n.id;
      coin -= needCoin; mana -= needMana; favor -= needFavor;
    }
    return null;
  }, [resources, selectedNodeId, plannedPath, tree.nodes]);

  // Load state and pinned targets on open
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const data: { id?: string; pinned_skill_targets?: string[] } = await res.json();
        setStateId(data.id || null);
        if (Array.isArray(data.pinned_skill_targets)) setPinned(data.pinned_skill_targets);
      } catch {}
    })();
  }, [isOpen]);

  const pinSelected = useCallback(async () => {
    if (!stateId || !selectedNodeId) return;
    const next = Array.from(new Set([...pinned, selectedNodeId]));
    setPinned(next);
    try { await fetch('/api/state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: stateId, pinned_skill_targets: next }) }); } catch {}
  }, [stateId, selectedNodeId, pinned]);

  const unpinSelected = useCallback(async () => {
    if (!stateId || !selectedNodeId) return;
    const next = pinned.filter(id => id !== selectedNodeId);
    setPinned(next);
    try { await fetch('/api/state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: stateId, pinned_skill_targets: next }) }); } catch {}
  }, [stateId, selectedNodeId, pinned]);

  // Persist unlocked state to localStorage
  useEffect(() => {
    try { 
      localStorage.setItem('ad_skills_unlocked', JSON.stringify(unlocked)); 
    } catch {}
  }, [unlocked]);

  const handleUnlock = (node: SkillNode) => {
    const reqMet = (node.requires || []).every(r => unlocked[r]);
    if (!reqMet || unlocked[node.id]) return;
    
    try { 
      window.dispatchEvent(new CustomEvent('ad_unlock_skill', { 
        detail: node 
      })); 
    } catch {}
    
    setUnlocked(prev => ({ ...prev, [node.id]: true }));
  };

  const colorFor = (cat: SkillNode['category']) => ({
    economic: '#0ea5e9', 
    military: '#ef4444', 
    mystical: '#a855f7', 
    infrastructure: '#22c55e', 
    diplomatic: '#f59e0b', 
    social: '#64748b'
  }[cat] || '#64748b');

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 z-[100]" />
        <Dialog.Content className="fixed inset-0 z-[110] flex items-stretch justify-stretch p-0">
          <Dialog.Title className="sr-only">Skill Tree</Dialog.Title>
          <div className="relative flex-1 bg-neutral-900 text-white select-none">
            {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="font-bold text-xl text-white">Path of Exile Style Skill Tree</div>
                </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && matches[0]) { setFocusNodeId(matches[0].id); } }}
                    placeholder="Search skills, categories, tags..."
                    className="w-72 px-3 py-1.5 text-sm rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {query && matches.length > 0 && (
                    <div className="absolute mt-1 w-full bg-gray-900 border border-gray-700 rounded shadow-lg z-20 max-h-60 overflow-auto">
                      {matches.map(m => (
                        <button key={m.id} onClick={() => { setFocusNodeId(m.id); setQuery(m.title); }} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800">
                          {m.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Path cost summary */}
                {selectedNodeId && plannedPath.length > 0 && (
                  <div className="hidden md:flex items-center gap-2 text-xs bg-gray-800/70 border border-gray-700 rounded px-2 py-1 text-gray-200">
                    <span>Path: {plannedPath.length} steps</span>
                    <span>• 🜚 {plannedCost.coin}</span>
                    <span>• ✨ {plannedCost.mana}</span>
                    <span>• ☼ {plannedCost.favor}</span>
                    {failingNodeId && (
                      <span className="text-red-300">• fails at step: {plannedPath.findIndex(n => n.id === failingNodeId) + 1}</span>
                    )}
                  </div>
                )}
                {selectedNodeId && (
                  pinned.includes(selectedNodeId)
                    ? <button onClick={unpinSelected} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white border border-gray-500">Unpin</button>
                    : <button onClick={pinSelected} className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white border border-blue-500">Pin</button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors duration-200 text-gray-300 hover:text-white"
                  aria-label="Close skill tree"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* PoE Skill Tree Canvas */}
             <div className="absolute inset-0 pt-16">
                <ConstellationSkillTree 
                  tree={tree}
                  unlocked={unlocked}
                  onUnlock={handleUnlock}
                  colorFor={colorFor}
                  focusNodeId={focusNodeId}
                  onSelectNode={setSelectedNodeId}
                  resources={resources}
                />
              </div>
              {/* Lazy expansion when reaching near the frontier */}
              {(() => {
                if (!selectedNodeId) return null;
                const selected = tree.nodes.find(n => n.id === selectedNodeId);
                if (!selected || typeof selected.tier !== 'number' || !tree.layout) return null;
                const nearFrontier = selected.tier >= (tree.layout.maxTier - 2);
                if (nearFrontier) {
                  // Expand deterministically
                  setTimeout(() => { setTree(prev => expandSkillTree({ ...prev, nodes: [...prev.nodes], edges: [...prev.edges], layout: { ...prev.layout, tiers: { ...prev.layout!.tiers }, categoryDistribution: { ...prev.layout!.categoryDistribution }, maxTier: prev.layout!.maxTier || 0 } }, seed, 4)); }, 0);
                }
                return null;
              })()}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
