import React from 'react';
import { resolveSpecialAbility } from './specialAbilities';
import type { SkillNode, SkillTree } from './types';

type UnlockCheckResult = { ok: boolean; reasons: string[] };

interface SkillTooltipContentProps {
  node: SkillNode;
  tree: SkillTree;
  unlocked: Record<string, boolean>;
  colorFor: (category: SkillNode['category']) => string;
  checkUnlock: (node: SkillNode) => UnlockCheckResult;
  canAfford: (node: SkillNode) => boolean;
}

const formatPower = (power: number): string => {
  const rounded = Number.isInteger(power) ? power.toString() : power.toFixed(2);
  return rounded.replace(/\.00$/, '');
};

export default function SkillTooltipContent({
  node,
  tree,
  unlocked,
  colorFor,
  checkUnlock,
  canAfford,
}: SkillTooltipContentProps) {
  const accent = colorFor(node.category);
  const ability = resolveSpecialAbility(node.specialAbility);
  const unlockState = checkUnlock(node);
  const isUnlocked = Boolean(unlocked[node.id]);
  const affordable = canAfford(node);

  return (
    <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl border border-gray-600/50 overflow-hidden">
      <div
        className="absolute inset-0 rounded-xl opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${accent}40, transparent 70%)`,
        }}
      />

      <div className="relative p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 shadow-lg"
            style={{
              backgroundColor: accent,
              boxShadow: `0 0 12px ${accent}60`,
            }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base leading-tight mb-1">
              {node.title}
            </h3>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              {node.category}
            </div>
          </div>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed mb-4 font-light">
          {node.description}
        </p>

        {ability && (
          <div className="mb-4 border-t border-gray-700/50 pt-4">
            <h4 className="text-indigo-300 text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">✨</span>
              Special Ability
            </h4>
            <div className="bg-gray-800/50 rounded-lg border border-indigo-500/20 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold truncate" title={ability.name}>
                    {ability.name}
                  </div>
                  <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                    {ability.description}
                  </p>
                  {ability.flavor && (
                    <p className="text-xs italic text-indigo-200/80 mt-2">
                      “{ability.flavor}”
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end text-xs text-indigo-200 gap-1">
                  <span className="uppercase tracking-wide font-semibold">
                    Power {formatPower(ability.power)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-[10px] uppercase tracking-wider">
                    {ability.quality}
                  </span>
                </div>
              </div>
              {(ability.duration || ability.cooldown) && (
                <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-indigo-200/80">
                  {ability.duration && (
                    <span className="px-2 py-0.5 rounded-full border border-indigo-400/30 bg-indigo-500/10">
                      Duration: {ability.duration}
                    </span>
                  )}
                  {ability.cooldown && (
                    <span className="px-2 py-0.5 rounded-full border border-indigo-400/30 bg-indigo-500/10">
                      Cooldown: {ability.cooldown}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {node.effects && node.effects.length > 0 && (
          <div
            className={`mb-4 pt-4 ${ability ? 'border-t border-gray-700/30' : 'border-t border-gray-700/50'}`}
          >
            <h4 className="text-yellow-400 text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full" />
              Effects
            </h4>
            <div className="space-y-2">
              {node.effects.map((effect, i) => {
                let effectText = '';
                let effectIcon = '⚡';
                switch (effect.kind) {
                  case 'resource_multiplier':
                    effectText = `+${((effect.factor - 1) * 100).toFixed(0)}% ${effect.resource}`;
                    effectIcon = '💰';
                    break;
                  case 'building_multiplier':
                    effectText = `+${((effect.factor - 1) * 100).toFixed(0)}% ${effect.typeId}`;
                    effectIcon = '🏗️';
                    break;
                  case 'upkeep_delta':
                    effectText = `${effect.grainPerWorkerDelta > 0 ? '+' : ''}${effect.grainPerWorkerDelta} grain per worker`;
                    effectIcon = '🌾';
                    break;
                  case 'route_bonus':
                    effectText = `+${effect.percent}% route efficiency`;
                    effectIcon = '🛤️';
                    break;
                  case 'logistics_bonus':
                    effectText = `+${effect.percent}% logistics`;
                    effectIcon = '📦';
                    break;
                  case 'special_ability':
                    effectText = `${effect.description} (Power: ${effect.power})`;
                    effectIcon = '✨';
                    break;
                }
                return (
                  <div key={`${node.id}-effect-${i}`} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700/30">
                    <span className="text-sm">{effectIcon}</span>
                    <span className="text-green-400 text-sm font-medium flex-1">{effectText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {node.requires && node.requires.length > 0 && (
          <div className="mb-2">
            <h4 className="text-gray-400 text-xs font-medium mb-1">Requirements:</h4>
            {node.requires.map(reqId => {
              const reqNode = tree.nodes.find(n => n.id === reqId);
              const isMet = unlocked[reqId];
              return (
                <div
                  key={reqId}
                  className={`text-xs ${isMet ? 'text-green-400' : 'text-red-400'}`}
                >
                  {isMet ? '✓' : '✗'} {reqNode?.title || reqId}
                </div>
              );
            })}
          </div>
        )}

        {!isUnlocked && !unlockState.ok && unlockState.reasons.length > 0 && (
          <div className="mb-2">
            <h4 className="text-red-400 text-xs font-medium mb-1">Locked:</h4>
            <ul className="list-disc list-inside">
              {unlockState.reasons.map((reason, index) => (
                <li key={`${node.id}-lock-${index}`} className="text-xs text-red-300">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-gray-700">
          <div
            className={`text-xs font-medium ${
              isUnlocked
                ? 'text-green-400'
                : unlockState.ok
                  ? affordable
                    ? 'text-yellow-400'
                    : 'text-red-300'
                  : 'text-red-400'
            }`}
          >
            {isUnlocked
              ? '✓ Unlocked'
              : unlockState.ok
                ? affordable
                  ? '⚡ Available'
                  : '⚡ Available • insufficient funds'
                : '🔒 Locked'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Category: {node.category}</div>
        </div>
      </div>
    </div>
  );
}
