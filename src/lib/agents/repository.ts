import { AgentConfig } from '@/types/agent';
import { apiFetch } from '../api/fetch';

const baseUrl = '/api/agents';

function parseAgent(raw: AgentConfig): AgentConfig {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export async function fetchAgents(): Promise<AgentConfig[]> {
  try {
    const data = await apiFetch<AgentConfig[]>(baseUrl);
    return data.map(parseAgent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch agents: ${message}`);
  }
}

export async function createAgent(
  config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AgentConfig> {
  try {
    const agent = await apiFetch<AgentConfig>(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return parseAgent(agent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create agent: ${message}`);
  }
}

export async function updateAgent(
  id: string,
  updates: Partial<AgentConfig>
): Promise<AgentConfig> {
  try {
    const agent = await apiFetch<AgentConfig>(`${baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return parseAgent(agent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update agent: ${message}`);
  }
}

export async function deleteAgent(id: string): Promise<void> {
  try {
    await apiFetch<void>(`${baseUrl}/${id}`, { method: 'DELETE' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete agent: ${message}`);
  }
}

