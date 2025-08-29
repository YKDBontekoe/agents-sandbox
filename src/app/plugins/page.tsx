import {
  loadPlugins,
  getPlugins,
  enablePlugin,
  disablePlugin,
  updatePluginOptions,
} from '@/lib/plugin-system';
import { revalidatePath } from 'next/cache';
import PluginSettings from './plugin-settings';

async function updatePlugin(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const enabled = formData.get('enabled') === 'on';
  const optionsRaw = formData.get('options') as string;
  let options: Record<string, unknown> = {};
  try {
    options = optionsRaw ? JSON.parse(optionsRaw) : {};
  } catch {
    // ignore invalid JSON
  }
  if (enabled) {
    await enablePlugin(id);
  } else {
    await disablePlugin(id);
  }
  await updatePluginOptions(id, options);
  revalidatePath('/plugins');
}

export default async function PluginsPage() {
  await loadPlugins();
  const plugins = getPlugins();

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Installed Plugins</h1>
      <ul>
        {plugins.map((plugin) => (
          <li key={plugin.id} className="py-2">
            <div className="flex items-center justify-between">
              <span>
                {plugin.name}{' '}
                <span className="text-xs text-muted-foreground">
                  ({plugin.enabled ? 'enabled' : 'disabled'})
                </span>
              </span>
              <PluginSettings plugin={plugin} action={updatePlugin} />
            </div>
          {plugin.error && (
            <div className="text-xs text-red-600">{plugin.error}</div>
          )}
          {plugin.permissions?.length ? (
            <div className="text-xs text-yellow-600">
              Requires permissions: {plugin.permissions.join(', ')}
            </div>
          ) : null}
          {plugin.warning && (
            <div className="text-xs text-yellow-600">{plugin.warning}</div>
          )}
        </li>
      ))}
    </ul>
    </div>
  );
}
