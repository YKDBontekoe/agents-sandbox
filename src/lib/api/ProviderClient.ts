import type { SpeechCreateParams } from 'openai/resources/audio/speech';
import type { ChatMessage } from '@/types/agent';

export interface MessageResponse {
  content: string;
  tokens?: number;
}

export interface ProviderClient {
  sendMessage(
    messages: ChatMessage[],
    systemPrompt: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<MessageResponse>;

  streamMessage(
    messages: ChatMessage[],
    systemPrompt: string,
    temperature?: number,
    maxTokens?: number
  ): AsyncGenerator<string>;

  generateSpeech?(
    text: string,
    voice?: SpeechCreateParams['voice']
  ): Promise<ArrayBuffer>;

  transcribeAudio?(audioFile: File): Promise<string>;
}

export interface ProviderOptions {
  onError?: (err: unknown, attempt: number) => void;
}
