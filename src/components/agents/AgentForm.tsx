'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgentConfig, AgentType, ModelProvider } from '@/types/agent';
import { validateApiKey, getModelsByProvider } from '@/lib/utils';
import { MessageCircle, Mic, Save, X } from 'lucide-react';

interface AgentFormProps {
  agent?: AgentConfig;
  onSave: (agent: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function AgentForm({ agent, onSave, onCancel }: AgentFormProps) {
  const [formData, setFormData] = useState({
    name: agent?.name || '',
    description: agent?.description || '',
    category: agent?.category || 'general',
    type: agent?.type || 'chat' as AgentType,
    systemPrompt: agent?.systemPrompt || 'You are a helpful AI assistant.',
    provider: agent?.modelConfig.provider || 'openai' as ModelProvider,
    apiKey: agent?.modelConfig.apiKey || '',
    model: agent?.modelConfig.model || 'gpt-3.5-turbo',
    baseUrl: agent?.modelConfig.baseUrl || '',
    apiVersion: agent?.modelConfig.apiVersion || '',
    temperature: agent?.temperature || 0.7,
    maxTokens: agent?.maxTokens || 1000,
    voice: agent?.voiceSettings?.voice || 'alloy',
    speed: agent?.voiceSettings?.speed || 1.0,
    pitch: agent?.voiceSettings?.pitch || 1.0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | number
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required';
    }

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    } else if (!validateApiKey(formData.provider, formData.apiKey)) {
      newErrors.apiKey = 'Invalid API key format';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }

    if (formData.provider === 'azure-openai' && !formData.baseUrl.trim()) {
      newErrors.baseUrl = 'Base URL is required for Azure OpenAI';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

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
        baseUrl: formData.baseUrl.trim() || undefined,
        apiVersion: formData.apiVersion.trim() || undefined,
      },
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
      voiceSettings: formData.type === 'voice' ? {
        voice: formData.voice,
        speed: formData.speed,
        pitch: formData.pitch,
      } : undefined,
    };

    onSave(agentData);
  };

  const availableModels = getModelsByProvider(formData.provider);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {formData.type === 'chat' ? (
            <MessageCircle className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          {agent ? 'Edit Agent' : 'Create New Agent'}
        </CardTitle>
        <CardDescription>
          Configure your AI agent with the desired settings and capabilities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Agent Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="My AI Assistant"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Agent Type</label>
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="A helpful AI assistant for general tasks"
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">System Prompt</label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                placeholder="You are a helpful AI assistant..."
                rows={3}
                className={`w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-none ${errors.systemPrompt ? 'border-red-500' : ''}`}
              />
              {errors.systemPrompt && <p className="text-red-500 text-sm mt-1">{errors.systemPrompt}</p>}
            </div>
          </div>

          {/* Model Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Model Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
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
              
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <Select
                  value={formData.model}
                  onValueChange={(model) => handleInputChange('model', model)}
                >
                  <SelectTrigger className={errors.model ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map(model => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.model && <p className="text-red-500 text-sm mt-1">{errors.model}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <Input
                type="password"
                value={formData.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder="sk-..."
                className={errors.apiKey ? 'border-red-500' : ''}
              />
              {errors.apiKey && <p className="text-red-500 text-sm mt-1">{errors.apiKey}</p>}
            </div>

            {formData.provider === 'azure-openai' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Base URL</label>
                  <Input
                    value={formData.baseUrl}
                    onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                    placeholder="https://your-resource.openai.azure.com"
                    className={errors.baseUrl ? 'border-red-500' : ''}
                  />
                  {errors.baseUrl && <p className="text-red-500 text-sm mt-1">{errors.baseUrl}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">API Version</label>
                  <Input
                    value={formData.apiVersion}
                    onChange={(e) => handleInputChange('apiVersion', e.target.value)}
                    placeholder="2023-12-01-preview"
                  />
                </div>
              </div>
            )}

            {formData.provider === 'openrouter' && (
              <div>
                <label className="block text-sm font-medium mb-2">Base URL (Optional)</label>
                <Input
                  value={formData.baseUrl}
                  onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                  placeholder="https://openrouter.ai/api/v1"
                />
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Advanced Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Temperature</label>
                <Input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Max Tokens</label>
                <Input
                  type="number"
                  min="1"
                  max="4000"
                  value={formData.maxTokens}
                  onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Voice Settings */}
          {formData.type === 'voice' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Voice Settings</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Voice</label>
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
                
                <div>
                  <label className="block text-sm font-medium mb-2">Speed</label>
                  <Input
                    type="number"
                    min="0.25"
                    max="4.0"
                    step="0.25"
                    value={formData.speed}
                    onChange={(e) => handleInputChange('speed', parseFloat(e.target.value))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Pitch</label>
                  <Input
                    type="number"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={formData.pitch}
                    onChange={(e) => handleInputChange('pitch', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              {agent ? 'Update Agent' : 'Create Agent'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}