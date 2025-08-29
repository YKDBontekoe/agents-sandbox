import { NextRequest, NextResponse } from 'next/server';
import { marketplaceStore } from '@/lib/marketplace-store';
import sanitizeHtml from 'sanitize-html';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agentId = sanitizeHtml(id);
  const agent = marketplaceStore.getAgent(agentId);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  return NextResponse.json(agent);
}
