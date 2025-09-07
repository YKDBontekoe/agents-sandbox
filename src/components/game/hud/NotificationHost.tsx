"use client";

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/state/store';
import { NotificationCenter } from './NotificationCenter';
import { dismissNotification, markRead } from '@/state/slices/notifications';
import type { Notification } from './types';

export default function NotificationHost() {
  const list = useAppSelector(s => s.notifications.list);
  const dispatch = useAppDispatch();
  const handleAction = (n: Notification) => {
    dispatch(markRead(n.id));
    try { window.dispatchEvent(new CustomEvent('ad_notify_action', { detail: n })); } catch {}
  };
  return <NotificationCenter notifications={list} onDismiss={(id) => dispatch(dismissNotification(id))} onAction={handleAction} />;
}
