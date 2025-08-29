import { Plugin } from '@/lib/plugin-system';

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

export default sample;
