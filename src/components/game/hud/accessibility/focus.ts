import { useState, useRef, useEffect, useCallback } from 'react';
import type { HUDZone } from '../HUDLayoutSystem';
import type { HUDAccessibilityConfig } from './config';

interface FocusableElement {
  id: string;
  element: HTMLElement;
  zone: HUDZone;
  tabIndex: number;
}

export function useFocusManagement(
  config: HUDAccessibilityConfig,
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
) {
  const [focusableElements, setFocusableElements] = useState<Map<string, FocusableElement>>(new Map());
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  const registerFocusableElement = (id: string, element: HTMLElement, zone: HUDZone) => {
    setFocusableElements(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { id, element, zone, tabIndex: element.tabIndex || 0 });
      return newMap;
    });
  };

  const unregisterFocusableElement = (id: string) => {
    setFocusableElements(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const focusPanel = useCallback(
    (panelId: string) => {
      const element = focusableElements.get(panelId);
      if (element) {
        element.element.focus();
        if (config.announcements.panelChanges) {
          announceToScreenReader(`Focused on ${panelId} panel`);
        }
      }
    },
    [focusableElements, config.announcements.panelChanges, announceToScreenReader]
  );

  const focusZone = useCallback(
    (zone: HUDZone) => {
      const elementsInZone = Array.from(focusableElements.values())
        .filter(el => el.zone === zone)
        .sort((a, b) => a.tabIndex - b.tabIndex);

      if (elementsInZone.length > 0) {
        elementsInZone[0].element.focus();
        if (config.announcements.panelChanges) {
          announceToScreenReader(`Focused on ${zone} zone`);
        }
      }
    },
    [focusableElements, config.announcements.panelChanges, announceToScreenReader]
  );

  const getNextFocusableElement = (
    currentId: string,
    direction: 'next' | 'previous'
  ): HTMLElement | null => {
    const elements = Array.from(focusableElements.values()).sort(
      (a, b) => a.tabIndex - b.tabIndex
    );
    const currentIndex = elements.findIndex(el => el.id === currentId);
    if (currentIndex === -1) return null;

    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % elements.length
        : (currentIndex - 1 + elements.length) % elements.length;

    return elements[nextIndex]?.element || null;
  };

  useEffect(() => {
    if (!config.enableKeyboardNavigation) return;

    const handlePanelNavigation = (key: string) => {
      const currentFocus = document.activeElement as HTMLElement;
      const currentElement = Array.from(focusableElements.values()).find(
        el => el.element === currentFocus
      );
      if (!currentElement) return;

      const { zone } = currentElement;
      let targetZone: HUDZone | null = null;

      switch (key) {
        case 'ArrowUp':
          if (zone.includes('bottom')) targetZone = zone.replace('bottom', 'middle') as HUDZone;
          else if (zone.includes('middle')) targetZone = zone.replace('middle', 'top') as HUDZone;
          break;
        case 'ArrowDown':
          if (zone.includes('top')) targetZone = zone.replace('top', 'middle') as HUDZone;
          else if (zone.includes('middle')) targetZone = zone.replace('middle', 'bottom') as HUDZone;
          break;
        case 'ArrowLeft':
          if (zone.includes('right')) targetZone = zone.replace('right', 'center') as HUDZone;
          else if (zone.includes('center')) targetZone = zone.replace('center', 'left') as HUDZone;
          break;
        case 'ArrowRight':
          if (zone.includes('left')) targetZone = zone.replace('left', 'center') as HUDZone;
          else if (zone.includes('center')) targetZone = zone.replace('center', 'right') as HUDZone;
          break;
      }

      if (targetZone) {
        focusZone(targetZone);
      }
    };

    const handleTabNavigation = (event: KeyboardEvent) => {
      if (!config.focusManagement.trapFocus) return;

      const focusableInHUD = Array.from(focusableElements.values())
        .map(el => el.element)
        .filter(el => el.offsetParent !== null);

      if (focusableInHUD.length === 0) return;

      const firstElement = focusableInHUD[0];
      const lastElement = focusableInHUD[focusableInHUD.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, altKey } = event;

      if (altKey && key === 's' && config.focusManagement.skipToContent) {
        event.preventDefault();
        const mainContent = document.querySelector('[role="main"]') as HTMLElement;
        if (mainContent) {
          mainContent.focus();
          announceToScreenReader('Skipped to main content');
        }
        return;
      }

      if (ctrlKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        event.preventDefault();
        handlePanelNavigation(key);
        return;
      }

      if (key === 'Tab') {
        handleTabNavigation(event);
      }

      if (key === 'Escape' && config.focusManagement.trapFocus) {
        event.preventDefault();
        if (config.focusManagement.restoreFocus && lastFocusedElement.current) {
          lastFocusedElement.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config, focusableElements, announceToScreenReader, focusZone]);

  return {
    registerFocusableElement,
    unregisterFocusableElement,
    focusPanel,
    focusZone,
    getNextFocusableElement,
    lastFocusedElement,
  };
}
