import { promises as fs } from 'fs';
import path from 'path';
import { AgentConfig } from '@/types/agent';

const dataFile = process.env.MARKETPLACE_DATA_FILE || path.join(process.cwd(), 'data', 'marketplace.json');

async function readAgents(): Promise<AgentConfig[]> {
  try {
    const data = await fs.readFile(dataFile, 'utf8');
    const agents = JSON.parse(data) as AgentConfig[];
    return agents.map(agent => ({
      ...agent,
      createdAt: new Date(agent.createdAt),
      updatedAt: new Date(agent.updatedAt),
    }));
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function writeAgents(agents: AgentConfig[]): Promise<void> {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(
    dataFile,
    JSON.stringify(
      agents.map(agent => ({
        ...agent,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
      })),
      null,
      2,
    ),
  );
}

export const marketplaceStorage = {
  readAgents,
  writeAgents,
};
