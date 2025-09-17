import { HUDZone } from '../HUDLayoutSystem';
import { useHUDPanelRegistry } from '../HUDPanelRegistry';
import { HUDPanelWrapper } from './HUDPanelWrapper';

export interface HUDAutoZoneProps {
  zone: HUDZone;
  className?: string;
}

export function HUDAutoZone({ zone, className = '' }: HUDAutoZoneProps) {
  const { getPanelsForZone } = useHUDPanelRegistry();
  const panels = getPanelsForZone(zone);

  if (panels.length === 0) {
    return null;
  }

  return (
    <div className={`hud-auto-zone ${className}`} data-zone={zone}>
      {panels.map(panel => {
        const Component = panel.component;
        return (
          <HUDPanelWrapper key={panel.config.id} panelId={panel.config.id}>
            <Component {...(panel.props || {})} />
          </HUDPanelWrapper>
        );
      })}
    </div>
  );
}
