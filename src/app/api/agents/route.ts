import { NextResponse } from 'next/server';
import { persistence } from '@/lib/persistence/file';
import { AgentConfig } from '@/types/agent';
import { generateId } from '@/lib/utils';

const KEY = 'agents';

function parseAgent(raw: any): AgentConfig {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  } as AgentConfig;
}

export async function GET() {
  const data = await persistence.read<AgentConfig[]>(KEY, []);
  const agents = data.map(parseAgent);
  return NextResponse.json(agents);
}

export async function POST(req: Request) {
  const data = await persistence.read<AgentConfig[]>(KEY, []);
  const body = await req.json();
  const agent: AgentConfig = {
    ...body,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  data.push(agent);
  await persistence.write(KEY, data);
  return NextResponse.json(agent, { status: 201 });
}
