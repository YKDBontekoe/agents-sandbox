import OpenAI from 'openai';
import type { AudioSpeechCreateParams } from 'openai/resources/audio/speech';
import { ModelConfig, ChatMessage } from '@/types/agent';
import {
  recordResponseTime,
  recordTokens,
  incrementError,
} from './analytics';

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

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    if (!timeoutMs) return promise;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      promise
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private async retryWithBackoff<T>(operation: (attempt: number) => Promise<T>) {
    const maxRetries = this.config.maxRetries ?? 3;
    const baseDelay = 500;
    let attempt = 0;
    let lastError: unknown;
    while (attempt <= maxRetries) {
      try {
        return await operation(attempt);
      } catch (err) {
        lastError = err;
        if (this.agentId) incrementError(this.agentId);
        if (attempt === maxRetries) break;
        const delay = baseDelay * 2 ** attempt;
        await this.sleep(delay);
      }
      attempt++;
    }
    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Operation failed after ${maxRetries + 1} attempts: ${message}`);
  }

  async sendMessage(
    messages: ChatMessage[],
    systemPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<string> {
    const start = Date.now();
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const makeRequest = () =>
      this.withTimeout<ChatCompletionResponse>(
        this.client.chat.completions.create({
          model: this.config.model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
        }) as Promise<ChatCompletionResponse>,
        this.config.timeoutMs ?? 30000
      );

    try {
      const response = await this.retryWithBackoff<ChatCompletionResponse>(makeRequest);
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

  async generateSpeech(
    text: string,
    voice: AudioSpeechCreateParams['voice'] = 'alloy'
  ): Promise<ArrayBuffer> {
    if (this.config.provider !== 'openai') {
      throw new Error('Speech generation only supported with OpenAI');
    }

    const start = Date.now();
    const makeRequest = () =>
      this.withTimeout<SpeechResponse>(
        this.client.audio.speech.create({
          model: 'tts-1',
          voice,
          input: text,
        }) as Promise<SpeechResponse>,
        this.config.timeoutMs ?? 30000
      );

    try {
      const response = await this.retryWithBackoff<SpeechResponse>(makeRequest);
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
      this.withTimeout<TranscriptionResponse>(
        this.client.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
        }) as Promise<TranscriptionResponse>,
        this.config.timeoutMs ?? 30000
      );

    try {
      const response = await this.retryWithBackoff<TranscriptionResponse>(makeRequest);
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
