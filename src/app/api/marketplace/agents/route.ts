import { NextResponse } from 'next/server';
import { marketplaceStore } from '@/lib/marketplace-store';
import { AgentConfig } from '@/types/agent';

export async function GET() {
  const agents = marketplaceStore.listAgents();
  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  const data: AgentConfig = await request.json();
  const agent = marketplaceStore.publishAgent(data);
  return NextResponse.json(agent, { status: 201 });
}
