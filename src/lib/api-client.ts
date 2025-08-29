import type { AudioSpeechCreateParams } from 'openai/resources/audio/speech';
import type { ModelConfig, ChatMessage } from '@/types/agent';
import type { ProviderClient } from './api/ProviderClient';
import { OpenAIClient } from './api/providers/OpenAIClient';
import { AzureOpenAIClient } from './api/providers/AzureOpenAIClient';
import { OpenRouterClient } from './api/providers/OpenRouterClient';
import { ProviderOptions } from './api/ProviderClient';

export interface MetricsCallbacks {
  recordResponseTime?: (agentId: string, ms: number) => void;
  recordTokens?: (agentId: string, tokens: string | number) => void;
  incrementError?: (agentId: string) => void;
}

export class APIClient {
  private provider: ProviderClient;
  private config: ModelConfig;
  private agentId?: string;
  private metrics?: MetricsCallbacks;

  constructor(config: ModelConfig, agentId?: string, metrics?: MetricsCallbacks) {
    this.config = config;
    this.agentId = agentId;
    this.metrics = metrics;
    this.provider = this.createProvider();
  }

  private createProvider(): ProviderClient {
    const onError: ProviderOptions['onError'] | undefined =
      this.agentId && this.metrics?.incrementError
        ? () => this.metrics!.incrementError!(this.agentId!)
        : undefined;
    switch (this.config.provider) {
      case 'openai':
        return new OpenAIClient(this.config, { onError });
      case 'azure-openai':
        return new AzureOpenAIClient(this.config, { onError });
      case 'openrouter':
        return new OpenRouterClient(this.config, { onError });
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  async sendMessage(
    messages: ChatMessage[],
    systemPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<string> {
    const start = Date.now();
    try {
      const response = await this.provider.sendMessage(
        messages,
        systemPrompt,
        temperature,
        maxTokens
      );
      if (this.agentId) {
        this.metrics?.recordResponseTime?.(this.agentId, Date.now() - start);
        if (response.tokens !== undefined) {
          this.metrics?.recordTokens?.(this.agentId, response.tokens);
        }
      }
      return response.content;
    } catch (error) {
      console.error('API Error:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send message to AI provider: ${message}`);
    }
  }

  async *streamMessage(
    messages: ChatMessage[],
    systemPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): AsyncGenerator<string> {
    const start = Date.now();
    try {
      let full = '';
      for await (const token of this.provider.streamMessage(
        messages,
        systemPrompt,
        temperature,
        maxTokens
      )) {
        full += token;
        yield token;
      }
      if (this.agentId) {
        this.metrics?.recordResponseTime?.(this.agentId, Date.now() - start);
        this.metrics?.recordTokens?.(this.agentId, full);
      }
    } catch (error) {
      console.error('Streaming API error:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to stream message from AI provider: ${message}`);
    }
  }

  async generateSpeech(
    text: string,
    voice: AudioSpeechCreateParams['voice'] = 'alloy'
  ): Promise<ArrayBuffer> {
    if (!this.provider.generateSpeech) {
      throw new Error('Speech generation not supported by this provider');
    }
    const start = Date.now();
    try {
      const buffer = await this.provider.generateSpeech(text, voice);
      if (this.agentId) {
        this.metrics?.recordResponseTime?.(this.agentId, Date.now() - start);
      }
      return buffer;
    } catch (error) {
      console.error('Speech generation error:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate speech: ${message}`);
    }
  }

  async transcribeAudio(audioFile: File): Promise<string> {
    if (!this.provider.transcribeAudio) {
      throw new Error('Audio transcription not supported by this provider');
    }
    const start = Date.now();
    try {
      const text = await this.provider.transcribeAudio(audioFile);
      if (this.agentId) {
        this.metrics?.recordResponseTime?.(this.agentId, Date.now() - start);
      }
      return text;
    } catch (error) {
      console.error('Transcription error:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to transcribe audio: ${message}`);
    }
  }
}
