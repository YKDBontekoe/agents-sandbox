import { NextResponse } from 'next/server';
import { persistence } from '@/lib/persistence/file';
import { AgentSession } from '@/types/agent';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessions = await persistence.readSessions();
  const filtered: AgentSession[] = sessions.filter(s => s.agentId === id);
  return NextResponse.json(filtered);
}
