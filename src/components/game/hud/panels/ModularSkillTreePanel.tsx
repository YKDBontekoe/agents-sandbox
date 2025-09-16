import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ResponsivePanel, ResponsiveButton } from '../ResponsiveHUDPanels';
import { useHUDPanel } from '../HUDPanelRegistry';
import { generateSkillTree } from '../../skills/generate';
import type { SkillNode } from '../../skills/types';
import SkillTreeModal from '../../skills/SkillTreeModal';
import type { Notification } from '../../hud/types';

type NotifyFn = (
  notification: Omit<Notification, 'id' | 'timestamp'> & { id?: string; dedupeKey?: string; dedupeMs?: number }
) => void;

interface ModularSkillTreePanelProps {
  seed?: number;
  variant?: 'default' | 'compact' | 'minimal';
  resources?: { coin?: number; mana?: number; favor?: number };
  unlockedIds: string[];
  attemptUnlock?: (node: SkillNode) => Promise<boolean>;
  notify?: NotifyFn;
}

export function ModularSkillTreePanel({
  seed = 12345,
  variant = 'compact',
  resources,
  unlockedIds,
  attemptUnlock,
  notify,
}: ModularSkillTreePanelProps) {
  const [open, setOpen] = useState(false);
  const [trend, setTrend] = useState<SkillNode['category'] | null>(null);
  useEffect(() => {
    const fn = (e: Event) => {
      const detail = (e as CustomEvent<{ category?: SkillNode['category'] }>).detail;
      const c = detail?.category;
      if (c) setTrend(c);
    };
    window.addEventListener('ad_skill_trend', fn as EventListener);
    return () => window.removeEventListener('ad_skill_trend', fn as EventListener);
  }, []);
  useHUDPanel({
    config: { id: 'skill-tree', zone: 'sidebar-right', priority: 5, persistent: true },
    component: ModularSkillTreePanel,
    props: { seed, variant }
  });

  const tree = useMemo(() => generateSkillTree(seed), [seed]);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<Record<SkillNode['category'], boolean>>({
    economic: true, military: true, mystical: true, infrastructure: true, diplomatic: true, social: true,
  });
  const toggleCat = (c: SkillNode['category']) => setCategoryFilter(prev => ({ ...prev, [c]: !prev[c] }));
  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const evaluateUnlock = useCallback((n: SkillNode) => {
    const reasons: string[] = [];
    (n.requires || []).forEach(req => {
      if (!unlockedSet.has(req)) {
        const reqNode = tree.nodes.find(nn => nn.id === req);
        reasons.push(`Requires: ${reqNode?.title ?? req}`);
      }
    });
    if (n.exclusiveGroup) {
      const taken = tree.nodes.find(x => x.exclusiveGroup === n.exclusiveGroup && x.id !== n.id && unlockedSet.has(x.id));
      if (taken) reasons.push(`Path chosen: ${taken.title}`);
    }
    if (n.unlockConditions && n.unlockConditions.length) {
      const unlockedList = tree.nodes.filter(node => unlockedSet.has(node.id));
      const byCat: Record<SkillNode['category'], number> = { economic:0, military:0, mystical:0, infrastructure:0, diplomatic:0, social:0 };
      unlockedList.forEach(node => {
        byCat[node.category] = (byCat[node.category] || 0) + 1;
      });
      const highestTier = unlockedList.reduce((max, node) => (typeof node.tier === 'number' ? Math.max(max, node.tier) : max), -1);
      for (const cond of n.unlockConditions) {
        if (cond.type === 'min_unlocked' && unlockedList.length < cond.value) reasons.push(`Unlock at least ${cond.value} skills`);
        if (cond.type === 'category_unlocked_at_least' && (byCat[cond.category] || 0) < cond.value) reasons.push(`Unlock ${cond.value} ${cond.category} skills`);
        if (cond.type === 'max_unlocked_in_category' && (byCat[cond.category] || 0) > cond.value) reasons.push(`Too many in ${cond.category}: max ${cond.value}`);
        if (cond.type === 'tier_before_required' && highestTier < cond.tier) reasons.push(`Reach tier ${cond.tier} first`);
      }
    }
    return { ok: reasons.length === 0, reasons };
  }, [tree.nodes, unlockedSet]);

  const canAfford = useCallback((n: SkillNode) => {
    if (!resources) return true;
    const costs = n.cost || {};
    if (typeof costs.coin === 'number' && (resources.coin || 0) < costs.coin) return false;
    if (typeof costs.mana === 'number' && (resources.mana || 0) < costs.mana) return false;
    if (typeof costs.favor === 'number' && (resources.favor || 0) < costs.favor) return false;
    return true;
  }, [resources]);

  const handleUnlock = useCallback(async (n: SkillNode) => {
    if (unlockedSet.has(n.id)) {
      return;
    }
    const status = evaluateUnlock(n);
    if (!status.ok) {
      const message = status.reasons.join(', ') || 'Prerequisites not met.';
      notify?.({ type: 'info', title: 'Skill locked', message, dedupeKey: `skill-locked-${n.id}` });
      return;
    }
    if (!canAfford(n)) {
      const costs: string[] = [];
      if (n.cost?.coin) costs.push(`${n.cost.coin} coin`);
      if (n.cost?.mana) costs.push(`${n.cost.mana} mana`);
      if (n.cost?.favor) costs.push(`${n.cost.favor} favor`);
      const message = `Insufficient resources to unlock ${n.title}${costs.length ? ` (${costs.join(', ')})` : ''}.`;
      notify?.({ type: 'error', title: 'Unable to unlock skill', message, dedupeKey: `skill-cost-${n.id}` });
      return;
    }
    if (!attemptUnlock) {
      notify?.({ type: 'error', title: 'Unlock unavailable', message: 'Skill unlock is not available right now.', dedupeKey: `skill-unavailable-${n.id}` });
      return;
    }
    try {
      const success = await attemptUnlock(n);
      if (!success) {
        notify?.({ type: 'error', title: 'Unlock failed', message: 'The archivists rejected the purchase. Please try again.', dedupeKey: `skill-fail-${n.id}` });
      }
    } catch (err) {
      notify?.({ type: 'error', title: 'Unlock failed', message: err instanceof Error ? err.message : 'An unexpected error occurred.', dedupeKey: `skill-fail-${n.id}` });
    }
  }, [attemptUnlock, canAfford, evaluateUnlock, notify, unlockedSet]);

  const available = useMemo(() => tree.nodes.filter(n => {
    if (unlockedSet.has(n.id)) return false;
    const status = evaluateUnlock(n);
    return status.ok;
  }), [tree.nodes, evaluateUnlock, unlockedSet]);
  const unlockedCount = unlockedIds.length;
  const filtered = useMemo(() => {
    const base = available.filter(n => categoryFilter[n.category]);
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter(n => n.title.toLowerCase().includes(q) || n.category.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)));
  }, [available, query, categoryFilter]);
  const shortlist = showAll ? filtered : filtered.slice(0, 6);

  return (
    <ResponsivePanel
      title={variant === 'minimal' ? 'Skills' : 'Skill Tree'}
      icon={(
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )}
      variant={variant}
      collapsible
      className="min-w-0 bg-gray-900/20 shadow-lg border border-gray-700 text-gray-200"
    >
      {/* Enhanced Search and Controls */}
      <div className="mb-4 space-y-2">
        <div className="relative">
          <input 
            value={query} 
            onChange={e=>setQuery(e.target.value)} 
            placeholder="Search skills by name, category, or tags..." 
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button 
          onClick={() => setOpen(true)} 
          className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Open Full Tree
          </span>
        </button>
      </div>
      {/* Enhanced Category Filters */}
      <div className="mb-3 space-y-2">
        <div className="text-xs font-semibold text-gray-400 mb-1">Categories</div>
        <div className="grid grid-cols-2 gap-1.5">
          {(['economic','military','mystical','infrastructure','diplomatic','social'] as SkillNode['category'][]).map(cat => {
            const categoryColors = {
              economic: { bg: 'bg-emerald-900/20', border: 'border-emerald-700/60', text: 'text-emerald-300', active: 'bg-emerald-900/30 border-emerald-600' },
              military: { bg: 'bg-rose-900/20', border: 'border-rose-700/60', text: 'text-rose-300', active: 'bg-rose-900/30 border-rose-600' },
              mystical: { bg: 'bg-purple-900/20', border: 'border-purple-700/60', text: 'text-purple-300', active: 'bg-purple-900/30 border-purple-600' },
              infrastructure: { bg: 'bg-amber-900/20', border: 'border-amber-700/60', text: 'text-amber-300', active: 'bg-amber-900/30 border-amber-600' },
              diplomatic: { bg: 'bg-blue-900/20', border: 'border-blue-700/60', text: 'text-blue-300', active: 'bg-blue-900/30 border-blue-600' },
              social: { bg: 'bg-pink-900/20', border: 'border-pink-700/60', text: 'text-pink-300', active: 'bg-pink-900/30 border-pink-600' }
            };
            const colors = categoryColors[cat];
            const availableInCategory = available.filter(n => n.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className={`px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 flex items-center justify-between ${
                  categoryFilter[cat] 
                    ? `${colors.active} ${colors.text} shadow-sm` 
                    : `${colors.bg} ${colors.border} ${colors.text} opacity-60 hover:opacity-100`
                }`}
                title={`Filter ${cat} skills (${availableInCategory} available)`}
              >
                <span className="font-medium capitalize">{cat}</span>
                <span className="text-[10px] opacity-75 ml-1">{availableInCategory}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Enhanced Stats Display */}
      <div className="mb-3 p-2 bg-gray-900/20 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="font-medium">Available: <span className="text-emerald-600 font-semibold">{filtered.length}</span></span>
            <span className="font-medium">Unlocked: <span className="text-blue-600 font-semibold">{unlockedCount}</span></span>
          </div>
          <div className="text-gray-400">
            Total: {tree.nodes.length}
          </div>
        </div>
        <div className="mt-1 w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${(unlockedCount / tree.nodes.length) * 100}%` }}
          />
        </div>
      </div>
      {/* Enhanced Skill Cards */}
      <div className="space-y-2">
        {shortlist.map(n => {
          const categoryColors = {
            economic: { border: 'border-emerald-700/60', bg: 'bg-emerald-900/20', accent: 'bg-emerald-500' },
            military: { border: 'border-rose-700/60', bg: 'bg-rose-900/20', accent: 'bg-rose-500' },
            mystical: { border: 'border-purple-700/60', bg: 'bg-purple-900/20', accent: 'bg-purple-500' },
            infrastructure: { border: 'border-amber-700/60', bg: 'bg-amber-900/20', accent: 'bg-amber-500' },
            diplomatic: { border: 'border-blue-700/60', bg: 'bg-blue-900/20', accent: 'bg-blue-500' },
            social: { border: 'border-pink-700/60', bg: 'bg-pink-900/20', accent: 'bg-pink-500' }
          };
          const colors = categoryColors[n.category];
          const isHighlighted = trend === n.category;
          
          return (
            <div 
              key={n.id} 
              className={`rounded-lg border-2 p-3 transition-all duration-200 hover:shadow-md ${
                isHighlighted 
                  ? 'border-amber-700/60 bg-amber-900/20 shadow-sm' 
                  : `${colors.border} ${colors.bg} hover:border-opacity-60`
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${colors.accent}`}></div>
                    <div className="font-semibold text-gray-100 text-sm truncate">{n.title}</div>
                    <div className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      n.rarity === 'legendary' ? 'bg-purple-900/30 text-purple-300 border border-purple-700/60' :
                      n.rarity === 'rare' ? 'bg-blue-900/30 text-blue-300 border border-blue-700/60' :
                      n.rarity === 'uncommon' ? 'bg-green-900/30 text-green-300 border border-green-700/60' :
                      'bg-gray-900/30 text-gray-300 border border-gray-700/60'
                    }`}>
                      {n.rarity}
                    </div>
                  </div>
                  <div className="text-xs text-gray-300 mb-2 line-clamp-2">{n.description}</div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="capitalize font-medium">{n.category}</span>
                    <div className="flex items-center gap-1">
                      {n.cost.coin && <span className="flex items-center gap-0.5">🜚 {n.cost.coin}</span>}
                      {n.cost.mana && <span className="flex items-center gap-0.5">✨ {n.cost.mana}</span>}
                      {n.cost.favor && <span className="flex items-center gap-0.5">☼ {n.cost.favor}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <ResponsiveButton
                    onClick={() => {
                      void handleUnlock(n);
                    }}
                    variant='primary'
                    size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}
                    className="shadow-sm hover:shadow-md transition-shadow"
                  >
                    Unlock
                  </ResponsiveButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length > 6 && (
        <div className="mt-2 text-right">
          <button onClick={() => setShowAll(v=>!v)} className="text-xs underline text-gray-400 hover:text-gray-200">{showAll ? 'Show less' : 'Show more'}</button>
        </div>
      )}
      {open && (
        <SkillTreeModal
          isOpen={open}
          onClose={() => setOpen(false)}
          resources={resources}
          unlockedIds={unlockedIds}
          attemptUnlock={attemptUnlock}
          notify={notify}
        />
      )}
    </ResponsivePanel>
  );
}

export default ModularSkillTreePanel;
