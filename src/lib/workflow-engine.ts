import { WorkflowTemplate, WorkflowEdge } from '@/types/workflow';
import { persistence } from './persistence/file';
import { APIClient } from './api-client';
import type { AgentConfig } from '@/types/agent';

const WORKFLOW_KEY = 'workflows';
const AGENT_KEY = 'agents';

export type WorkflowContext = Record<string, unknown>;

interface RunOptions {
  onUpdate?: (message: string) => void;
  invokeAgent?: (agentId: string, input: string, ctx: WorkflowContext) => Promise<unknown>;
}

function parseWorkflow(raw: WorkflowTemplate): WorkflowTemplate {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

async function loadWorkflow(id: string): Promise<WorkflowTemplate | null> {
  const data = await persistence.read<WorkflowTemplate[]>(WORKFLOW_KEY, []);
  const wf = data.find(w => w.id === id);
  return wf ? parseWorkflow(wf) : null;
}

async function loadAgent(id: string): Promise<AgentConfig | null> {
  const data = await persistence.read<AgentConfig[]>(AGENT_KEY, []);
  const ag = data.find(a => a.id === id);
  return ag
    ? ({
        ...ag,
        createdAt: new Date(ag.createdAt),
        updatedAt: new Date(ag.updatedAt),
      } as AgentConfig)
    : null;
}

export async function runWorkflow(
  templateId: string,
  context: WorkflowContext = {},
  options: RunOptions = {}
): Promise<WorkflowContext> {
  const { onUpdate, invokeAgent } = options;
  const template = await loadWorkflow(templateId);
  if (!template) throw new Error(`Workflow ${templateId} not found`);

  const nodeMap = new Map(template.nodes.map(n => [n.id, n]));
  const edgesBySource = new Map<string, WorkflowEdge[]>();
  const edgesByTarget = new Map<string, WorkflowEdge[]>();
  for (const edge of template.edges) {
    if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
    edgesBySource.get(edge.source)!.push(edge);
    if (!edgesByTarget.has(edge.target)) edgesByTarget.set(edge.target, []);
    edgesByTarget.get(edge.target)!.push(edge);
  }

  const startNodes = template.nodes.filter(n => !edgesByTarget.has(n.id));
  for (const node of startNodes) {
    await executeNode(node.id);
  }
  return context;

  async function executeNode(nodeId: string): Promise<void> {
    const node = nodeMap.get(nodeId);
    if (!node) return;
    switch (node.type) {
      case 'task': {
        const agentId = node.data?.agentId as string;
        const input = String(node.data?.input ?? '');
        let result: unknown = null;
        if (invokeAgent) {
          result = await invokeAgent(agentId, input, context);
        } else if (agentId) {
          const agent = await loadAgent(agentId);
          if (!agent) throw new Error(`Agent ${agentId} not found`);
          const client = new APIClient(agent.modelConfig, agent.id);
          result = await client.sendMessage(
            [{ role: 'user', content: input }],
            agent.systemPrompt,
            agent.temperature,
            agent.maxTokens
          );
        }
        context[node.id] = result;
        onUpdate?.(`task:${node.id}`);
        for (const e of edgesBySource.get(node.id) || []) {
          await executeNode(e.target);
        }
        break;
      }
      case 'condition': {
        const outs = edgesBySource.get(node.id) || [];
        let chosen: WorkflowEdge | undefined;
        let fallback: WorkflowEdge | undefined;
        for (const e of outs) {
          if (!e.condition) {
            if (!fallback) fallback = e;
            continue;
          }
          try {
            const fn = new Function('context', `with (context) { return (${e.condition}); }`);
            if (fn(context)) {
              chosen = e;
              break;
            }
          } catch {
            // ignore evaluation errors
          }
        }
        const edge = chosen || fallback;
        if (edge) {
          onUpdate?.(`condition:${node.id}->${edge.target}`);
          await executeNode(edge.target);
        }
        break;
      }
      case 'loop': {
        const count = Number(node.data?.count ?? 0);
        const outs = edgesBySource.get(node.id) || [];
        const body = outs[0];
        const after = outs[1];
        for (let i = 0; i < count; i++) {
          onUpdate?.(`loop:${node.id}:${i + 1}`);
          if (body) await executeNode(body.target);
        }
        if (after) await executeNode(after.target);
        break;
      }
      case 'parallel': {
        const outs = edgesBySource.get(node.id) || [];
        onUpdate?.(`parallel:${node.id}:start`);
        await Promise.all(outs.map(e => executeNode(e.target)));
        onUpdate?.(`parallel:${node.id}:end`);
        break;
      }
    }
  }
}

export type { RunOptions };
