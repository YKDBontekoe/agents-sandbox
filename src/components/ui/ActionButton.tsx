import React from 'react';

export interface ActionButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'accent'
    | 'success'
    | 'muted';
  disabled?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<ActionButtonProps['variant']>, string> = {
  primary: 'bg-primary hover:bg-secondary text-inverse',
  secondary: 'bg-secondary hover:bg-primary text-inverse',
  danger: 'bg-danger hover:opacity-80 text-inverse',
  accent: 'bg-accent hover:opacity-80 text-inverse',
  success: 'bg-success hover:opacity-80 text-inverse',
  muted: 'bg-panel hover:bg-border text-foreground',
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  children,
  variant = 'secondary',
  disabled = false,
  className = '',
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-transform duration-200 ease-out will-change-transform hover:transform hover:scale-105 hover:shadow-lg active:scale-95 ${VARIANT_CLASSES[variant]} ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none' : 'cursor-pointer'} ${className}`}
  >
    {children}
  </button>
);

export default ActionButton;
