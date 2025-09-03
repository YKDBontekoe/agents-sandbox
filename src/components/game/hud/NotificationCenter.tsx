import React from 'react';
import type { Notification } from './types';

interface Props {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationCenter({ notifications, onDismiss }: Props) {
  if (!notifications?.length) return null;

  return (
    <div aria-live="polite" aria-atomic="true" className="fixed bottom-4 right-4 z-50 space-y-2 w-80">
      {notifications.map((n) => (
        <div
          key={n.id}
          role="status"
          className={`rounded-md shadow-md p-3 text-sm border bg-white/95 backdrop-blur ${
            n.type === 'error'
              ? 'border-red-300 text-red-800'
              : n.type === 'warning'
              ? 'border-yellow-300 text-yellow-900'
              : n.type === 'success'
              ? 'border-green-300 text-green-800'
              : 'border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold leading-5">{n.title}</div>
              <div className="leading-5 opacity-90">{n.message}</div>
            </div>
            {!n.persistent && (
              <button
                aria-label="Dismiss notification"
                onClick={() => onDismiss(n.id)}
                className="rounded p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}