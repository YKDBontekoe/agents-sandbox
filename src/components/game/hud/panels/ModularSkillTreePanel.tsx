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
  useHUDPanel({
    config: { id: 'skill-tree', zone: 'sidebar-right', priority: 5, persistent: true },
    component: ModularSkillTreePanel,
    props: { seed, variant }
  });

  const tree = useMemo(() => generateSkillTree(seed), [seed]);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
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
    if (!query) return available;
    const q = query.toLowerCase();
    return available.filter(n => n.title.toLowerCase().includes(q) || n.category.toLowerCase().includes(q) || (n as any).tags?.some((t:string)=>String(t).toLowerCase().includes(q)));
  }, [available, query]);
  const shortlist = showAll ? filtered : filtered.slice(0, 6);

  return (
    <ResponsivePanel
      title={variant === 'minimal' ? 'Skills' : 'Skill Tree'}
      icon={(<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>)}
      variant={variant}
      collapsible
      className="min-w-0"
    >
      <div className="mb-2 flex items-center gap-2">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search skills..." className="px-2 py-1 text-xs rounded border border-border bg-white/80 w-full" />
        <button onClick={() => setOpen(true)} className="px-3 py-1 text-xs rounded border border-border bg-panel hover:bg-muted">Open Full Tree</button>
      </div>
      <div className="mb-2 text-[11px] text-slate-600">Available {filtered.length} • Unlocked {unlockedCount} • Total {tree.nodes.length}</div>
      <div className="grid grid-cols-1 gap-2">
        {shortlist.map(n => (
          <div key={n.id} className="rounded border border-slate-200 bg-white/90 px-2 py-1 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-medium text-slate-800 text-sm truncate">{n.title}</div>
              <div className="text-[11px] text-slate-500 truncate">{n.category} • {n.cost.coin ? `🜚 ${n.cost.coin} ` : ''}{n.cost.mana ? ` ✨ ${n.cost.mana} ` : ''}{n.cost.favor ? ` ☼ ${n.cost.favor}` : ''}</div>
            </div>
            <ResponsiveButton onClick={() => handleUnlock(n)} variant='primary' size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}>Unlock</ResponsiveButton>
          </div>
        ))}
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
