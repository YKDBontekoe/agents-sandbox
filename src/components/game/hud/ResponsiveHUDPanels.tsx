import { forwardRef } from 'react';
import {
  ResponsivePanel as ResponsivePanelPrimitive,
  type ResponsivePanelProps as ResponsivePanelPrimitiveProps,
  ResponsiveGrid as ResponsiveGridPrimitive,
  type ResponsiveGridProps as ResponsiveGridPrimitiveProps,
  ResponsiveStack as ResponsiveStackPrimitive,
  type ResponsiveStackProps as ResponsiveStackPrimitiveProps,
  ResponsiveText as ResponsiveTextPrimitive,
  type ResponsiveTextProps as ResponsiveTextPrimitiveProps,
  ResponsiveButton as ResponsiveButtonPrimitive,
  type ResponsiveButtonProps as ResponsiveButtonPrimitiveProps,
  ResponsiveIcon as ResponsiveIconPrimitive,
  type ResponsiveIconProps as ResponsiveIconPrimitiveProps
} from '@arcane/ui/responsive';
import { useHUDLayout } from './HUDLayoutSystem';

type WithoutScreenSize<P extends { screenSize: unknown }> = Omit<P, 'screenSize'>;

export const ResponsivePanel = forwardRef<HTMLDivElement, WithoutScreenSize<ResponsivePanelPrimitiveProps>>((props, ref) => {
  const { screenSize } = useHUDLayout();
  return <ResponsivePanelPrimitive ref={ref} screenSize={screenSize} {...props} />;
});

ResponsivePanel.displayName = 'ResponsivePanel';

export function ResponsiveGrid(props: WithoutScreenSize<ResponsiveGridPrimitiveProps>) {
  const { screenSize } = useHUDLayout();
  return <ResponsiveGridPrimitive screenSize={screenSize} {...props} />;
}

export function ResponsiveStack(props: WithoutScreenSize<ResponsiveStackPrimitiveProps>) {
  const { screenSize } = useHUDLayout();
  return <ResponsiveStackPrimitive screenSize={screenSize} {...props} />;
}

export function ResponsiveText(props: WithoutScreenSize<ResponsiveTextPrimitiveProps>) {
  const { screenSize } = useHUDLayout();
  return <ResponsiveTextPrimitive screenSize={screenSize} {...props} />;
}

export function ResponsiveButton(props: WithoutScreenSize<ResponsiveButtonPrimitiveProps>) {
  const { screenSize } = useHUDLayout();
  return <ResponsiveButtonPrimitive screenSize={screenSize} {...props} />;
}

export function ResponsiveIcon(props: WithoutScreenSize<ResponsiveIconPrimitiveProps>) {
  const { screenSize } = useHUDLayout();
  return <ResponsiveIconPrimitive screenSize={screenSize} {...props} />;
}

export {
  ResponsivePanelPrimitive,
  ResponsiveGridPrimitive,
  ResponsiveStackPrimitive,
  ResponsiveTextPrimitive,
  ResponsiveButtonPrimitive,
  ResponsiveIconPrimitive
};

export type {
  ResponsivePanelPrimitiveProps as ResponsivePanelProps,
  ResponsiveGridPrimitiveProps as ResponsiveGridProps,
  ResponsiveStackPrimitiveProps as ResponsiveStackProps,
  ResponsiveTextPrimitiveProps as ResponsiveTextProps,
  ResponsiveButtonPrimitiveProps as ResponsiveButtonProps,
  ResponsiveIconPrimitiveProps as ResponsiveIconProps
};
