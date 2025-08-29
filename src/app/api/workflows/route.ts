import { NextResponse } from 'next/server';
import { persistence } from '@/lib/persistence/file';
import { WorkflowTemplate } from '@/types/workflow';
import { generateId } from '@/lib/utils';

const KEY = 'workflows';

function parseWorkflow(raw: unknown): WorkflowTemplate {
  const data = raw as {
    [key: string]: unknown;
    createdAt: string;
    updatedAt: string;
  };
  return {
    ...(data as unknown as Omit<WorkflowTemplate, 'createdAt' | 'updatedAt'>),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function GET() {
  const data = await persistence.read<WorkflowTemplate[]>(KEY, []);
  const workflows = data.map(parseWorkflow);
  return NextResponse.json(workflows);
}

export async function POST(req: Request) {
  const data = await persistence.read<WorkflowTemplate[]>(KEY, []);
  const body = await req.json();
  const workflow: WorkflowTemplate = {
    ...body,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  data.push(workflow);
  await persistence.write(KEY, data);
  return NextResponse.json(workflow, { status: 201 });
}
