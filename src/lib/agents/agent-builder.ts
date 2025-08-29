import { AgentConfig } from '@/types/agent';

export function createDefaultAgentConfig(): Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: '',
    type: 'chat',
    description: '',
    category: 'general',
    systemPrompt: 'You are a helpful AI assistant.',
    modelConfig: {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      baseUrl: '',
      apiVersion: '',
    },
    temperature: 0.7,
    maxTokens: 1000,
    voiceSettings: {
      voice: 'alloy',
      speed: 1.0,
      pitch: 1.0,
    },
  };
}

export default createDefaultAgentConfig;
