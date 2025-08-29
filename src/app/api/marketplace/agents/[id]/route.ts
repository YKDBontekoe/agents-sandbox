import { NextResponse } from 'next/server';
import { marketplaceStore } from '@/lib/marketplace-store';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const agent = marketplaceStore.getAgent(params.id);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  return NextResponse.json(agent);
}
