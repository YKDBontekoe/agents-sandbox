'use client';

import { useState } from 'react';
import type { Plugin } from '@/lib/plugin-system';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PluginSettingsProps {
  plugin: Plugin;
  action: (formData: FormData) => void | Promise<void>;
}

export default function PluginSettings({ plugin, action }: PluginSettingsProps) {
  const [options, setOptions] = useState(
    JSON.stringify(plugin.options ?? {}, null, 2),
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="rounded border px-2 py-1 text-sm">Settings</button>
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{plugin.name} Settings</DialogTitle>
          </DialogHeader>
          <input type="hidden" name="id" value={plugin.id} />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={plugin.enabled}
              className="h-4 w-4"
            />
            <span>Enabled</span>
          </label>
          <div>
            <label className="mb-1 block text-sm font-medium">Options (JSON)</label>
            <textarea
              name="options"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              className="h-40 w-full rounded border p-2 font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <button
              type="submit"
              className="rounded border px-4 py-1 text-sm"
            >
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

