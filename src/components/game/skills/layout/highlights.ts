import type { ConstellationNode, SkillTree } from '../types';

export interface HighlightResult {
  nodes: Set<string>;
  edges: Set<string>;
}

interface HighlightOptions {
  targetId: string | null;
  tree: SkillTree;
  layoutNodes: ConstellationNode[];
}

const buildLayoutMap = (layoutNodes: ConstellationNode[]): Map<string, ConstellationNode> => {
  const map = new Map<string, ConstellationNode>();
  layoutNodes.forEach((node) => {
    map.set(node.node.id, node);
  });
  return map;
};

const buildDependentsMap = (tree: SkillTree): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  for (const node of tree.nodes) {
    for (const requirement of node.requires ?? []) {
      if (!map.has(requirement)) {
        map.set(requirement, []);
      }
      map.get(requirement)!.push(node.id);
    }
  }
  return map;
};

export function computeHighlight({ targetId, tree, layoutNodes }: HighlightOptions): HighlightResult {
  if (!targetId) {
    return { nodes: new Set(), edges: new Set() };
  }

  const layoutById = buildLayoutMap(layoutNodes);
  if (!layoutById.has(targetId)) {
    return { nodes: new Set(), edges: new Set() };
  }

  const dependentsById = buildDependentsMap(tree);
  const nodeSet = new Set<string>();
  const edgeSet = new Set<string>();
  const syntheticEdgeSet = new Set<string>();

  const visitAncestors = (id: string) => {
    if (nodeSet.has(id)) return;
    nodeSet.add(id);
    const layoutNode = layoutById.get(id);
    const requires = layoutNode?.node.requires ?? [];
    for (const requirement of requires) {
      edgeSet.add(`${requirement}->${id}`);
      visitAncestors(requirement);
    }
  };

  visitAncestors(targetId);

  const visitDependents = (id: string) => {
    const dependents = dependentsById.get(id);
    if (!dependents) return;
    for (const dependentId of dependents) {
      edgeSet.add(`${id}->${dependentId}`);
      if (!nodeSet.has(dependentId)) {
        nodeSet.add(dependentId);
        visitDependents(dependentId);
      }
    }
  };

  visitDependents(targetId);

  for (const edge of tree.edges) {
    if (!layoutById.has(edge.from) || !layoutById.has(edge.to)) {
      continue;
    }

    const toNode = layoutById.get(edge.to)?.node;
    if (toNode?.requires?.includes(edge.from)) {
      continue;
    }

    const bridgeKey = `bridge:${edge.from}->${edge.to}`;
    if (edge.from === targetId || edge.to === targetId) {
      syntheticEdgeSet.add(bridgeKey);
      nodeSet.add(edge.from);
      nodeSet.add(edge.to);
      continue;
    }

    if (nodeSet.has(edge.from) && nodeSet.has(edge.to)) {
      syntheticEdgeSet.add(bridgeKey);
    }
  }

  const edges = new Set<string>([...edgeSet, ...syntheticEdgeSet]);
  return { nodes: nodeSet, edges };
}
