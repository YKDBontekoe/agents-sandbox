import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from '../src/app/api/events/route';

const decoder = new TextDecoder();

async function openStream() {
  const res = GET(new Request('http://localhost/api/events'));
  const reader = res.body!.getReader();
  await reader.read(); // discard initial comment
  return reader;
}

test('broadcasts session events to clients', async () => {
  const reader = await openStream();
  await POST(new Request('http://localhost/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'session', data: [{ id: '1' }] }),
  }));
  const { value } = await reader.read();
  const message = decoder.decode(value);
  assert.ok(message.includes('event: session'));
  assert.ok(message.includes('"id":"1"'));
  await reader.cancel();
});

test('broadcasts analytics events to clients', async () => {
  const reader = await openStream();
  await POST(new Request('http://localhost/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'analytics', data: { a: { responseTimes: [1], errorCount: 0, tokensUsed: 0 } } }),
  }));
  const { value } = await reader.read();
  const message = decoder.decode(value);
  assert.ok(message.includes('event: analytics'));
  assert.ok(message.includes('responseTimes'));
  await reader.cancel();
});
