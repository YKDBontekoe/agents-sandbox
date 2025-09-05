import React from 'react';
import type { Notification } from './types';

interface Props {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onAction?: (n: Notification) => void;
}

export function NotificationCenter({ notifications, onDismiss, onAction }: Props) {
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
              <div className="font-semibold leading-5 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: n.type==='error'?'#ef4444': n.type==='warning'?'#f59e0b': n.type==='success'?'#10b981':'#64748b' }} />
                <span>{n.title}</span>
              </div>
              <div className="leading-5 opacity-90">{n.message}</div>
              {n.action && (
                <button onClick={() => onAction?.(n)} className="mt-1 px-2 py-0.5 rounded border text-xs border-slate-300 bg-white hover:bg-slate-100 text-slate-700">
                  {n.action.label || 'View'}
                </button>
              )}
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
