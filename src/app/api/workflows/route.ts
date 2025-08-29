import { NextResponse } from 'next/server';
import { workflowStore } from '@/lib/workflow-store';
import { WorkflowTemplate } from '@/types/workflow';
import sanitizeHtml from 'sanitize-html';

const clean = (v: string) => sanitizeHtml(v);

function sanitizeWorkflow(
  data: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>,
): Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...data,
    name: clean(data.name),
    nodes: data.nodes.map((n) => ({
      ...n,
      id: clean(n.id),
      label: clean(n.label),
    })),
    edges: data.edges.map((e) => ({
      ...e,
      id: clean(e.id),
      source: clean(e.source),
      target: clean(e.target),
      condition: e.condition ? clean(e.condition) : undefined,
    })),
  };
}

export async function GET() {
  const workflows = workflowStore.getAllWorkflows();
  return NextResponse.json(workflows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const data = sanitizeWorkflow(body);
  const workflow = workflowStore.createWorkflow(data);
  return NextResponse.json(workflow, { status: 201 });
}
