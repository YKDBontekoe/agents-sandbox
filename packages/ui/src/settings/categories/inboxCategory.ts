import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import type { SettingCategory } from '../types';

export const buildInboxCategory = (): SettingCategory => ({
  id: 'inbox',
  name: 'Inbox',
  icon: faInfoCircle,
  description: 'Notifications & history',
  settings: [],
});
