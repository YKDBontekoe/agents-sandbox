'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stack, Inline, Container } from '@/components/ui/layout';
import { AgentConfig, AgentType, ModelProvider } from '@/types/agent';
import { getModelsByProvider } from '@/lib/utils';
import { AgentConfigFormSchema } from '@/types/agent-schema';
import { MessageCircle, Mic, Save, X } from 'lucide-react';
import { createDefaultAgentConfig } from '@/lib/agents/agent-builder';

interface AgentFormProps {
  agent?: AgentConfig;
  onSave: (agent: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function AgentForm({ agent, onSave, onCancel }: AgentFormProps) {
  const defaults = createDefaultAgentConfig();
  const [formData, setFormData] = useState({
    name: agent?.name ?? defaults.name,
    description: agent?.description ?? defaults.description,
    category: agent?.category ?? defaults.category,
    type: (agent?.type ?? defaults.type) as AgentType,
    systemPrompt: agent?.systemPrompt ?? defaults.systemPrompt,
    provider: (agent?.modelConfig.provider ?? defaults.modelConfig.provider) as ModelProvider,
    apiKey: agent?.modelConfig.apiKey ?? defaults.modelConfig.apiKey,
    model: agent?.modelConfig.model ?? defaults.modelConfig.model,
    baseUrl: agent?.modelConfig.baseUrl ?? defaults.modelConfig.baseUrl,
    apiVersion: agent?.modelConfig.apiVersion ?? defaults.modelConfig.apiVersion,
    temperature: agent?.temperature ?? defaults.temperature,
    maxTokens: agent?.maxTokens ?? defaults.maxTokens,
    voice: agent?.voiceSettings?.voice ?? defaults.voiceSettings?.voice ?? 'alloy',
    speed: agent?.voiceSettings?.speed ?? defaults.voiceSettings?.speed ?? 1.0,
    pitch: agent?.voiceSettings?.pitch ?? defaults.voiceSettings?.pitch ?? 1.0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | number
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const agentData: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category.trim(),
      type: formData.type,
      systemPrompt: formData.systemPrompt.trim(),
      modelConfig: {
        provider: formData.provider,
        apiKey: formData.apiKey.trim(),
        model: formData.model.trim(),
        baseUrl: formData.baseUrl?.trim() || undefined,
        apiVersion: formData.apiVersion?.trim() || undefined,
      },
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
      voiceSettings: formData.type === 'voice' ? {
        voice: formData.voice,
        speed: formData.speed,
        pitch: formData.pitch,
      } : undefined,
    };

    const result = AgentConfigFormSchema.safeParse(agentData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[issue.path.length - 1] as string;
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    onSave(result.data);
  };

  const availableModels = getModelsByProvider(formData.provider);

  return (
    <Container size="md">
      <Card variant="elevated" size="lg">
        <CardHeader>
          <CardTitle>
            <Inline align="center" spacing="sm">
              {formData.type === 'chat' ? (
                <MessageCircle className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
              {agent ? 'Edit Agent' : 'Create New Agent'}
            </Inline>
          </CardTitle>
          <CardDescription>
            Configure your AI agent with the desired settings and capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing="lg">
              {/* Basic Information */}
              <Stack spacing="md">
                <h3 className="text-lg font-medium text-text-primary">Basic Information</h3>
                
                <Inline spacing="md" wrap="wrap">
                  <div className="flex-1 min-w-0">
                    <Input
                      label="Agent Name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="My AI Assistant"
                      error={errors.name}
                      size="md"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-2 text-text-secondary">Agent Type</label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleInputChange('type', value as AgentType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chat">Chat Agent</SelectItem>
                        <SelectItem value="voice">Voice Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Inline>

                <Input
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="A helpful AI assistant for general tasks"
                  error={errors.description}
                  size="md"
                />

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-secondary">System Prompt</label>
                  <textarea
                    value={formData.systemPrompt}
                    onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                    placeholder="You are a helpful AI assistant..."
                    rows={3}
                    className={`w-full px-3 py-2 border bg-background-secondary text-text-primary rounded-md text-sm resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-interactive-primary focus:border-transparent ${
                      errors.systemPrompt ? 'border-status-error' : 'border-border-primary hover:border-border-secondary'
                    }`}
                  />
                  {errors.systemPrompt && (
                    <p className="text-status-error text-sm mt-1">{errors.systemPrompt}</p>
                  )}
                </div>
              </Stack>

              {/* Model Configuration */}
              <Stack spacing="md">
                <h3 className="text-lg font-medium text-text-primary">Model Configuration</h3>
                
                <Inline spacing="md" wrap="wrap">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-2 text-text-secondary">Provider</label>
                    <Select
                      value={formData.provider}
                      onValueChange={(provider: ModelProvider) => {
                        handleInputChange('provider', provider);
                        // Reset model when provider changes
                        const models = getModelsByProvider(provider);
                        if (models.length > 0) {
                          handleInputChange('model', models[0]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="azure-openai">Azure OpenAI</SelectItem>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium mb-2 text-text-secondary">Model</label>
                    <Select
                      value={formData.model}
                      onValueChange={(model) => handleInputChange('model', model)}
                    >
                      <SelectTrigger className={errors.model ? 'border-status-error' : ''}>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map(model => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.model && <p className="text-status-error text-sm mt-1">{errors.model}</p>}
                  </div>
                </Inline>

                <Input
                  label="API Key"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  placeholder="sk-..."
                  error={errors.apiKey}
                  size="md"
                />

                {formData.provider === 'azure-openai' && (
                  <Inline spacing="md" wrap="wrap">
                    <div className="flex-1 min-w-0">
                      <Input
                        label="Base URL"
                        value={formData.baseUrl || ''}
                        onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                        placeholder="https://your-resource.openai.azure.com"
                        error={errors.baseUrl}
                        size="md"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        label="API Version"
                        value={formData.apiVersion || ''}
                        onChange={(e) => handleInputChange('apiVersion', e.target.value)}
                        placeholder="2023-12-01-preview"
                        size="md"
                      />
                    </div>
                  </Inline>
                )}

                {formData.provider === 'openrouter' && (
                  <Input
                    label="Base URL (Optional)"
                    value={formData.baseUrl || ''}
                    onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                    placeholder="https://openrouter.ai/api/v1"
                    size="md"
                  />
                )}
              </Stack>

              {/* Advanced Settings */}
              <Stack spacing="md">
                <h3 className="text-lg font-medium text-text-primary">Advanced Settings</h3>
                
                <Inline spacing="md" wrap="wrap">
                  <div className="flex-1 min-w-0">
                    <Input
                      label="Temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                      size="md"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <Input
                      label="Max Tokens"
                      type="number"
                      min="1"
                      max="4000"
                      value={formData.maxTokens}
                      onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
                      size="md"
                    />
                  </div>
                </Inline>
              </Stack>

              {/* Voice Settings */}
              {formData.type === 'voice' && (
                <Stack spacing="md">
                  <h3 className="text-lg font-medium text-text-primary">Voice Settings</h3>
                  
                  <Inline spacing="md" wrap="wrap">
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium mb-2 text-text-secondary">Voice</label>
                      <Select
                        value={formData.voice}
                        onValueChange={(voice) => handleInputChange('voice', voice)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alloy">Alloy</SelectItem>
                          <SelectItem value="echo">Echo</SelectItem>
                          <SelectItem value="fable">Fable</SelectItem>
                          <SelectItem value="onyx">Onyx</SelectItem>
                          <SelectItem value="nova">Nova</SelectItem>
                          <SelectItem value="shimmer">Shimmer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Input
                        label="Speed"
                        type="number"
                        min="0.25"
                        max="4.0"
                        step="0.25"
                        value={formData.speed}
                        onChange={(e) => handleInputChange('speed', parseFloat(e.target.value))}
                        size="md"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Input
                        label="Pitch"
                        type="number"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={formData.pitch}
                        onChange={(e) => handleInputChange('pitch', parseFloat(e.target.value))}
                        size="md"
                      />
                    </div>
                  </Inline>
                </Stack>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-border-primary">
                <Button type="button" variant="outline" onClick={onCancel} leftIcon={<X className="h-4 w-4" />}>
                  Cancel
                </Button>
                <Button type="submit" leftIcon={<Save className="h-4 w-4" />}>
                  {agent ? 'Update Agent' : 'Create Agent'}
                </Button>
              </div>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}