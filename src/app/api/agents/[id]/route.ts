import { NextResponse } from 'next/server';
import { persistence } from '@/lib/persistence/file';
import { AgentConfig } from '@/types/agent';

const KEY = 'agents';

function parseAgent(raw: any): AgentConfig {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  } as AgentConfig;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const data = await persistence.read<AgentConfig[]>(KEY, []);
  const agent = data.find(a => a.id === params.id);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(parseAgent(agent));
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const data = await persistence.read<AgentConfig[]>(KEY, []);
  const index = data.findIndex(a => a.id === params.id);
  if (index === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updates = await req.json();
  const updated: AgentConfig = {
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
  const data = await persistence.read<AgentConfig[]>(KEY, []);
  const filtered = data.filter(a => a.id !== params.id);
  const deleted = filtered.length !== data.length;
  if (deleted) {
    await persistence.write(KEY, filtered);
  }
  return NextResponse.json({ success: deleted });
}
