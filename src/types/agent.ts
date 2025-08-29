export type AgentType = 'chat' | 'voice';

export type ModelProvider = 'openai' | 'azure-openai' | 'openrouter';

export interface ModelConfig {
  provider: ModelProvider;
  apiKey: string;
  model: string;
  baseUrl?: string; // For Azure OpenAI and OpenRouter
  apiVersion?: string; // For Azure OpenAI
}

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  systemPrompt: string;
  modelConfig: ModelConfig;
  temperature: number;
  maxTokens: number;
  voiceSettings?: {
    voice: string;
    speed: number;
    pitch: number;
  };
  version?: string;
  visibility?: 'public' | 'private';
  screenshots?: string[];
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentId: string;
}

export interface VoiceMessage extends ChatMessage {
  audioUrl?: string;
  duration?: number;
}

export interface AgentSession {
  id: string;
  agentId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DragItem {
  id: string;
  type: string;
  agentType: AgentType;
  name: string;
}