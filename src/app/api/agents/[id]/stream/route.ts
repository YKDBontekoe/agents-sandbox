import { APIClient } from '@/lib/api-client';
import { persistence } from '@/lib/persistence/file';
import { AgentConfig, ChatMessage } from '@/types/agent';

const KEY = 'agents';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await persistence.read<AgentConfig[]>(KEY, []);
  const agent = data.find(a => a.id === id);
  if (!agent) return new Response('Not found', { status: 404 });

  const { searchParams } = new URL(req.url);
  const messagesParam = searchParams.get('messages');
  const messages: ChatMessage[] = messagesParam ? JSON.parse(messagesParam) : [];

  const client = new APIClient(agent.modelConfig, agent.id);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const token of client.streamMessage(
          messages,
          agent.systemPrompt,
          agent.temperature,
          agent.maxTokens
        )) {
          controller.enqueue(encoder.encode(`data: ${token}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
