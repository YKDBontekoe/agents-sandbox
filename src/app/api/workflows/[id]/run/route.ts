import { runWorkflow } from '@/lib/workflow-engine';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  let context: Record<string, unknown> = {};
  try {
    context = await req.json();
  } catch {
    // ignore parsing errors and use empty context
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await runWorkflow(params.id, context, {
          onUpdate(message) {
            controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          },
        });
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
