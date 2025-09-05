import React, { useEffect, useMemo, useState } from 'react';
import { ResponsivePanel, ResponsiveButton } from '../ResponsiveHUDPanels';
import { useHUDPanel } from '../HUDPanelRegistry';
import { generateSkillTree, SkillNode } from '../../skills/procgen';
import SkillTreeModal from '../../skills/SkillTreeModal';

interface ModularSkillTreePanelProps {
  seed?: number;
  onUnlock?: (node: SkillNode) => boolean; // return true if unlocked
  variant?: 'default' | 'compact' | 'minimal';
}

export function ModularSkillTreePanel({ seed = 12345, onUnlock, variant = 'compact' }: ModularSkillTreePanelProps) {
  const [open, setOpen] = useState(false);
  const [trend, setTrend] = useState<SkillNode['category'] | null>(null);
  useEffect(() => {
    const fn = (e: any) => { const c = e?.detail?.category as any; if (c) setTrend(c); };
    window.addEventListener('ad_skill_trend', fn as any);
    return () => window.removeEventListener('ad_skill_trend', fn as any);
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
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('ad_skills_unlocked') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem('ad_skills_unlocked', JSON.stringify(unlocked)); } catch {}
  }, [unlocked]);

  const canUnlock = (n: SkillNode) => (n.requires || []).every(r => unlocked[r]);

  const handleUnlock = (n: SkillNode) => {
    if (!canUnlock(n)) return;
    try { window.dispatchEvent(new CustomEvent('ad_unlock_skill', { detail: n })); } catch {}
    setUnlocked(prev => ({ ...prev, [n.id]: true }));
  };

  const available = useMemo(() => tree.nodes.filter(n => (n.requires || []).every(r => unlocked[r]) && !unlocked[n.id]), [tree, unlocked]);
  const unlockedCount = useMemo(() => Object.values(unlocked).filter(Boolean).length, [unlocked]);
  const filtered = useMemo(() => {
    const base = available.filter(n => categoryFilter[n.category]);
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter(n => n.title.toLowerCase().includes(q) || n.category.toLowerCase().includes(q) || (n as any).tags?.some((t:string)=>String(t).toLowerCase().includes(q)));
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
      className="min-w-0 bg-gradient-to-b from-slate-50 to-white shadow-lg border-slate-200"
    >
      {/* Enhanced Search and Controls */}
      <div className="mb-4 space-y-2">
        <div className="relative">
          <input 
            value={query} 
            onChange={e=>setQuery(e.target.value)} 
            placeholder="Search skills by name, category, or tags..." 
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-slate-400"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="text-xs font-semibold text-slate-600 mb-1">Categories</div>
        <div className="grid grid-cols-2 gap-1.5">
          {(['economic','military','mystical','infrastructure','diplomatic','social'] as SkillNode['category'][]).map(cat => {
            const categoryColors = {
              economic: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', active: 'bg-emerald-200 border-emerald-400' },
              military: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', active: 'bg-red-200 border-red-400' },
              mystical: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', active: 'bg-purple-200 border-purple-400' },
              infrastructure: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', active: 'bg-amber-200 border-amber-400' },
              diplomatic: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', active: 'bg-blue-200 border-blue-400' },
              social: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700', active: 'bg-pink-200 border-pink-400' }
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
      <div className="mb-3 p-2 bg-slate-100/50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-medium">Available: <span className="text-emerald-600 font-semibold">{filtered.length}</span></span>
            <span className="font-medium">Unlocked: <span className="text-blue-600 font-semibold">{unlockedCount}</span></span>
          </div>
          <div className="text-slate-500">
            Total: {tree.nodes.length}
          </div>
        </div>
        <div className="mt-1 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
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
            economic: { border: 'border-emerald-200', bg: 'bg-emerald-50', accent: 'bg-emerald-500' },
            military: { border: 'border-red-200', bg: 'bg-red-50', accent: 'bg-red-500' },
            mystical: { border: 'border-purple-200', bg: 'bg-purple-50', accent: 'bg-purple-500' },
            infrastructure: { border: 'border-amber-200', bg: 'bg-amber-50', accent: 'bg-amber-500' },
            diplomatic: { border: 'border-blue-200', bg: 'bg-blue-50', accent: 'bg-blue-500' },
            social: { border: 'border-pink-200', bg: 'bg-pink-50', accent: 'bg-pink-500' }
          };
          const colors = categoryColors[n.category];
          const isHighlighted = trend === n.category;
          
          return (
            <div 
              key={n.id} 
              className={`rounded-lg border-2 p-3 transition-all duration-200 hover:shadow-md ${
                isHighlighted 
                  ? 'border-amber-300 bg-amber-50 shadow-sm' 
                  : `${colors.border} ${colors.bg} hover:border-opacity-60`
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${colors.accent}`}></div>
                    <div className="font-semibold text-slate-800 text-sm truncate">{n.title}</div>
                    <div className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      n.rarity === 'legendary' ? 'bg-purple-100 text-purple-700' :
                      n.rarity === 'rare' ? 'bg-blue-100 text-blue-700' :
                      n.rarity === 'uncommon' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {n.rarity}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 mb-2 line-clamp-2">{n.description}</div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
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
                    onClick={() => handleUnlock(n)} 
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
          <button onClick={() => setShowAll(v=>!v)} className="text-xs underline text-slate-600 hover:text-slate-800">{showAll ? 'Show less' : 'Show more'}</button>
        </div>
      )}
      {open && (
        <SkillTreeModal isOpen={open} onClose={() => setOpen(false)} />
      )}
    </ResponsivePanel>
  );
}

export default ModularSkillTreePanel;
