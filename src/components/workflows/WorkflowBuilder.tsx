'use client';

import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateId } from '@/lib/utils';
import { workflowStore } from '@/lib/workflow-store';
import { WorkflowNodeType, WorkflowTemplate } from '@/types/workflow';

export function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<{ condition?: string }>[]>([]);
  const [name, setName] = useState('Untitled Workflow');

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const addNode = (type: WorkflowNodeType) => {
    const id = generateId();
    setNodes((nds) => [
      ...nds,
      {
        id,
        position: { x: Math.random() * 250, y: Math.random() * 250 },
        data: { label: `${type} node`, nodeType: type },
      },
    ]);
  };

  const handleSave = () => {
    const template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType as WorkflowNodeType,
        label: n.data.label as string,
        data: n.data,
        position: n.position,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        condition: e.data?.condition,
      })),
    };
    workflowStore.createWorkflow(template);
  };

  const handleLoad = () => {
    const [existing] = workflowStore.getAllWorkflows();
    if (!existing) return;
    setName(existing.name);
    setNodes(
      existing.nodes.map((n) => ({
        id: n.id,
        position: n.position,
        data: { ...n.data, label: n.label, nodeType: n.type },
      })),
    );
    setEdges(
      existing.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: { condition: e.condition },
      })),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <label htmlFor="workflow-name" className="sr-only">
          Workflow name
        </label>
        <Input
          id="workflow-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workflow name"
          className="max-w-xs"
        />
        <Button onClick={handleSave}>Save</Button>
        <Button variant="outline" onClick={handleLoad}>
          Load
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => addNode('task')}>
          Add Task
        </Button>
        <Button size="sm" onClick={() => addNode('condition')}>
          Add Condition
        </Button>
        <Button size="sm" onClick={() => addNode('loop')}>
          Add Loop
        </Button>
        <Button size="sm" onClick={() => addNode('parallel')}>
          Add Parallel
        </Button>
      </div>
      <div className="h-[500px] bg-white border rounded-md" role="region" aria-label="Workflow diagram">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}
