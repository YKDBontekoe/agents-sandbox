import { describe, it, expect, vi, afterEach } from 'vitest';
import { runWorkflow } from '../src/lib/workflow-engine';
import type { WorkflowTemplate } from '../src/types/workflow';
import { persistence } from '../src/lib/persistence/file';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('workflow engine', () => {
  it('follows conditional branches', async () => {
    const template: WorkflowTemplate = {
      id: 'wf1',
      name: 'branch',
      nodes: [
        { id: 'cond', type: 'condition', label: 'cond', position: { x: 0, y: 0 } },
        {
          id: 'a',
          type: 'task',
          label: 'a',
          data: { agentId: 'agent', input: 'A' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'b',
          type: 'task',
          label: 'b',
          data: { agentId: 'agent', input: 'B' },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [
        { id: 'e1', source: 'cond', target: 'a', condition: 'path === "a"' },
        { id: 'e2', source: 'cond', target: 'b', condition: 'path === "b"' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(persistence, 'read').mockImplementation(async (key: string) => {
      return key === 'workflows' ? [template] : [];
    });
    const calls: string[] = [];
    const invokeAgent = vi.fn(async (_id: string, input: string) => {
      calls.push(input);
      return input;
    });
    const ctx = await runWorkflow('wf1', { path: 'b' }, { invokeAgent });
    expect(invokeAgent).toHaveBeenCalledTimes(1);
    expect(calls[0]).toBe('B');
    expect(ctx.b).toBe('B');
  });

  it('executes parallel tasks concurrently', async () => {
    const template: WorkflowTemplate = {
      id: 'wf2',
      name: 'parallel',
      nodes: [
        { id: 'p', type: 'parallel', label: 'p', position: { x: 0, y: 0 } },
        {
          id: 't1',
          type: 'task',
          label: 't1',
          data: { agentId: 'a', input: '1' },
          position: { x: 0, y: 0 },
        },
        {
          id: 't2',
          type: 'task',
          label: 't2',
          data: { agentId: 'b', input: '2' },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [
        { id: 'e1', source: 'p', target: 't1' },
        { id: 'e2', source: 'p', target: 't2' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(persistence, 'read').mockImplementation(async (key: string) => {
      return key === 'workflows' ? [template] : [];
    });
    const log: string[] = [];
    const invokeAgent = vi.fn(async (id: string) => {
      log.push(`start ${id}`);
      await new Promise(r => setTimeout(r, 20));
      log.push(`end ${id}`);
      return id;
    });
    await runWorkflow('wf2', {}, { invokeAgent });
    expect(invokeAgent).toHaveBeenCalledTimes(2);
    const startA = log.indexOf('start a');
    const startB = log.indexOf('start b');
    const endA = log.indexOf('end a');
    const endB = log.indexOf('end b');
    expect(Math.max(startA, startB)).toBeLessThan(Math.min(endA, endB));
  });
});
