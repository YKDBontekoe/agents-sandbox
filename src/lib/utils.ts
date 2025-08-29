import { type ClassValue, clsx } from "clsx";
import { encodingForModel } from "js-tiktoken";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function validateApiKey(provider: string, apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) return false;
  
  switch (provider) {
    case 'openai':
      return apiKey.startsWith('sk-');
    case 'azure-openai':
      return apiKey.length > 10; // Basic validation
    case 'openrouter':
      return apiKey.startsWith('sk-or-');
    default:
      return false;
  }
}

export function getModelsByProvider(provider: string): string[] {
  switch (provider) {
    case 'openai':
      return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    case 'azure-openai':
      return ['gpt-4', 'gpt-35-turbo'];
    case 'openrouter':
      return ['openai/gpt-4', 'anthropic/claude-3-opus', 'meta-llama/llama-2-70b-chat'];
    default:
      return [];
  }
}

const encoders: Record<string, ReturnType<typeof encodingForModel>> = {};

export function countTokens(text: string, model = 'gpt-3.5-turbo'): number {
  let encoder = encoders[model];
  if (!encoder) {
    encoder = encodingForModel(model);
    encoders[model] = encoder;
  }
  return encoder.encode(text).length;
}
