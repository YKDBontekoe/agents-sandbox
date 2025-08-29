import { NextResponse } from 'next/server';
import { workflowStore } from '@/lib/workflow-store';
import { WorkflowTemplate } from '@/types/workflow';
import { requireUser } from '@/lib/auth';

export async function GET() {
  const workflows = workflowStore.getAllWorkflows();
  return NextResponse.json(workflows);
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'> = await request.json();
  const workflow = workflowStore.createWorkflow(data);
  return NextResponse.json(workflow, { status: 201 });
}
