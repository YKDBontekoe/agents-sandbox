import { NextResponse } from 'next/server';
import { marketplaceStore } from '@/lib/marketplace-store';
import { AgentConfig } from '@/types/agent';
import sanitizeHtml from 'sanitize-html';

export async function GET() {
  const agents = marketplaceStore.listAgents();
  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  const data: AgentConfig = await request.json();
  const sanitize = (value: string) => sanitizeHtml(value);
  const cleaned: AgentConfig = {
    ...data,
    id: sanitize(data.id),
    name: sanitize(data.name),
    description: sanitize(data.description),
    systemPrompt: sanitize(data.systemPrompt),
  };
  const agent = marketplaceStore.publishAgent(cleaned);
  return NextResponse.json(agent, { status: 201 });
}
