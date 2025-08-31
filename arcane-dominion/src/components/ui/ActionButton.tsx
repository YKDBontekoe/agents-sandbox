import React from 'react';

export interface ActionButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<ActionButtonProps['variant']>, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white hover:transform hover:scale-105 hover:shadow-lg active:scale-95',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white hover:transform hover:scale-105 hover:shadow-lg active:scale-95',
  danger: 'bg-red-600 hover:bg-red-700 text-white hover:transform hover:scale-105 hover:shadow-lg active:scale-95',
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
    className={`inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-transform duration-200 ease-out will-change-transform ${VARIANT_CLASSES[variant]} ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none' : 'cursor-pointer'} ${className}`}
  >
    {children}
  </button>
);

export default ActionButton;
