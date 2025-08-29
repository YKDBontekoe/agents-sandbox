import OpenAI from 'openai';
import type { SpeechCreateParams } from 'openai/resources/audio/speech';
import type { ChatCompletionChunk, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { ModelConfig, ChatMessage } from '@/types/agent';
import {
  recordResponseTime,
  recordTokens,
  incrementError,
} from './analytics';
import { retryWithBackoff, withTimeout } from './api/utils';

interface ChatCompletionResponse {
  choices: { message?: { content?: string } }[];
  usage?: { total_tokens?: number };
}

interface SpeechResponse {
  arrayBuffer: () => Promise<ArrayBuffer>;
}

interface TranscriptionResponse {
  text: string;
}

export class APIClient {
  private config: ModelConfig;
  private client!: OpenAI;
  private agentId?: string;

  constructor(config: ModelConfig, agentId?: string) {
    this.config = config;
    this.agentId = agentId;
    this.initializeClient();
  }

  private initializeClient() {
    switch (this.config.provider) {
      case 'openai':
        this.client = new OpenAI({
          apiKey: this.config.apiKey,
          dangerouslyAllowBrowser: true,
        });
        break;
      case 'azure-openai':
        // Azure OpenAI using OpenAI-compatible interface
        this.client = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseUrl,
          defaultQuery: { 'api-version': this.config.apiVersion || '2023-12-01-preview' },
          dangerouslyAllowBrowser: true,
        });
        break;
      case 'openrouter':
        this.client = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseUrl || 'https://openrouter.ai/api/v1',
          dangerouslyAllowBrowser: true,
        });
        break;
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  // request helpers handled in ./api/utils

  async sendMessage(
    messages: ChatMessage[],
    systemPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<string> {
    const start = Date.now();
    const formattedMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    const makeRequest = () =>
      withTimeout<ChatCompletionResponse>(
        this.client.chat.completions.create({
          model: this.config.model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
        }) as Promise<ChatCompletionResponse>,
        this.config.timeoutMs ?? 30000
      );

    try {
      const response = await retryWithBackoff<ChatCompletionResponse>(makeRequest, {
        maxRetries: this.config.maxRetries,
        onError: () => {
          if (this.agentId) incrementError(this.agentId);
        },
      });
      if (this.agentId) {
        recordResponseTime(this.agentId, Date.now() - start);
        const tokens = response.usage?.total_tokens;
        if (tokens) recordTokens(this.agentId, tokens);
      }
      return response.choices[0]?.message?.content || '';
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
    if (!['openai', 'openrouter'].includes(this.config.provider)) {
      yield await this.sendMessage(messages, systemPrompt, temperature, maxTokens);
      return;
    }

    const start = Date.now();
    const formattedMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    ];

    const makeRequest = async () => {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: formattedMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });
      return withTimeout<AsyncIterable<ChatCompletionChunk>>(
        Promise.resolve(response as unknown as AsyncIterable<ChatCompletionChunk>),
        this.config.timeoutMs ?? 30000
      );
    };

    try {
      const stream = await retryWithBackoff<AsyncIterable<ChatCompletionChunk>>(makeRequest, {
        maxRetries: this.config.maxRetries,
        onError: () => {
          if (this.agentId) incrementError(this.agentId);
        },
      });
      let full = '';
      for await (const part of stream) {
        const token = part.choices?.[0]?.delta?.content;
        if (token) {
          full += token;
          yield token;
        }
      }
      if (this.agentId) {
        recordResponseTime(this.agentId, Date.now() - start);
        recordTokens(this.agentId, full);
      }
    } catch (error) {
      console.error('Streaming API error:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to stream message from AI provider: ${message}`);
    }
  }

  async generateSpeech(
    text: string,
    voice: SpeechCreateParams['voice'] = 'alloy'
  ): Promise<ArrayBuffer> {
    if (this.config.provider !== 'openai') {
      throw new Error('Speech generation only supported with OpenAI');
    }

    const start = Date.now();
    const makeRequest = () =>
      withTimeout<SpeechResponse>(
        this.client.audio.speech.create({
          model: 'tts-1',
          voice,
          input: text,
        }) as Promise<SpeechResponse>,
        this.config.timeoutMs ?? 30000
      );

    try {
      const response = await retryWithBackoff<SpeechResponse>(makeRequest, {
        maxRetries: this.config.maxRetries,
        onError: () => {
          if (this.agentId) incrementError(this.agentId);
        },
      });
      if (this.agentId) {
        recordResponseTime(this.agentId, Date.now() - start);
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.error('Speech generation error:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate speech: ${message}`);
    }
  }

  async transcribeAudio(audioFile: File): Promise<string> {
    if (this.config.provider !== 'openai') {
      throw new Error('Audio transcription only supported with OpenAI');
    }

    const start = Date.now();
    const makeRequest = () =>
      withTimeout<TranscriptionResponse>(
        this.client.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
        }) as Promise<TranscriptionResponse>,
        this.config.timeoutMs ?? 30000
      );

    try {
      const response = await retryWithBackoff<TranscriptionResponse>(makeRequest, {
        maxRetries: this.config.maxRetries,
        onError: () => {
          if (this.agentId) incrementError(this.agentId);
        },
      });
      if (this.agentId) {
        recordResponseTime(this.agentId, Date.now() - start);
      }
      return response.text;
    } catch (error) {
      console.error('Transcription error:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to transcribe audio: ${message}`);
    }
  }
}