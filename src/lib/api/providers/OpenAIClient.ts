import OpenAI from 'openai';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import type { AudioSpeechCreateParams } from 'openai/resources/audio/speech';
import type { ModelConfig, ChatMessage } from '@/types/agent';
import { ProviderClient, MessageResponse, ProviderOptions } from '../ProviderClient';
import { withTimeout, retryWithBackoff } from '../utils';

export class OpenAIClient implements ProviderClient {
  private client: OpenAI;
  private config: ModelConfig;
  private onError?: ProviderOptions['onError'];

  constructor(config: ModelConfig, options: ProviderOptions = {}) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.onError = options.onError;
  }

  async sendMessage(
    messages: ChatMessage[],
    systemPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<MessageResponse> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const makeRequest = () =>
      withTimeout(
        this.client.chat.completions.create({
          model: this.config.model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
        }) as Promise<any>,
        this.config.timeoutMs ?? 30000
      );

    const response = await retryWithBackoff(makeRequest, {
      maxRetries: this.config.maxRetries,
      onError: this.onError,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      tokens: response.usage?.total_tokens,
    };
  }

  async *streamMessage(
    messages: ChatMessage[],
    systemPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): AsyncGenerator<string> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const makeRequest = () =>
      withTimeout(
        this.client.chat.completions.create({
          model: this.config.model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }) as AsyncIterable<ChatCompletionChunk>,
        this.config.timeoutMs ?? 30000
      );

    const stream = await retryWithBackoff(() => makeRequest(), {
      maxRetries: this.config.maxRetries,
      onError: this.onError,
    });

    for await (const part of stream) {
      const token = part.choices?.[0]?.delta?.content;
      if (token) yield token;
    }
  }

  async generateSpeech(
    text: string,
    voice: AudioSpeechCreateParams['voice'] = 'alloy'
  ): Promise<ArrayBuffer> {
    const makeRequest = () =>
      withTimeout(
        this.client.audio.speech.create({
          model: 'tts-1',
          voice,
          input: text,
        }) as Promise<{ arrayBuffer: () => Promise<ArrayBuffer> }>,
        this.config.timeoutMs ?? 30000
      );

    const res = await retryWithBackoff(makeRequest, {
      maxRetries: this.config.maxRetries,
      onError: this.onError,
    });
    return res.arrayBuffer();
  }

  async transcribeAudio(audioFile: File): Promise<string> {
    const makeRequest = () =>
      withTimeout(
        this.client.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
        }) as Promise<{ text: string }>,
        this.config.timeoutMs ?? 30000
      );

    const res = await retryWithBackoff(makeRequest, {
      maxRetries: this.config.maxRetries,
      onError: this.onError,
    });
    return res.text;
  }
}
