import { NextResponse } from 'next/server';
import { marketplaceStore } from '@/lib/marketplace-store';
import { agentSchema } from '@/lib/schemas/agent';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || undefined;
  const category = searchParams.get('category') || undefined;
  const agents = await marketplaceStore.listAgents({ q, category });
  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  try {
    const data = agentSchema.parse(await request.json());
    const agent = await marketplaceStore.publishAgent(data);
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
