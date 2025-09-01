import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export interface ModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * Controls maximum width of the dialog content. Defaults to small.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional classes for the dialog content */
  className?: string;
  /** Override classes for the overlay */
  overlayClassName?: string;
}

const OVERLAY_CLASSES =
  'fixed inset-0 bg-black/50 backdrop-blur-sm z-40 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:data-[state=open]:animate-fade-in';

const CONTENT_CLASSES =
  'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-xl z-50 w-full max-h-[90vh] overflow-hidden focus:outline-none data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:data-[state=open]:animate-scale-in';

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  children,
  header,
  footer,
  size = 'sm',
  className = '',
  overlayClassName = OVERLAY_CLASSES,
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className={overlayClassName} />
      <Dialog.Content
        className={`${CONTENT_CLASSES} ${SIZE_CLASSES[size]} ${className}`}
      >
        {header}
        {children}
        {footer}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default Modal;

