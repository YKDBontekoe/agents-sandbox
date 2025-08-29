import { NextResponse } from 'next/server';
import { persistence } from '@/lib/persistence/file';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; sessionId: string } }
) {
  const sessions = await persistence.readSessions();
  const filtered = sessions.filter(
    s => !(s.id === params.sessionId && s.agentId === params.id)
  );
  const deleted = filtered.length !== sessions.length;
  if (deleted) {
    await persistence.writeSessions(filtered);
  }
  return NextResponse.json({ success: deleted });
}
