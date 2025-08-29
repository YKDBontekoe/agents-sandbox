import { NextRequest, NextResponse } from 'next/server';
import { persistence } from '@/lib/persistence/file';
import { AgentConfig } from '@/types/agent';

const KEY = 'agents';

function parseAgent(raw: unknown): AgentConfig {
  const data = raw as {
    [key: string]: unknown;
    createdAt: string;
    updatedAt: string;
  };
  return {
    ...(data as unknown as Omit<AgentConfig, 'createdAt' | 'updatedAt'>),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await persistence.read<AgentConfig[]>(KEY, []);
  const agent = data.find(a => a.id === id);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(parseAgent(agent));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await persistence.read<AgentConfig[]>(KEY, []);
  const index = data.findIndex(a => a.id === id);
  if (index === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updates = await req.json();
  const updated: AgentConfig = {
    ...data[index],
    ...updates,
    id,
    updatedAt: new Date(),
  };
  data[index] = updated;
  await persistence.write(KEY, data);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await persistence.read<AgentConfig[]>(KEY, []);
  const filtered = data.filter(a => a.id !== id);
  const deleted = filtered.length !== data.length;
  if (deleted) {
    await persistence.write(KEY, filtered);
  }
  return NextResponse.json({ success: deleted });
}
