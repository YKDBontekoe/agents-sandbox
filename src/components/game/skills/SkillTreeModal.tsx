import React, { useState, useMemo, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import ConstellationSkillTree from './ConstellationSkillTree';
import { generateSkillTree, SkillNode } from './procgen';

interface SkillTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SkillTreeModal({ isOpen, onClose }: SkillTreeModalProps) {
  const [seed] = useState<number>(12345);
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { 
      return JSON.parse(localStorage.getItem('ad_skills_unlocked') || '{}'); 
    } catch { 
      return {}; 
    }
  });

  const tree = useMemo(() => generateSkillTree(seed), [seed]);

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
            <div className="absolute top-0 left-0 right-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="font-bold text-xl text-white">Path of Exile Style Skill Tree</div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 text-slate-300 hover:text-white"
                aria-label="Close skill tree"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* PoE Skill Tree Canvas */}
             <div className="absolute inset-0 pt-16">
                <ConstellationSkillTree 
                  tree={tree}
                  unlocked={unlocked}
                  onUnlock={handleUnlock}
                  colorFor={colorFor}
                />
              </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
