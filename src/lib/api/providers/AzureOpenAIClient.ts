import OpenAI from 'openai';
import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ModelConfig, ChatMessage } from '@/types/agent';
import { ProviderClient, MessageResponse, ProviderOptions } from '../ProviderClient';
import { withTimeout, retryWithBackoff } from '../utils';

export class AzureOpenAIClient implements ProviderClient {
  private client: OpenAI;
  private config: ModelConfig;
  private onError?: ProviderOptions['onError'];

  constructor(config: ModelConfig, options: ProviderOptions = {}) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      defaultQuery: { 'api-version': config.apiVersion || '2023-12-01-preview' },
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
    const formattedMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const makeRequest = () =>
      withTimeout(
        this.client.chat.completions.create({
          model: this.config.model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
        }),
        this.config.timeoutMs ?? 30000
      );

    const response = await retryWithBackoff(makeRequest, {
      maxRetries: this.config.maxRetries,
      onError: this.onError,
    });

    const chatResponse = response as ChatCompletion;
    return {
      content: chatResponse.choices[0]?.message?.content || '',
      tokens: chatResponse.usage?.total_tokens,
    };
  }

  async *streamMessage(
    messages: ChatMessage[],
    systemPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): AsyncGenerator<string> {
    // Azure OpenAI doesn't support streaming in this simplified client,
    // so fall back to non-streaming response.
    const response = await this.sendMessage(
      messages,
      systemPrompt,
      temperature,
      maxTokens
    );
    yield response.content;
  }
}
