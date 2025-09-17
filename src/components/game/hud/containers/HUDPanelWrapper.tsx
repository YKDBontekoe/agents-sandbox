import type { ReactNode } from 'react';
import { useHUDPanelRegistry } from '../HUDPanelRegistry';

export interface HUDPanelWrapperProps {
  panelId: string;
  children?: ReactNode;
  className?: string;
}

export function HUDPanelWrapper({ panelId, children, className = '' }: HUDPanelWrapperProps) {
  const { getPanelById } = useHUDPanelRegistry();
  const panel = getPanelById(panelId);

  if (!panel || !panel.isVisible) {
    return null;
  }

  const { config } = panel;
  const animationClass = config.animation?.enter || 'animate-fade-in';
  const collapsedClass = panel.isCollapsed ? 'opacity-50 scale-95' : '';

  return (
    <div
      className={`${animationClass} ${collapsedClass} ${className} transition-all duration-200`}
      role={config.accessibility?.role}
      aria-label={config.accessibility?.ariaLabel}
      tabIndex={config.accessibility?.tabIndex}
      data-panel-id={panelId}
      data-panel-zone={config.zone}
    >
      {children}
    </div>
  );
}
