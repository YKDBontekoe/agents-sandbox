export type WorkflowNodeType = 'task' | 'condition' | 'loop' | 'parallel';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  data?: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string; // for conditional branches
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: Date;
  updatedAt: Date;
}
