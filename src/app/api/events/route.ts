import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

export function GET(req: NextRequest) {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      clients.add(c);
      c.enqueue(encoder.encode(': connected\n\n'));
    },
    cancel() {
      clients.delete(controller);
    },
  });

  req.signal.addEventListener('abort', () => {
    clients.delete(controller);
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = `event: ${body.type}\ndata: ${JSON.stringify(body.data)}\n\n`;
  const payload = encoder.encode(message);
  for (const client of clients) {
    client.enqueue(payload);
  }
  return new Response(null, { status: 204 });
}
