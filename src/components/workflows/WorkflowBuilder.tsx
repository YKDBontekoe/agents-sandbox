'use client';

import React, { useCallback, useState, useRef } from 'react';
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
import { Download, Upload } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { workflowStore } from '@/lib/workflow-store';
import { WorkflowNodeType, WorkflowTemplate, WorkflowNode, WorkflowEdge } from '@/types/workflow';

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = {
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
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (
          typeof data.name !== 'string' ||
          !Array.isArray(data.nodes) ||
          !Array.isArray(data.edges)
        ) {
          throw new Error('Invalid workflow file');
        }
        setName(data.name);
        setNodes(
          data.nodes.map((n: WorkflowNode) => ({
            id: n.id,
            position: n.position,
            data: { ...n.data, label: n.label, nodeType: n.type },
          })),
        );
        setEdges(
          data.edges.map((e: WorkflowEdge) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            data: { condition: e.condition },
          })),
        );
        workflowStore.createWorkflow({
          name: data.name,
          nodes: data.nodes,
          edges: data.edges,
        });
      } catch (err) {
        console.error('Failed to import workflow:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
        <Button variant="outline" onClick={handleLoad}>
          Load
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImport}
          className="hidden"
        />
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
    </div>
  );
}
