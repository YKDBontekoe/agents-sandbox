import type { Plugin } from '@/lib/plugin-system';
import type { AgentTypePlugin } from '@/lib/plugin/agent-type';
import { registerAgentTypePlugin } from '@/lib/plugin/agent-type';

const sample: Plugin = {
  id: 'sample',
  name: 'Sample Plugin',
  onEnable: () => {
    console.log('Sample plugin enabled');
  },
  onDisable: () => {
    console.log('Sample plugin disabled');
  },
};

const sampleAgentTypePlugin: AgentTypePlugin = {
  agentType: 'chat',
  getDefaultConfig: () => ({
    sampleField: '',
  }),
  renderFormFields: (formData, onChange) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Sample Field</label>
      <input
        className="border rounded p-2 w-full"
        value={(formData as any).sampleField ?? ''}
        onChange={(e) => onChange('sampleField', e.target.value)}
      />
    </div>
  ),
};

registerAgentTypePlugin(sampleAgentTypePlugin);

export default sample;
