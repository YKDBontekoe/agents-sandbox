import { AgentConfig } from '@/types/agent';

const baseUrl = '/api/agents';

function parseAgent(raw: AgentConfig): AgentConfig {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export async function fetchAgents(): Promise<AgentConfig[]> {
  const res = await fetch(baseUrl);
  const data = (await res.json()) as AgentConfig[];
  return data.map(parseAgent);
}

export async function createAgent(
  config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AgentConfig> {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const agent = (await res.json()) as AgentConfig;
  return parseAgent(agent);
}

export async function updateAgent(
  id: string,
  updates: Partial<AgentConfig>
): Promise<AgentConfig | null> {
  const res = await fetch(`${baseUrl}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const agent = (await res.json()) as AgentConfig;
  return parseAgent(agent);
}

export async function deleteAgent(id: string): Promise<boolean> {
  const res = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
  return res.ok;
}

