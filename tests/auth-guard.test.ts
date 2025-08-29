import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as publishAgent } from '@/app/api/marketplace/agents/route';
import { DELETE as deleteAgent } from '@/app/api/marketplace/agents/[id]/route';
import { POST as createWorkflow } from '@/app/api/workflows/route';
import { DELETE as deleteWorkflow } from '@/app/api/workflows/[id]/route';
import { signToken } from '@/lib/auth';
import { NextRequest } from 'next/server';

const agentData = {
  name: 'Test Agent',
  type: 'chat',
  description: 'desc',
  systemPrompt: '',
  modelConfig: { provider: 'openai', apiKey: '', model: '' },
  temperature: 0,
  maxTokens: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const workflowData = {
  name: 'Test WF',
  nodes: [],
  edges: [],
};

test('publishing agent requires authentication', async () => {
  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify(agentData),
  });
  const res = await publishAgent(req);
  assert.equal(res.status, 401);
});

test('creating workflow requires authentication', async () => {
  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify(workflowData),
  });
  const res = await createWorkflow(req);
  assert.equal(res.status, 401);
});

test('deleting workflow requires admin role', async () => {
  const adminToken = await signToken({ username: 'admin', role: 'admin' });
  const createReq = new Request('http://test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(workflowData),
  });
  const createRes = await createWorkflow(createReq);
  const workflow = await createRes.json();

  const userToken = await signToken({ username: 'user', role: 'user' });
  const delReq = new NextRequest('http://test', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const delRes = await deleteWorkflow(delReq, {
    params: Promise.resolve({ id: workflow.id }),
  });
  assert.equal(delRes.status, 403);
});

test('deleting agent without token returns 401', async () => {
  const adminToken = await signToken({ username: 'admin', role: 'admin' });
  const publishReq = new Request('http://test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(agentData),
  });
  const publishRes = await publishAgent(publishReq);
  const agent = await publishRes.json();

  const delReq = new NextRequest('http://test', { method: 'DELETE' });
  const delRes = await deleteAgent(delReq, {
    params: Promise.resolve({ id: agent.id }),
  });
  assert.equal(delRes.status, 401);
});
