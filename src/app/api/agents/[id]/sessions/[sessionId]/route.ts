import { NextResponse } from 'next/server';
import { persistence } from '@/lib/persistence/file';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;
  const sessions = await persistence.readSessions();
  const filtered = sessions.filter(
    s => !(s.id === sessionId && s.agentId === id)
  );
  const deleted = filtered.length !== sessions.length;
  if (deleted) {
    await persistence.writeSessions(filtered);
  }
  return NextResponse.json({ success: deleted });
}
