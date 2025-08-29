import { type ClassValue, clsx } from "clsx";
import { encodingForModel, type TiktokenModel } from "js-tiktoken";
import { twMerge } from "tailwind-merge";
import { providerConfigs } from "./providers";

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
  const config = providerConfigs[provider];
  if (!config) return false;
  const { apiKeyPattern } = config;
  return apiKeyPattern ? apiKeyPattern.test(apiKey) : true;
}

export function getModelsByProvider(provider: string): string[] {
  return providerConfigs[provider]?.models ?? [];
}

const encoders: Record<string, ReturnType<typeof encodingForModel>> = {};

export function countTokens(text: string, model = 'gpt-3.5-turbo'): number {
  let encoder = encoders[model];
  if (!encoder) {
    encoder = encodingForModel(model as TiktokenModel);
    encoders[model] = encoder;
  }
  return encoder.encode(text).length;
}