import { NextRequest, NextResponse } from 'next/server';
import { marketplaceStore } from '@/lib/marketplace-store';
import { requireAdmin, requireUser } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = marketplaceStore.getAgent(id);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  return NextResponse.json(agent);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin) {
    const user = await requireUser(request);
    return NextResponse.json(
      { error: user ? 'Forbidden' : 'Unauthorized' },
      { status: user ? 403 : 401 }
    );
  }
  const { id } = await params;
  const deleted = marketplaceStore.deleteAgent(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  return NextResponse.json({}, { status: 204 });
}
