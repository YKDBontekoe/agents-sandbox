import { useRef } from 'react';
import type { HUDAccessibilityConfig } from './config';

export function useScreenReaderAnnouncer(config: HUDAccessibilityConfig) {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announceToScreenReader = (
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    if (!config.enableScreenReader || !announcementRef.current) return;

    const announcement = announcementRef.current;
    announcement.setAttribute('aria-live', priority);
    announcement.textContent = message;

    setTimeout(() => {
      if (announcement.textContent === message) {
        announcement.textContent = '';
      }
    }, 1000);
  };

  return { announcementRef, announceToScreenReader };
}
