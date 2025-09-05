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

  const groups: Record<string, SkillNode[]> = {};
  tree.nodes.forEach(n => { groups[n.category] = groups[n.category] || []; groups[n.category].push(n); });

  return (
    <ResponsivePanel
      title={variant === 'minimal' ? 'Skills' : 'Skill Tree'}
      icon={(<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>)}
      variant={variant}
      collapsible
      className="min-w-0"
    >
      <div className="mb-2">
        <button onClick={() => setOpen(true)} className="px-3 py-1 text-xs rounded border border-border bg-panel hover:bg-muted">Open Full Tree</button>
      </div>
      <div className="space-y-3">
        {Object.entries(groups).map(([cat, nodes]) => (
          <div key={cat}>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{cat}</div>
            <div className="space-y-1">
              {nodes.map(n => (
                <div key={n.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">{n.title}</div>
                    <div className="text-xs text-slate-500 truncate">{n.description}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-[11px] text-slate-600">
                      {n.cost.coin ? `🜚 ${n.cost.coin}` : ''} {n.cost.mana ? ` ✨ ${n.cost.mana}` : ''} {n.cost.favor ? ` ☼ ${n.cost.favor}` : ''}
                    </div>
                    <ResponsiveButton
                      onClick={() => handleUnlock(n)}
                      variant={unlocked[n.id] ? 'secondary' : 'primary'}
                      size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}
                      disabled={unlocked[n.id] || !canUnlock(n)}
                    >
                      {unlocked[n.id] ? 'Unlocked' : 'Unlock'}
                    </ResponsiveButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {open && (
        <SkillTreeModal isOpen={open} onClose={() => setOpen(false)} />
      )}
    </ResponsivePanel>
  );
}

export default ModularSkillTreePanel;
