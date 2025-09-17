import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { collectUnlockBlockers } from '../unlock';
import { createConstellationLayout } from '../layout/constellation';
import { computeHighlight } from '../layout/highlights';
import type { ConstellationNode, ConstellationSkillTreeProps, SkillNode, TooltipState, Vec2 } from '../types';
import type { ConstellationLayout } from '../layout/constellation';
import type { ControllerHandlers } from './useConstellationController';

const INITIAL_TOOLTIP_STATE: TooltipState = {
  visible: false,
  x: 0,
  y: 0,
  node: null,
  fadeIn: 0,
  anchor: 'top',
  offset: { x: 0, y: 0 },
};

interface UseConstellationSkillTreeResult {
  layout: ConstellationLayout;
  hover: ConstellationNode | null;
  selected: ConstellationNode | null;
  pan: Vec2;
  zoom: number;
  size: { w: number; h: number };
  tooltip: TooltipState;
  highlightNodes: Set<string>;
  highlightEdges: Set<string>;
  canAfford: (node: SkillNode) => boolean;
  checkUnlock: (node: SkillNode) => { ok: boolean; reasons: string[] };
  setHover: Dispatch<SetStateAction<ConstellationNode | null>>;
  handleSelectedChange: (node: ConstellationNode | null) => void;
  setPan: Dispatch<SetStateAction<Vec2>>;
  setZoom: Dispatch<SetStateAction<number>>;
  setSize: Dispatch<SetStateAction<{ w: number; h: number }>>;
  setTooltip: Dispatch<SetStateAction<TooltipState>>;
  registerControls: (handlers: ControllerHandlers) => void;
  controls: ControllerHandlers | null;
}

export function useConstellationSkillTree({
  tree,
  unlocked,
  focusNodeId,
  resources,
  onSelectNode,
}: ConstellationSkillTreeProps): UseConstellationSkillTreeResult {
  const [hover, setHover] = useState<ConstellationNode | null>(null);
  const [selected, setSelected] = useState<ConstellationNode | null>(null);
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(0.8);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1200, h: 800 });
  const [tooltip, setTooltip] = useState<TooltipState>(INITIAL_TOOLTIP_STATE);
  const [controls, setControls] = useState<ControllerHandlers | null>(null);
  const lastAutoFitRadius = useRef<number | null>(null);

  const layout = useMemo(() => createConstellationLayout(tree), [tree]);

  const layoutById = useMemo(() => {
    const map = new Map<string, ConstellationNode>();
    layout.nodes.forEach((node) => {
      map.set(node.node.id, node);
    });
    return map;
  }, [layout.nodes]);

  const checkUnlock = useCallback(
    (node: SkillNode) => {
      const reasons = collectUnlockBlockers({ node, unlocked, nodes: tree.nodes });
      return { ok: reasons.length === 0, reasons };
    },
    [tree.nodes, unlocked],
  );

  const canAfford = useCallback(
    (node: SkillNode) => {
      if (!resources) return true;
      const cost = node.cost ?? {};
      if (typeof cost.coin === 'number' && (resources.coin || 0) < cost.coin) return false;
      if (typeof cost.mana === 'number' && (resources.mana || 0) < cost.mana) return false;
      if (typeof cost.favor === 'number' && (resources.favor || 0) < cost.favor) return false;
      return true;
    },
    [resources],
  );

  const handleSelectedChange = useCallback(
    (node: ConstellationNode | null) => {
      setSelected(node);
      onSelectNode?.(node?.node.id ?? null);
    },
    [onSelectNode],
  );

  const highlightTargetId = hover?.node.id ?? selected?.node.id ?? null;
  const { nodes: highlightNodes, edges: highlightEdges } = useMemo(
    () => computeHighlight({ targetId: highlightTargetId, tree, layoutNodes: layout.nodes }),
    [highlightTargetId, tree, layout.nodes],
  );

  const registerControls = useCallback((handlers: ControllerHandlers) => {
    setControls((prev) => (prev === handlers ? prev : handlers));
  }, []);

  useEffect(() => {
    if (!controls || !focusNodeId) return;
    const node = layoutById.get(focusNodeId);
    if (!node) return;

    const targetZoom = Math.min(2.5, Math.max(0.7, 1.4));
    controls.zoomTo(targetZoom);
    setPan({ x: -node.x, y: -node.y });
    handleSelectedChange(node);
  }, [controls, focusNodeId, handleSelectedChange, layoutById]);

  useEffect(() => {
    if (!controls || layout.nodes.length === 0) return;

    const maxRadius = layout.metrics?.maxConstellationRadius ?? 0;
    const previous = lastAutoFitRadius.current;

    if (focusNodeId) {
      lastAutoFitRadius.current = maxRadius;
      return;
    }

    if (previous === null || maxRadius > previous + 1) {
      lastAutoFitRadius.current = maxRadius;
      controls.fitToView();
    } else if (previous !== maxRadius) {
      lastAutoFitRadius.current = maxRadius;
    }
  }, [controls, focusNodeId, layout.metrics?.maxConstellationRadius, layout.nodes.length]);

  return {
    layout,
    hover,
    selected,
    pan,
    zoom,
    size,
    tooltip,
    highlightNodes,
    highlightEdges,
    canAfford,
    checkUnlock,
    setHover,
    handleSelectedChange,
    setPan,
    setZoom,
    setSize,
    setTooltip,
    registerControls,
    controls,
  };
}

export { INITIAL_TOOLTIP_STATE as initialTooltipState };
