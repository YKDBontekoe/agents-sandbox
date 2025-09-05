import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { generateSkillTree, SkillNode } from './procgen';

interface SkillTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LayoutNode = SkillNode & { depth: number; x: number; y: number };

export default function SkillTreeModal({ isOpen, onClose }: SkillTreeModalProps) {
  const [seed] = useState<number>(12345);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const tree = useMemo(() => generateSkillTree(seed), [seed]);
  const unlocked = useMemo<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('ad_skills_unlocked') || '{}'); } catch { return {}; }
  }, [isOpen]);

  // Layout nodes by depth (longest prerequisite chain)
  const { nodes, edges } = useMemo(() => {
    const depth: Record<string, number> = {};
    const byId: Record<string, SkillNode> = {};
    tree.nodes.forEach(n => { byId[n.id] = n; depth[n.id] = 0; });
    let changed = true; let guard = 0;
    while (changed && guard++ < 100) {
      changed = false;
      for (const n of tree.nodes) {
        const reqDepth = Math.max(0, ...(n.requires || []).map(r => depth[r] ?? 0));
        const nd = (n.requires?.length ? reqDepth + 1 : 0);
        if (nd > (depth[n.id] ?? 0)) { depth[n.id] = nd; changed = true; }
      }
    }
    const byDepth: Record<number, SkillNode[]> = {};
    tree.nodes.forEach(n => { const d = depth[n.id] || 0; (byDepth[d] = byDepth[d] || []).push(n); });
    const columnW = 260; const nodeH = 70; const vGap = 24; const hGap = 120;
    const layoutNodes: LayoutNode[] = [];
    Object.keys(byDepth).map(Number).sort((a,b)=>a-b).forEach(d => {
      const col = byDepth[d];
      col.forEach((n, i) => {
        layoutNodes.push({ ...n, depth: d, x: d * (columnW + hGap), y: i * (nodeH + vGap) });
      })
    })
    const pos = Object.fromEntries(layoutNodes.map(n => [n.id, n]));
    const layoutEdges = tree.edges.map(e => ({ from: pos[e.from], to: pos[e.to] })).filter(e => e.from && e.to);
    return { nodes: layoutNodes, edges: layoutEdges };
  }, [tree]);

  const colorFor = (cat: SkillNode['category']) => ({
    economic: '#0ea5e9', military: '#ef4444', mystical: '#a855f7', infrastructure: '#22c55e', diplomatic: '#f59e0b', social: '#64748b'
  }[cat] || '#64748b');

  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const dz = e.deltaY < 0 ? 0.1 : -0.1;
    setScale(s => Math.min(2, Math.max(0.5, s + dz)));
  };
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => { draggingRef.current = true; dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; };
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!draggingRef.current || !dragStartRef.current) return;
    setOffset({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  };
  const onMouseUp = () => { draggingRef.current = false; dragStartRef.current = null; };

  const handleUnlock = (n: SkillNode) => {
    const reqMet = (n.requires || []).every(r => unlocked[r]);
    if (!reqMet || unlocked[n.id]) return;
    try { window.dispatchEvent(new CustomEvent('ad_unlock_skill', { detail: n })); } catch {}
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[100]" />
        <Dialog.Content className="fixed inset-0 z-[110] flex items-stretch justify-stretch p-0">
          <div
            className="relative flex-1 bg-neutral-900 text-white select-none"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-neutral-800/80 backdrop-blur-sm border-b border-neutral-700 flex items-center justify-between px-4 py-2">
              <div className="font-semibold">Skill Tree</div>
              <div className="flex items-center gap-3">
                <div className="text-xs opacity-80">Seed {seed}</div>
                <div className="text-xs opacity-80">Scale {(scale*100)|0}%</div>
                <Dialog.Close asChild>
                  <button className="px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600">Close</button>
                </Dialog.Close>
              </div>
            </div>

            {/* Canvas */}
            <div className="absolute inset-0 top-8 overflow-hidden">
              <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }} className="relative w-[2400px] h-[1600px]">
                <svg className="absolute inset-0 w-full h-full">
                  {edges.map((e, i) => (
                    <path key={i} d={`M ${e.from.x+120} ${e.from.y+35} C ${e.from.x+200} ${e.from.y+35}, ${e.to.x-80} ${e.to.y+35}, ${e.to.x} ${e.to.y+35}`}
                      stroke="#94a3b8" strokeOpacity={0.6} fill="none" strokeWidth={2} />
                  ))}
                </svg>
                {nodes.map((n) => {
                  const isUnlocked = !!unlocked[n.id];
                  const reqMet = (n.requires || []).every(r => unlocked[r]);
                  const bg = isUnlocked ? 'bg-emerald-700' : reqMet ? 'bg-neutral-700 hover:bg-neutral-600 cursor-pointer' : 'bg-neutral-800 opacity-60';
                  return (
                    <div key={n.id} className={`absolute rounded-lg border border-neutral-600 text-white px-3 py-2 w-[240px] shadow ${bg}`}
                      style={{ left: n.x, top: n.y }}
                      onClick={() => handleUnlock(n)}
                      title={!reqMet && !isUnlocked ? 'Requires prior node' : isUnlocked ? 'Unlocked' : 'Unlock'}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold truncate" style={{ color: colorFor(n.category) }}>{n.title}</div>
                        <div className="text-[11px] opacity-80">{n.category}</div>
                      </div>
                      <div className="text-xs opacity-90 truncate">{n.description}</div>
                      <div className="mt-1 text-[11px] opacity-80 truncate">
                        {n.cost.coin ? `🜚 ${n.cost.coin} ` : ''}{n.cost.mana ? ` ✨ ${n.cost.mana} ` : ''}{n.cost.favor ? ` ☼ ${n.cost.favor}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
