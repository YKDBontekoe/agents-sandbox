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
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

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

  const handleSave = async () => {
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
    const saved = await workflowStore.createWorkflow(template);
    setWorkflowId(saved.id);
  };

  const handleLoad = async () => {
    const [existing] = await workflowStore.fetchWorkflows();
    if (!existing) return;
    setWorkflowId(existing.id);
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

  const handleRun = async () => {
    if (!workflowId) return;
    setLogs([]);
    const res = await fetch(`/api/workflows/${workflowId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      chunk
        .split('\n')
        .filter(Boolean)
        .forEach(line => {
          if (line.startsWith('data:')) {
            const msg = line.replace(/^data:\s*/, '').trim();
            setLogs(prev => [...prev, msg]);
          }
        });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workflow name"
          className="max-w-xs"
        />
        <Button onClick={handleSave}>Save</Button>
        <Button variant="outline" onClick={handleLoad}>Load</Button>
        <Button variant="outline" onClick={handleRun} disabled={!workflowId}>
          Run
        </Button>
      </div>
      <div className="flex gap-2">
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
      <div className="h-[500px] bg-white border rounded-md">
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
      {logs.length > 0 && (
        <pre className="bg-black text-white p-2 h-40 overflow-auto text-sm">
          {logs.join('\n')}
        </pre>
      )}
    </div>
  );
}
