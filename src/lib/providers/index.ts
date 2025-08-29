export interface ProviderConfig {
  models: string[];
  apiKeyPattern?: RegExp;
}

export const providerConfigs: Record<string, ProviderConfig> = {
  openai: {
    models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
    apiKeyPattern: /^sk-/,
  },
  "azure-openai": {
    models: ["gpt-4", "gpt-35-turbo"],
    apiKeyPattern: /^.{11,}$/,
  },
  openrouter: {
    models: [
      "openai/gpt-4",
      "anthropic/claude-3-opus",
      "meta-llama/llama-2-70b-chat",
    ],
    apiKeyPattern: /^sk-or-/,
  },
};

export function registerProvider(id: string, config: ProviderConfig) {
  providerConfigs[id] = config;
}
