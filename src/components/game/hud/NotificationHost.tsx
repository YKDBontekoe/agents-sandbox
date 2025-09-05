"use client";

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/state/store';
import { NotificationCenter } from './NotificationCenter';
import { dismissNotification, markRead } from '@/state/notifications';

export default function NotificationHost() {
  const list = useAppSelector(s => s.notifications.list);
  const dispatch = useAppDispatch();
  const handleAction = (n: any) => {
    dispatch(markRead(n.id));
    try { window.dispatchEvent(new CustomEvent('ad_notify_action', { detail: n })); } catch {}
  };
  return <NotificationCenter notifications={list} onDismiss={(id) => dispatch(dismissNotification(id))} onAction={handleAction} />;
}
