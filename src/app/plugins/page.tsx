import { loadPlugins, getPlugins, enablePlugin, disablePlugin } from '@/lib/plugin-system';
import { revalidatePath } from 'next/cache';

async function togglePlugin(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const enabled = formData.get('enabled') === 'true';
  if (enabled) {
    await disablePlugin(id);
  } else {
    await enablePlugin(id);
  }
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
          <li key={plugin.id} className="flex items-center justify-between py-2">
            <span>{plugin.name}</span>
            <form action={togglePlugin}>
              <input type="hidden" name="id" value={plugin.id} />
              <input type="hidden" name="enabled" value={plugin.enabled ? 'true' : 'false'} />
              <button
                type="submit"
                className="rounded border px-2 py-1 text-sm"
              >
                {plugin.enabled ? 'Disable' : 'Enable'}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
