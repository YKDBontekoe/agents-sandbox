import { AgentType } from '@/types/agent';
import React from 'react';

export interface AgentTypePlugin {
  /** Agent type handled by this plugin */
  agentType: AgentType;
  /**
   * Provide default form configuration for this agent type.
   * Returned values will be merged into the form state when the type is selected.
   */
  getDefaultConfig?: () => Record<string, unknown>;
  /**
   * Render additional form fields for this agent type.
   * @param formData current form state
   * @param onChange callback to update form state
   */
  renderFormFields?: (
    formData: Record<string, any>,
    onChange: (field: string, value: unknown) => void,
  ) => React.ReactNode;
}

const registry = new Map<AgentType, AgentTypePlugin[]>();

export function registerAgentTypePlugin(plugin: AgentTypePlugin): void {
  const list = registry.get(plugin.agentType) ?? [];
  list.push(plugin);
  registry.set(plugin.agentType, list);
}

export function getAgentTypePlugins(type: AgentType): AgentTypePlugin[] {
  return registry.get(type) ?? [];
}
