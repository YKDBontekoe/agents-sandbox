import { NextRequest, NextResponse } from 'next/server';
import { workflowStore } from '@/lib/workflow-store';
import { WorkflowTemplate } from '@/types/workflow';
import { requireUser, requireAdmin } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workflow = workflowStore.getWorkflow(id);
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }
  return NextResponse.json(workflow);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const updates: Partial<WorkflowTemplate> = await request.json();
  const updated = workflowStore.updateWorkflow(id, updates);
  if (!updated) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin) {
    const user = await requireUser(request);
    return NextResponse.json(
      { error: user ? 'Forbidden' : 'Unauthorized' },
      { status: user ? 403 : 401 }
    );
  }
  const { id } = await params;
  const deleted = workflowStore.deleteWorkflow(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }
  return NextResponse.json({}, { status: 204 });
}
