import { NextResponse } from 'next/server';
import { persistence } from '@/lib/persistence/file';
import { AgentSession } from '@/types/agent';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const sessions = await persistence.readSessions();
  const filtered: AgentSession[] = sessions.filter(s => s.agentId === params.id);
  return NextResponse.json(filtered);
}
