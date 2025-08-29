import OpenAI from 'openai';
import { ModelConfig, ChatMessage } from '@/types/agent';

export class APIClient {
  private config: ModelConfig;
  private client: OpenAI;

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Streaming transcription for real-time audio chunks
  async transcribeAudioStream(chunk: Blob): Promise<string> {
    const file = new File([chunk], 'chunk.wav', { type: 'audio/wav' });
    return this.transcribeAudio(file);
  }

  // Translate text to the target language using the chat endpoint
  async translateText(text: string, targetLang: string = 'en'): Promise<string> {
    return this.sendMessage(
      [{ id: 'tmp', role: 'user', content: text, timestamp: new Date(), agentId: 'tmp' }],
      `Translate the user's message to ${targetLang}`,
      0.3,
      200
    );
  }

  // Basic emotion analysis using LLM
  async analyzeEmotion(text: string): Promise<string> {
    return this.sendMessage(
      [{ id: 'tmp', role: 'user', content: text, timestamp: new Date(), agentId: 'tmp' }],
      'Identify the primary emotion expressed in the user message using one or two words.',
      0.3,
      60
    );
  }

  // Convert a file to base64 for multimodal endpoints
  private async fileToBase64(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  // Analyze an image using multimodal models
  async analyzeImage(image: File, prompt: string = 'Describe the image'): Promise<string> {
    if (this.config.provider !== 'openai') {
      throw new Error('Image analysis only supported with OpenAI');
    }

    try {
      const b64 = await this.fileToBase64(image);
      const response = await this.client.responses.create({
        model: this.config.model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_base64: b64 }
            ],
          },
        ],
      });
      return response.output_text || '';
    } catch (error) {
      console.error('Image analysis error:', error);
      throw new Error('Failed to analyze image');
    }
  }

  // Analyze a video using multimodal models
  async analyzeVideo(video: File, prompt: string = 'Describe the video'): Promise<string> {
    if (this.config.provider !== 'openai') {
      throw new Error('Video analysis only supported with OpenAI');
    }

    try {
      const b64 = await this.fileToBase64(video);
      const response = await this.client.responses.create({
        model: this.config.model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_video', video_base64: b64 }
            ],
          },
        ],
      });
      return response.output_text || '';
    } catch (error) {
      console.error('Video analysis error:', error);
      throw new Error('Failed to analyze video');
    }
  }
}