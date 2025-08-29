import { NextResponse } from 'next/server';
import { marketplaceStore } from '@/lib/marketplace-store';
import { AgentConfig } from '@/types/agent';
import { requireUser } from '@/lib/auth';

export async function GET() {
  const agents = marketplaceStore.listAgents();
  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data: AgentConfig = await request.json();
  const agent = marketplaceStore.publishAgent(data);
  return NextResponse.json(agent, { status: 201 });
}
