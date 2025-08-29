import { NextResponse } from 'next/server';
import { persistence } from '@/lib/persistence/file';
import { WorkflowTemplate } from '@/types/workflow';

const KEY = 'workflows';

function parseWorkflow(raw: unknown): WorkflowTemplate {
  const data = raw as WorkflowTemplate;
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const data = await persistence.read<WorkflowTemplate[]>(KEY, []);
  const workflow = data.find(w => w.id === params.id);
  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(parseWorkflow(workflow));
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const data = await persistence.read<WorkflowTemplate[]>(KEY, []);
  const index = data.findIndex(w => w.id === params.id);
  if (index === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updates = await req.json();
  const updated: WorkflowTemplate = {
    ...data[index],
    ...updates,
    id: params.id,
    updatedAt: new Date(),
  };
  data[index] = updated;
  await persistence.write(KEY, data);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const data = await persistence.read<WorkflowTemplate[]>(KEY, []);
  const filtered = data.filter(w => w.id !== params.id);
  const deleted = filtered.length !== data.length;
  if (deleted) {
    await persistence.write(KEY, filtered);
  }
  return NextResponse.json({ success: deleted });
}
