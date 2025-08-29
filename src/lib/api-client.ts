import OpenAI from 'openai';
import { ModelConfig, ChatMessage } from '@/types/agent';

export class APIClient {
  private config: ModelConfig;
  private client: any;

  constructor(config: ModelConfig) {
    this.config = config;
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

  async sendMessage(
    messages: ChatMessage[],
    systemPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<string> {
    try {
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      switch (this.config.provider) {
        case 'openai':
        case 'openrouter':
          const response = await this.client.chat.completions.create({
            model: this.config.model,
            messages: formattedMessages,
            temperature,
            max_tokens: maxTokens,
          });
          return response.choices[0]?.message?.content || '';

        case 'azure-openai':
          const azureResponse = await this.client.chat.completions.create({
            model: this.config.model,
            messages: formattedMessages,
            temperature,
            max_tokens: maxTokens,
          });
          return azureResponse.choices[0]?.message?.content || '';

        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to send message to AI provider');
    }
  }

  async generateSpeech(text: string, voice: string = 'alloy'): Promise<ArrayBuffer> {
    if (this.config.provider !== 'openai') {
      throw new Error('Speech generation only supported with OpenAI');
    }

    try {
      const response = await this.client.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: text,
      });
      return await response.arrayBuffer();
    } catch (error) {
      console.error('Speech generation error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  async transcribeAudio(audioFile: File): Promise<string> {
    if (this.config.provider !== 'openai') {
      throw new Error('Audio transcription only supported with OpenAI');
    }

    try {
      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      });
      return response.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }
}